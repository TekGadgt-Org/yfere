import { describe, expect, it } from 'vitest';
import { evaluateEligibility, reconcileTeam, type PolicyInput } from '../src/policy/index.js';
import { loadCatalogSnapshot } from '../src/domain/catalog.js';

const skill = { id: 'required-skill', version: '1.0.0', contentHash: 'a'.repeat(64), trust: 'reviewed', description: 'skill', positiveExamples: ['x'], negativeExamples: [], requiredCapabilities: ['cap'], requiredTools: ['tool'], prerequisites: [], sideEffectClass: 'none', conflicts: [], instructionTokenEstimate: 4, artifactFormats: ['text'] };
const model = (overrides = {}) => ({ id: 'model', version: '1.0.0', provider: 'fixture', requestedModel: 'model', transport: 'offline-fixture', availability: 'available', authorization: 'authorized', modalities: ['text'], features: ['feature'], tools: ['tool'], contextLimit: 100, dataHandling: 'synthetic-only', authorizationScope: 'offline', cost: { input: 'unknown', output: 'unknown' }, operationalEvidenceIds: [], ...overrides });
const persona = { id: 'persona', version: '1.0.0', role: 'worker', positiveExamples: ['x'], negativeExamples: [], requiredCapabilities: ['cap'], outputContract: 'text', requiredSkillIds: ['required-skill'], defaultSkillIds: [], eligibleSkillIds: ['required-skill'], modelOverride: 'model', skillsOverride: 'auto', workspacePolicy: 'isolated', artifactOwnership: 'persona', reviewIndependence: true };
const catalog = (m = model(), p = persona) => loadCatalogSnapshot([{ format: 'json', text: JSON.stringify({ kind: 'skills', version: '1.0.0', records: [skill] }) }, { format: 'json', text: JSON.stringify({ kind: 'models', version: '1.0.0', records: [m] }) }, { format: 'json', text: JSON.stringify({ kind: 'personas', version: '1.0.0', records: [{ ...p, modelOverride: m.availability === 'available' && m.authorization === 'authorized' ? 'model' : undefined }] }) }]);
const policy = (overrides: Partial<PolicyInput['policy']> = {}): PolicyInput['policy'] => ({ taskId: 'task', taskAttemptId: 'attempt', requiredCapabilities: ['cap'], requiredTools: ['tool'], requiredFeatures: ['feature'], contextLimit: 50, allowedCapabilities: ['cap'], allowedTools: ['tool'], allowedSideEffects: ['none'], workspaceMode: 'isolated', maxAgents: 1, admissionPolicy: 'allow-fewer', mandatoryPersonaIds: [], budget: { sharedUnits: 10 }, artifactPolicy: 'exclusive', reviewRequired: false, ...overrides });
const candidate = (overrides = {}) => ({ candidateId: 'persona:model', personaId: 'persona', modelId: 'model', skillIds: ['required-skill'], capabilities: ['cap'], tools: ['tool'], contextUse: 10, sideEffect: 'none', workspaceMode: 'isolated', reservation: 4, artifacts: [], reviews: [], ...overrides });

describe('phase 4 policy', () => {
  it('accepts a valid candidate and filters unavailable or unauthorized endpoints independently', () => {
    const result = evaluateEligibility({ catalog: catalog(), policy: policy(), candidates: [candidate()] });
    expect(result.kind).toBe('accepted');
    expect(result.eligible).toHaveLength(1);
    expect(evaluateEligibility({ catalog: catalog(model({ availability: 'unavailable' })), policy: policy(), candidates: [candidate()] }).exclusions[0]?.code).toBe('ENDPOINT_UNAVAILABLE');
    expect(evaluateEligibility({ catalog: catalog(model({ authorization: 'unauthorized' })), policy: policy(), candidates: [candidate()] }).exclusions[0]?.code).toBe('ENDPOINT_UNAUTHORIZED');
  });
  it('rejects missing requirements and does not let optional skills mint authority', () => {
    const result = evaluateEligibility({ catalog: catalog(), policy: policy(), candidates: [candidate({ capabilities: [], tools: [], skillIds: [] })] });
    expect(result.kind).toBe('abstained');
    expect(result.exclusions.map(x => x.code)).toEqual(expect.arrayContaining(['PERSONA_CAPABILITY_MISSING', 'REQUIRED_SKILL_MISSING', 'MISSING_REQUIRED_TOOL']));
  });
  it('reconciles equality but rejects a shared budget overflow and ownership/reviewer conflicts', () => {
    const c = candidate();
    expect(reconcileTeam({ catalog: catalog(), policy: policy({ maxAgents: 2, budget: { sharedUnits: 8 } }), candidates: [c, { ...c, candidateId: 'persona:model-2', reservation: 4 }] }).kind).toBe('accepted');
    expect(reconcileTeam({ catalog: catalog(), policy: policy({ maxAgents: 2, budget: { sharedUnits: 7 } }), candidates: [c, { ...c, candidateId: 'persona:model-2', reservation: 4 }] }).exclusions.map(x => x.code)).toContain('BUDGET_EXCEEDED');
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
});
