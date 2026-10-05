import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { candidateSchema, evaluateEligibility, reconcileTeam, type PolicyInput } from '../src/policy/index.js';
import { loadCatalogSnapshot } from '../src/domain/catalog.js';

const skill = { id: 'required-skill', version: '1.0.0', contentHash: 'a'.repeat(64), trust: 'reviewed', description: 'skill', positiveExamples: ['x'], negativeExamples: [], requiredCapabilities: ['cap'], requiredTools: ['tool'], prerequisites: [], sideEffectClass: 'none', conflicts: [], instructionTokenEstimate: 4, artifactFormats: ['text'] };
const model = (overrides = {}) => ({ id: 'model', version: '1.0.0', provider: 'fixture', requestedModel: 'model', transport: 'offline-fixture', availability: 'available', authorization: 'authorized', modalities: ['text'], features: ['feature'], tools: ['tool'], contextLimit: 100, dataHandling: 'synthetic-only', authorizationScope: 'offline', cost: { input: 'unknown', output: 'unknown' }, operationalEvidenceIds: [], ...overrides });
const persona = { id: 'persona', version: '1.0.0', role: 'worker', positiveExamples: ['x'], negativeExamples: [], requiredCapabilities: ['cap'], outputContract: 'text', requiredSkillIds: ['required-skill'], defaultSkillIds: [], eligibleSkillIds: ['required-skill'], modelOverride: 'model', skillsOverride: 'auto', workspacePolicy: 'isolated', artifactOwnership: 'persona', reviewIndependence: true };
const catalog = (m = model(), p = persona) => loadCatalogSnapshot([{ format: 'json', text: JSON.stringify({ kind: 'skills', version: '1.0.0', records: [skill] }) }, { format: 'json', text: JSON.stringify({ kind: 'models', version: '1.0.0', records: [m] }) }, { format: 'json', text: JSON.stringify({ kind: 'personas', version: '1.0.0', records: [{ ...p, modelOverride: m.availability === 'available' && m.authorization === 'authorized' ? m.id : undefined }] }) }]);
const policy = (overrides: Partial<PolicyInput['policy']> = {}): PolicyInput['policy'] => ({ taskId: 'task', taskAttemptId: 'attempt', requiredCapabilities: ['cap'], requiredTools: ['tool'], requiredFeatures: ['feature'], contextLimit: 50, allowedCapabilities: ['cap'], allowedTools: ['tool'], allowedSideEffects: ['none'], workspaceMode: 'isolated', maxAgents: 1, admissionPolicy: 'allow-fewer', mandatoryPersonaIds: [], budget: { sharedUnits: 10 }, artifactPolicy: 'exclusive', reviewRequired: false, ...overrides });
const candidate = (overrides = {}) => ({ candidateId: 'persona:model', personaId: 'persona', modelId: 'model', skillIds: ['required-skill'], capabilities: ['cap'], tools: ['tool'], contextUse: 10, sideEffect: 'none', workspaceMode: 'isolated', reservation: 4, artifacts: [], reviews: [], ...overrides });

describe('phase 4 policy', () => {
  it('accepts a valid candidate and filters unavailable or unauthorized endpoints independently', () => {
    const result = evaluateEligibility({ catalog: catalog(), policy: policy(), candidates: [candidate()] });
    expect(result.kind).toBe('accepted');
    expect(result.eligible).toHaveLength(1);
    expect(result.eligible[0]).toMatchObject({ candidateId: 'persona', personaId: 'persona', modelId: 'model', skillIds: ['required-skill'], capabilities: ['cap'], tools: ['tool'] });
    expect(evaluateEligibility({ catalog: catalog(model({ availability: 'unavailable' })), policy: policy(), candidates: [candidate()] }).exclusions[0]?.code).toBe('ENDPOINT_UNAVAILABLE');
    expect(evaluateEligibility({ catalog: catalog(model({ authorization: 'unauthorized' })), policy: policy(), candidates: [candidate()] }).exclusions[0]?.code).toBe('ENDPOINT_UNAUTHORIZED');
  });
  it('keeps accepted personas distinct and does not expose raw candidate identity', () => {
    const secondPersona = { ...persona, id: 'second-persona' };
    const twoCatalog = loadCatalogSnapshot([{ format: 'json', text: JSON.stringify({ kind: 'skills', version: '1.0.0', records: [skill] }) }, { format: 'json', text: JSON.stringify({ kind: 'models', version: '1.0.0', records: [model()] }) }, { format: 'json', text: JSON.stringify({ kind: 'personas', version: '1.0.0', records: [persona, secondPersona] }) }]);
    const secret = `runtime-${randomUUID().replaceAll('-', '')}-secret`;
    const result = evaluateEligibility({ catalog: twoCatalog, policy: policy({ maxAgents: 2 }), candidates: [candidate({ candidateId: secret }), candidate({ candidateId: 'another-raw-id', personaId: 'second-persona' })] as any });
    expect(result.kind).toBe('accepted');
    expect(result.eligible.map(member => member.personaId)).toEqual(['persona', 'second-persona']);
    expect(new Set(result.eligible.map(member => member.candidateId)).size).toBe(2);
    expect(JSON.stringify(result)).not.toContain(secret);
  });
  it('rejects missing requirements and does not let optional skills mint authority', () => {
    const result = evaluateEligibility({ catalog: catalog(), policy: policy(), candidates: [candidate({ capabilities: [], tools: [], skillIds: [] })] });
    expect(result.kind).toBe('abstained');
    expect(result.exclusions.map(x => x.code)).toEqual(expect.arrayContaining(['PERSONA_CAPABILITY_MISSING', 'REQUIRED_SKILL_MISSING', 'MISSING_REQUIRED_TOOL']));
  });
  it('reconciles equality but rejects a shared budget overflow and ownership/reviewer conflicts', () => {
    const c = candidate();
    const secondPersona = { ...persona, id: 'second-persona' };
    const twoCatalog = loadCatalogSnapshot([{ format: 'json', text: JSON.stringify({ kind: 'skills', version: '1.0.0', records: [skill] }) }, { format: 'json', text: JSON.stringify({ kind: 'models', version: '1.0.0', records: [model()] }) }, { format: 'json', text: JSON.stringify({ kind: 'personas', version: '1.0.0', records: [persona, secondPersona] }) }]);
    const second = { ...c, candidateId: 'second:model', personaId: 'second-persona' };
    expect(reconcileTeam({ catalog: twoCatalog, policy: policy({ maxAgents: 2, budget: { sharedUnits: 8 } }), candidates: [c, second] as any }).kind).toBe('accepted');
    expect(reconcileTeam({ catalog: twoCatalog, policy: policy({ maxAgents: 2, budget: { sharedUnits: 7 } }), candidates: [c, second] as any }).exclusions.map(x => x.code)).toContain('BUDGET_EXCEEDED');
  });
  it('returns exact no-match and isolates mutations', () => {
    const input = { catalog: catalog(), policy: policy(), candidates: [candidate()] };
    const result = evaluateEligibility(input); input.candidates[0]!.capabilities.push('mutate');
    expect(result.eligible[0]!.capabilities).not.toContain('mutate');
    expect(() => ((result.eligible as any)[0].candidateId = 'changed')).toThrow();
    expect(evaluateEligibility({ catalog: catalog(), policy: policy(), candidates: [] }).code).toBe('NO_MATCH');
  });
  it('fails closed for exact admission without enough eligible personas', () => {
    const result = evaluateEligibility({ catalog: catalog(), policy: policy({ maxAgents: 2, admissionPolicy: 'exact' }), candidates: [candidate()] });
    expect(result.code).toBe('INSUFFICIENT_ELIGIBLE_PERSONAS');
  });
  it('enforces catalog pins and eligible skill authority', () => {
    const extra = { ...skill, id: 'optional-skill' };
    const c = loadCatalogSnapshot([{ format: 'json', text: JSON.stringify({ kind: 'skills', version: '1.0.0', records: [skill, extra] }) }, { format: 'json', text: JSON.stringify({ kind: 'models', version: '1.0.0', records: [model()] }) }, { format: 'json', text: JSON.stringify({ kind: 'personas', version: '1.0.0', records: [persona] }) }]);
    const result = evaluateEligibility({ catalog: c, policy: policy(), candidates: [candidate({ skillIds: ['required-skill', 'optional-skill'], capabilities: ['cap', 'admin'], tools: ['tool', 'shell'] })] });
    expect(result.kind).toBe('abstained');
    expect(result.exclusions.map(x => x.code)).toContain('OPTIONAL_SKILL_AUTHORITY_ESCALATION');
  });
  it('fails mandatory personas terminally and rejects duplicate members', () => {
    const result = evaluateEligibility({ catalog: catalog(), policy: policy({ mandatoryPersonaIds: ['missing'] }), candidates: [candidate(), candidate()] });
    expect(result.kind).toBe('abstained');
    expect(result.eligible).toHaveLength(0);
    expect(result.exclusions.map(x => x.code)).toContain('MANDATORY_PERSONA_INELIGIBLE');
  });
  it('requires independent review relations and preserves typed conflicts', () => {
    const c = candidate({ artifacts: [{ artifactId: 'artifact', owner: 'persona' }] }) as any;
    const result = reconcileTeam({ catalog: catalog(), policy: policy({ reviewRequired: true }), candidates: [c] });
    expect(result.code).toBe('REVIEWER_NOT_INDEPENDENT');
  });
  it('uses checked safe budget arithmetic', () => {
    const c = candidate({ reservation: Number.MAX_SAFE_INTEGER }) as any;
    expect(reconcileTeam({ catalog: catalog(), policy: policy({ budget: { sharedUnits: Number.MAX_SAFE_INTEGER } }), candidates: [c] }).kind).toBe('accepted');
    expect(() => evaluateEligibility({ catalog: catalog(), policy: policy({ budget: { sharedUnits: Number.MAX_SAFE_INTEGER + 1 } }), candidates: [c] })).toThrow();
  });
  it('keeps failed redacted candidates out of eligibility', () => {
    const result = evaluateEligibility({ catalog: catalog(), policy: policy({ requiredFeatures: ['missing'] }), candidates: [candidate({ candidateId: 'runtime-secret-id/with-private-suffix' })] });
    expect(result.kind).toBe('abstained');
    expect(JSON.stringify(result)).not.toContain('runtime-secret-id');
  });
  it('derives capabilities and tools from policy intersections', () => {
    expect(evaluateEligibility({ catalog: catalog(), policy: policy({ allowedCapabilities: [] }), candidates: [candidate()] }).kind).toBe('abstained');
    expect(evaluateEligibility({ catalog: catalog(), policy: policy({ allowedTools: [] }), candidates: [candidate()] }).kind).toBe('abstained');
    expect(evaluateEligibility({ catalog: catalog(model({ tools: [] })), policy: policy(), candidates: [candidate()] }).kind).toBe('abstained');
  });
  it('rejects dangling, duplicate, and misplaced review relations but accepts the bound relation', () => {
    const reviewer = { ...persona, id: 'reviewer', requiredCapabilities: [], requiredSkillIds: [], defaultSkillIds: [], eligibleSkillIds: [], modelOverride: 'model' };
    const c = candidate({ artifacts: [{ artifactId: 'artifact', owner: 'persona' }] });
    const r = candidate({ candidateId: 'reviewer:model', personaId: 'reviewer', reviews: [{ artifactId: 'artifact', producerPersonaId: 'persona', reviewerPersonaId: 'reviewer' }], capabilities: [], skillIds: [], tools: [] });
    const cCatalog = loadCatalogSnapshot([{ format: 'json', text: JSON.stringify({ kind: 'skills', version: '1.0.0', records: [skill] }) }, { format: 'json', text: JSON.stringify({ kind: 'models', version: '1.0.0', records: [model()] }) }, { format: 'json', text: JSON.stringify({ kind: 'personas', version: '1.0.0', records: [persona, reviewer] }) }]);
    expect(reconcileTeam({ catalog: cCatalog, policy: policy({ maxAgents: 2, reviewRequired: true, requiredCapabilities: [], requiredTools: [] }), candidates: [c, r] as any }).kind).toBe('accepted');
    expect(reconcileTeam({ catalog: cCatalog, policy: policy({ reviewRequired: true, requiredCapabilities: [], requiredTools: [] }), candidates: [c, { ...r, reviews: [...r.reviews, { artifactId: 'dangling', producerPersonaId: 'persona', reviewerPersonaId: 'reviewer' }] }] as any }).kind).toBe('abstained');
  });
  it('treats duplicate personas as terminal in both admission modes', () => {
    for (const admissionPolicy of ['exact', 'allow-fewer'] as const) {
      const result = evaluateEligibility({ catalog: catalog(), policy: policy({ admissionPolicy, maxAgents: 2 }), candidates: [candidate(), { ...candidate(), candidateId: 'second' }] });
      expect(result.kind).toBe('abstained');
      expect(result.eligible).toHaveLength(0);
      expect(result.code).toBe('INSUFFICIENT_ELIGIBLE_PERSONAS');
    }
  });
  it('does not reflect runtime-generated secret-shaped identifiers', () => {
    const secret = `runtime-${randomUUID().replaceAll('-', '')}-secret`;
    const result = reconcileTeam({ catalog: catalog(), policy: policy({ requiredFeatures: ['missing'] }), candidates: [candidate({ candidateId: secret, artifacts: [{ artifactId: `${secret}-artifact`, owner: 'persona' }] })] });
    expect(result.kind).toBe('abstained');
    expect(JSON.stringify(result)).not.toContain(secret);
  });
  it('uses bounded opaque references for accepted artifact and review relations', () => {
    const secretArtifact = 'runtime-secret-artifact-token';
    const result = reconcileTeam({ catalog: catalog(), policy: policy(), candidates: [candidate({ artifacts: [{ artifactId: secretArtifact, owner: 'persona' }], reviews: [{ artifactId: secretArtifact, producerPersonaId: 'persona', reviewerPersonaId: 'persona' }] })] as any });
    expect(result.kind).toBe('accepted');
    const accepted = result.eligible[0]!;
    expect(accepted.artifacts[0]!.artifactId).not.toBe(secretArtifact);
    expect(accepted.reviews[0]!.artifactId).toBe(accepted.artifacts[0]!.artifactId);
    expect(JSON.stringify(result)).not.toContain(secretArtifact);
    expect(candidateSchema.safeParse(accepted).success).toBe(true);
  });
  it('keeps maximum-length trusted persona and model identities schema-valid', () => {
    const longPersonaId = 'p'.repeat(128);
    const longModelId = 'm'.repeat(128);
    const longModel = model({ id: longModelId, requestedModel: longModelId });
    const longPersona = { ...persona, id: longPersonaId, modelOverride: longModelId };
    const longCatalog = catalog(longModel, longPersona);
    const result = evaluateEligibility({ catalog: longCatalog, policy: policy(), candidates: [candidate({ candidateId: 'raw-candidate-id', personaId: longPersonaId, modelId: longModelId })] as any });
    expect(result.kind).toBe('accepted');
    const accepted = result.eligible[0]!;
    expect(accepted.candidateId).toBe(longPersonaId);
    expect(accepted.personaId).toBe(longPersonaId);
    expect(accepted.modelId).toBe(longModelId);
    expect(candidateSchema.safeParse(accepted).success).toBe(true);
  });
  it('canonicalizes accepted projection when raw candidate IDs and relation inputs are reordered', () => {
    const secondPersona = { ...persona, id: 'second-persona', reviewIndependence: true };
    const c = loadCatalogSnapshot([{ format: 'json', text: JSON.stringify({ kind: 'skills', version: '1.0.0', records: [skill] }) }, { format: 'json', text: JSON.stringify({ kind: 'models', version: '1.0.0', records: [model()] }) }, { format: 'json', text: JSON.stringify({ kind: 'personas', version: '1.0.0', records: [persona, secondPersona] }) }]);
    const first = candidate({ candidateId: 'same-raw-id', artifacts: [{ artifactId: 'artifact-a1', owner: 'persona' }, { artifactId: 'artifact-a2', owner: 'persona' }], reviews: [{ artifactId: 'artifact-b1', producerPersonaId: 'second-persona', reviewerPersonaId: 'persona' }, { artifactId: 'artifact-b2', producerPersonaId: 'second-persona', reviewerPersonaId: 'persona' }] });
    const second = candidate({ candidateId: 'same-raw-id', personaId: 'second-persona', artifacts: [{ artifactId: 'artifact-b1', owner: 'persona' }, { artifactId: 'artifact-b2', owner: 'persona' }], reviews: [{ artifactId: 'artifact-a1', producerPersonaId: 'persona', reviewerPersonaId: 'second-persona' }, { artifactId: 'artifact-a2', producerPersonaId: 'persona', reviewerPersonaId: 'second-persona' }] });
    const input = { catalog: c, policy: policy({ maxAgents: 2, reviewRequired: true, requiredCapabilities: [], requiredTools: [] }), candidates: [first, second] as any };
    const reversed = { ...input, candidates: [{ ...second, artifacts: [...second.artifacts].reverse(), reviews: [...second.reviews].reverse() }, { ...first, artifacts: [...first.artifacts].reverse(), reviews: [...first.reviews].reverse() }] as any };
    const result = reconcileTeam(input);
    const reversedResult = reconcileTeam(reversed);
    expect(result).toEqual(reversedResult);
    expect(result.eligible.map(member => member.personaId)).toEqual(['persona', 'second-persona']);
    expect(result.eligible.flatMap(member => member.artifacts.map(artifact => artifact.artifactId))).toEqual(['artifact-ref-0', 'artifact-ref-1', 'artifact-ref-2', 'artifact-ref-3']);
    expect(result.eligible.flatMap(member => member.reviews.map(review => review.artifactId))).toEqual(['artifact-ref-2', 'artifact-ref-3', 'artifact-ref-0', 'artifact-ref-1']);
  });
});
