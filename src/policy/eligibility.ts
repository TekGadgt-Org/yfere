import { candidateSchema, detached, exclusion, policySchema, publicId, type Exclusion, type EligibilityResult, type PolicyInput, type ProposedCandidate } from './contracts.js';

const compare = (a:string,b:string) => a < b ? -1 : a > b ? 1 : 0;
const order = (items:Exclusion[]) => items.sort((a,b) => [a.candidateId,a.code,a.personaId ?? '',a.modelId ?? '',a.skillId ?? '',a.artifactId ?? ''].map((v,i) => compare(v, [b.candidateId,b.code,b.personaId ?? '',b.modelId ?? '',b.skillId ?? '',b.artifactId ?? ''][i]!)).find(x => x !== 0) ?? 0);
export function evaluateEligibility(input:PolicyInput): EligibilityResult {
  const policy = policySchema.parse(structuredClone(input.policy));
  const catalog = input.catalog;
  const personas = new Map(catalog.personas.map(x => [x.id,x]));
  const models = new Map(catalog.models.map(x => [x.id,x]));
  const skills = new Map(catalog.skills.map(x => [x.id,x]));
  const exclusions: Exclusion[] = []; const eligible: ProposedCandidate[] = [];
  for (const raw of input.candidates) {
    const candidate = candidateSchema.parse(structuredClone(raw));
    const persona = personas.get(candidate.personaId); const model = models.get(candidate.modelId);
    if (!persona) { exclusions.push(exclusion('UNKNOWN_PERSONA', candidate)); continue; }
    if (!model) { exclusions.push(exclusion('UNKNOWN_MODEL', candidate)); continue; }
    if (persona.modelOverride && candidate.modelId !== persona.modelOverride) exclusions.push(exclusion('MODEL_FEATURE_INCOMPATIBLE', candidate));
    const allowedSkills = new Set(persona.eligibleSkillIds);
    if (persona.skillsOverride && persona.skillsOverride !== 'auto') {
      const exact = new Set(persona.skillsOverride);
      for (const skillId of candidate.skillIds) if (!exact.has(skillId)) exclusions.push(exclusion('OPTIONAL_SKILL_AUTHORITY_ESCALATION', candidate, { skillId }));
      for (const skillId of persona.skillsOverride) if (!candidate.skillIds.includes(skillId)) exclusions.push(exclusion('REQUIRED_SKILL_MISSING', candidate, { skillId }));
    }
    if (model.availability === 'unavailable') exclusions.push(exclusion('ENDPOINT_UNAVAILABLE', candidate));
    else if (model.availability === 'unknown') exclusions.push(exclusion('ENDPOINT_STATE_UNKNOWN', candidate));
    if (model.authorization === 'unauthorized') exclusions.push(exclusion('ENDPOINT_UNAUTHORIZED', candidate));
    else if (model.authorization === 'unknown') exclusions.push(exclusion('ENDPOINT_STATE_UNKNOWN', candidate));
    const authorizedCapabilities = new Set([...policy.allowedCapabilities, ...persona.requiredCapabilities]);
    for (const cap of candidate.capabilities) if (!authorizedCapabilities.has(cap)) exclusions.push(exclusion('PERSONA_CAPABILITY_MISSING', candidate));
    for (const cap of persona.requiredCapabilities) if (!candidate.capabilities.includes(cap)) exclusions.push(exclusion('PERSONA_CAPABILITY_MISSING', candidate));
    for (const cap of policy.requiredCapabilities) if (!candidate.capabilities.includes(cap) || !policy.allowedCapabilities.includes(cap)) exclusions.push(exclusion('PERSONA_CAPABILITY_MISSING', candidate));
    const authorizedTools = new Set([...policy.allowedTools, ...model.tools]);
    for (const tool of candidate.tools) if (!authorizedTools.has(tool)) exclusions.push(exclusion('MISSING_REQUIRED_TOOL', candidate));
    for (const tool of policy.requiredTools) {
      if (!model.tools.includes(tool)) exclusions.push(exclusion('MODEL_TOOL_INCOMPATIBLE', candidate));
      else if (!candidate.tools.includes(tool)) exclusions.push(exclusion('MISSING_REQUIRED_TOOL', candidate));
      if (!policy.allowedTools.includes(tool)) exclusions.push(exclusion('MISSING_REQUIRED_TOOL', candidate));
    }
    for (const feature of policy.requiredFeatures) if (!model.features.includes(feature)) exclusions.push(exclusion('MODEL_FEATURE_INCOMPATIBLE', candidate));
    if (candidate.contextUse > policy.contextLimit || candidate.contextUse > model.contextLimit) exclusions.push(exclusion('CONTEXT_LIMIT_EXCEEDED', candidate));
    if (candidate.workspaceMode !== policy.workspaceMode || (candidate.workspaceMode === 'isolated' && persona.workspacePolicy !== 'isolated')) exclusions.push(exclusion('WORKSPACE_POLICY_DENIED', candidate));
    if (!policy.allowedSideEffects.includes(candidate.sideEffect)) exclusions.push(exclusion('SIDE_EFFECT_POLICY_DENIED', candidate));
    for (const skillId of persona.requiredSkillIds) if (!candidate.skillIds.includes(skillId)) exclusions.push(exclusion('REQUIRED_SKILL_MISSING', candidate, { skillId }));
    for (const skillId of candidate.skillIds) {
      const skill = skills.get(skillId);
      if (!skill) { exclusions.push(exclusion('UNKNOWN_SKILL', candidate, { skillId })); continue; }
      if (!allowedSkills.has(skillId)) { exclusions.push(exclusion('OPTIONAL_SKILL_AUTHORITY_ESCALATION', candidate, { skillId })); continue; }
      if (skill.trust !== 'reviewed') exclusions.push(exclusion('SKILL_UNTRUSTED', candidate, { skillId }));
      for (const prerequisite of skill.prerequisites) if (!candidate.skillIds.includes(prerequisite)) exclusions.push(exclusion('SKILL_PREREQUISITE_MISSING', candidate, { skillId: prerequisite }));
      for (const cap of skill.requiredCapabilities) if (!candidate.capabilities.includes(cap)) exclusions.push(exclusion('SKILL_CAPABILITY_UNSATISFIED', candidate, { skillId }));
      for (const tool of skill.requiredTools) if (!candidate.tools.includes(tool) || !model.tools.includes(tool)) exclusions.push(exclusion('SKILL_TOOL_UNSATISFIED', candidate, { skillId }));
      if (skill.sideEffectClass !== 'none' && !policy.allowedSideEffects.includes(skill.sideEffectClass)) exclusions.push(exclusion('SIDE_EFFECT_POLICY_DENIED', candidate, { skillId }));
      for (const conflict of skill.conflicts) if (candidate.skillIds.includes(conflict)) exclusions.push(exclusion('SKILL_CONFLICT', candidate, { skillId }));
    }
    if (candidate.reservation === 'unknown' && policy.budget.requireKnownCost) exclusions.push(exclusion('BUDGET_UNKNOWN', candidate));
    if (!exclusions.some(x => x.candidateId === candidate.candidateId)) eligible.push(candidate);
  }
  for (const mandatory of policy.mandatoryPersonaIds) if (!eligible.some(x => x.personaId === mandatory)) exclusions.push({ code:'MANDATORY_PERSONA_INELIGIBLE', candidateId: publicId(mandatory), personaId: publicId(mandatory) });
  const distinct = new Set(eligible.map(x => x.personaId));
  if (distinct.size !== eligible.length) exclusions.push({ code:'INSUFFICIENT_ELIGIBLE_PERSONAS', candidateId:'roster' });
  if (exclusions.some(x => x.code === 'MANDATORY_PERSONA_INELIGIBLE')) return detached({ kind:'abstained', code:'MANDATORY_PERSONA_INELIGIBLE', eligible:[], exclusions:order(exclusions) });
  order(exclusions); eligible.sort((a,b) => compare(a.candidateId,b.candidateId));
  if (!eligible.length) return detached({ kind:'abstained', code:'NO_MATCH', eligible:[], exclusions: exclusions.length ? exclusions : [{ code:'NO_MATCH', candidateId:'none' }] });
  if (policy.admissionPolicy === 'exact' && distinct.size < policy.maxAgents) return detached({ kind:'abstained', code:'INSUFFICIENT_ELIGIBLE_PERSONAS', eligible:[], exclusions: [...exclusions, { code:'INSUFFICIENT_ELIGIBLE_PERSONAS', candidateId:'roster' }] });
  return detached({ kind:'accepted', eligible, exclusions });
}
