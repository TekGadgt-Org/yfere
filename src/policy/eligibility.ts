import { candidateSchema, detached, exclusion, policySchema, publicId, type Exclusion, type EligibilityResult, type PolicyInput, type ProposedCandidate } from './contracts.js';

const compare = (a:string,b:string) => a < b ? -1 : a > b ? 1 : 0;
const sortExclusions = (items:Exclusion[]) => items.sort((a,b) => {
  const left = [a.candidateId,a.code,a.personaId ?? '',a.modelId ?? '',a.skillId ?? '',a.artifactId ?? ''];
  const right = [b.candidateId,b.code,b.personaId ?? '',b.modelId ?? '',b.skillId ?? '',b.artifactId ?? ''];
  for (let i = 0; i < left.length; i++) if (left[i] !== right[i]) return compare(left[i]!, right[i]!);
  return 0;
});
function sanitizeCandidate(candidate: ProposedCandidate): ProposedCandidate {
  return { ...candidate, candidateId:'[REDACTED]', personaId:'[REDACTED]', modelId:'[REDACTED]', skillIds:candidate.skillIds.map(() => '[REDACTED]'), capabilities:candidate.capabilities.map(() => '[REDACTED]'), tools:candidate.tools.map(() => '[REDACTED]'), artifacts:candidate.artifacts.map(a => ({ ...a, artifactId:'[REDACTED]' })), reviews:candidate.reviews.map(r => ({ ...r, artifactId:'[REDACTED]', producerPersonaId:'[REDACTED]', reviewerPersonaId:'[REDACTED]' })) };
}
export function sanitizeEligibilityResult(result: EligibilityResult): EligibilityResult {
  return detached({ ...result, eligible: result.eligible.map(sanitizeCandidate), exclusions: result.exclusions.map(x => ({ ...x, candidateId: '[REDACTED]', personaId: x.personaId ? '[REDACTED]' : undefined, modelId: x.modelId ? '[REDACTED]' : undefined, skillId: x.skillId ? '[REDACTED]' : undefined, artifactId: x.artifactId ? '[REDACTED]' : undefined })) }) as EligibilityResult;
}
export function evaluateEligibilityInternal(input:PolicyInput): EligibilityResult {
  const policy = policySchema.parse(structuredClone(input.policy));
  const catalog = input.catalog;
  const personas = new Map(catalog.personas.map(x => [x.id,x]));
  const models = new Map(catalog.models.map(x => [x.id,x]));
  const skills = new Map(catalog.skills.map(x => [x.id,x]));
  const exclusions: Exclusion[] = []; const eligible: ProposedCandidate[] = [];
  const parsedCandidates = input.candidates.map(raw => candidateSchema.parse(structuredClone(raw)));
  const personaCounts = new Map<string, number>();
  for (const candidate of parsedCandidates) personaCounts.set(candidate.personaId, (personaCounts.get(candidate.personaId) ?? 0) + 1);
  const duplicatePersona = [...personaCounts.values()].some(count => count > 1);
  for (const candidate of parsedCandidates) {
    const persona = personas.get(candidate.personaId); const model = models.get(candidate.modelId); let failed = false;
    const reject = (code: Exclusion['code'], extra: Partial<Exclusion> = {}) => { failed = true; exclusions.push(exclusion(code, candidate, extra)); };
    if (!persona) { reject('UNKNOWN_PERSONA'); continue; }
    if (!model) { reject('UNKNOWN_MODEL'); continue; }
    if (persona.modelOverride && candidate.modelId !== persona.modelOverride) reject('MODEL_FEATURE_INCOMPATIBLE');
    const allowedSkills = new Set(persona.eligibleSkillIds);
    if (persona.skillsOverride && persona.skillsOverride !== 'auto') {
      const exact = new Set(persona.skillsOverride);
      for (const skillId of candidate.skillIds) if (!exact.has(skillId)) reject('OPTIONAL_SKILL_AUTHORITY_ESCALATION', { skillId });
      for (const skillId of persona.skillsOverride) if (!candidate.skillIds.includes(skillId)) reject('REQUIRED_SKILL_MISSING', { skillId });
    }
    if (model.availability === 'unavailable') reject('ENDPOINT_UNAVAILABLE'); else if (model.availability === 'unknown') reject('ENDPOINT_STATE_UNKNOWN');
    if (model.authorization === 'unauthorized') reject('ENDPOINT_UNAUTHORIZED'); else if (model.authorization === 'unknown') reject('ENDPOINT_STATE_UNKNOWN');
    const recognizedCapabilities = new Set([...persona.requiredCapabilities, ...policy.requiredCapabilities]);
    for (const skillId of candidate.skillIds) { const skill = skills.get(skillId); if (skill) for (const cap of skill.requiredCapabilities) recognizedCapabilities.add(cap); }
    const effectiveCapabilities = new Set([...recognizedCapabilities].filter(cap => policy.allowedCapabilities.includes(cap)));
    for (const cap of candidate.capabilities) if (!effectiveCapabilities.has(cap)) reject('PERSONA_CAPABILITY_MISSING');
    for (const cap of persona.requiredCapabilities) if (!candidate.capabilities.includes(cap) || !policy.allowedCapabilities.includes(cap)) reject('PERSONA_CAPABILITY_MISSING');
    for (const cap of policy.requiredCapabilities) if (!candidate.capabilities.includes(cap) || !policy.allowedCapabilities.includes(cap)) reject('PERSONA_CAPABILITY_MISSING');
    const recognizedTools = new Set([...policy.requiredTools]);
    for (const skillId of candidate.skillIds) { const skill = skills.get(skillId); if (skill) for (const tool of skill.requiredTools) recognizedTools.add(tool); }
    const effectiveTools = new Set([...recognizedTools].filter(tool => policy.allowedTools.includes(tool) && model.tools.includes(tool)));
    for (const tool of candidate.tools) if (!effectiveTools.has(tool)) reject('MISSING_REQUIRED_TOOL');
    for (const tool of policy.requiredTools) { if (!model.tools.includes(tool)) reject('MODEL_TOOL_INCOMPATIBLE'); if (!candidate.tools.includes(tool) || !policy.allowedTools.includes(tool)) reject('MISSING_REQUIRED_TOOL'); }
    for (const feature of policy.requiredFeatures) if (!model.features.includes(feature)) reject('MODEL_FEATURE_INCOMPATIBLE');
    if (candidate.contextUse > policy.contextLimit || candidate.contextUse > model.contextLimit) reject('CONTEXT_LIMIT_EXCEEDED');
    if (candidate.workspaceMode !== policy.workspaceMode || (candidate.workspaceMode === 'isolated' && persona.workspacePolicy !== 'isolated')) reject('WORKSPACE_POLICY_DENIED');
    if (!policy.allowedSideEffects.includes(candidate.sideEffect)) reject('SIDE_EFFECT_POLICY_DENIED');
    for (const skillId of persona.requiredSkillIds) if (!candidate.skillIds.includes(skillId)) reject('REQUIRED_SKILL_MISSING', { skillId });
    for (const skillId of candidate.skillIds) {
      const skill = skills.get(skillId);
      if (!skill) { reject('UNKNOWN_SKILL', { skillId }); continue; }
      if (!allowedSkills.has(skillId)) { reject('OPTIONAL_SKILL_AUTHORITY_ESCALATION', { skillId }); continue; }
      if (skill.trust !== 'reviewed') reject('SKILL_UNTRUSTED', { skillId });
      for (const prerequisite of skill.prerequisites) if (!candidate.skillIds.includes(prerequisite)) reject('SKILL_PREREQUISITE_MISSING', { skillId: prerequisite });
      for (const cap of skill.requiredCapabilities) if (!candidate.capabilities.includes(cap) || !policy.allowedCapabilities.includes(cap)) reject('SKILL_CAPABILITY_UNSATISFIED', { skillId });
      for (const tool of skill.requiredTools) if (!candidate.tools.includes(tool) || !effectiveTools.has(tool)) reject('SKILL_TOOL_UNSATISFIED', { skillId });
      if (skill.sideEffectClass !== 'none' && !policy.allowedSideEffects.includes(skill.sideEffectClass)) reject('SIDE_EFFECT_POLICY_DENIED', { skillId });
      for (const conflict of skill.conflicts) if (candidate.skillIds.includes(conflict)) reject('SKILL_CONFLICT', { skillId });
    }
    if (candidate.reservation === 'unknown' && policy.budget.requireKnownCost) reject('BUDGET_UNKNOWN');
    if (!failed) eligible.push(candidate);
  }
  for (const mandatory of policy.mandatoryPersonaIds) if (!eligible.some(x => x.personaId === mandatory)) exclusions.push({ code:'MANDATORY_PERSONA_INELIGIBLE', candidateId: publicId(mandatory), personaId: publicId(mandatory) });
  const distinct = new Set(eligible.map(x => x.personaId));
  if (duplicatePersona || distinct.size !== eligible.length) exclusions.push({ code:'INSUFFICIENT_ELIGIBLE_PERSONAS', candidateId:'roster' });
  if (exclusions.some(x => x.code === 'MANDATORY_PERSONA_INELIGIBLE')) return { kind:'abstained', code:'MANDATORY_PERSONA_INELIGIBLE', eligible:[], exclusions:sortExclusions(exclusions) };
  if (duplicatePersona) return { kind:'abstained', code:'INSUFFICIENT_ELIGIBLE_PERSONAS', eligible:[], exclusions:sortExclusions(exclusions) };
  sortExclusions(exclusions); eligible.sort((a,b) => compare(a.candidateId,b.candidateId));
  if (!eligible.length) return { kind:'abstained', code:'NO_MATCH', eligible:[], exclusions: exclusions.length ? exclusions : [{ code:'NO_MATCH', candidateId:'none' }] };
  if (policy.admissionPolicy === 'exact' && distinct.size < policy.maxAgents) return { kind:'abstained', code:'INSUFFICIENT_ELIGIBLE_PERSONAS', eligible:[], exclusions: [...exclusions, { code:'INSUFFICIENT_ELIGIBLE_PERSONAS', candidateId:'roster' }] };
  return { kind:'accepted', eligible, exclusions };
}
export function evaluateEligibility(input:PolicyInput): EligibilityResult { return sanitizeEligibilityResult(evaluateEligibilityInternal(input)); }
