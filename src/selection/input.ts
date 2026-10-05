import { policySchema } from '../policy/contracts.js';
import { catalogSchemas } from '../domain/catalog.js';
import { SelectorError, type SelectorInput } from './contracts.js';

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const safeOpaque = (value: unknown) => typeof value === 'string' && value.length > 0 && value.length <= 128 && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value) && !value.includes('..') && !value.includes('://');
const digest = (value: unknown) => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
const ownKeys = (value: Record<string, unknown>, allowed: readonly string[]) => Object.keys(value).every(key => allowed.includes(key));
const sensitive = new Set(['pass','password','secret','token','credential','private','cookie','path','repo','repository','file','socket']);
function copyData(value: unknown, depth = 0): unknown {
  if (depth > 64) throw new SelectorError('CONFIG_ERROR', 'input too deep');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) { if (value.length > 10_000) throw new SelectorError('CONFIG_ERROR', 'input too large'); return value.map(item => copyData(item, depth + 1)); }
  if (!isRecord(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new SelectorError('CONFIG_ERROR', 'invalid selector input');
  const out: Record<string, unknown> = Object.create(null);
  for (const key of Object.keys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !('value' in descriptor) || descriptor.get || descriptor.set || sensitive.has(key.toLowerCase())) throw new SelectorError('CONFIG_ERROR', 'invalid selector input');
    Object.defineProperty(out, key, { value: copyData(descriptor.value, depth + 1), enumerable: true, writable: true, configurable: true });
  }
  return out;
}

/** Closed, detached trust-boundary normalization for selector callers. */
export function normalizeSelectorInput(value: unknown): SelectorInput {
  if (!isRecord(value) || !ownKeys(value, ['catalog','policy','settledPrompt','answers','decisionService','overrides','generation','replan','signal','runId'])
    || typeof value.settledPrompt !== 'string' || value.settledPrompt.length > 32_768 || !isRecord(value.catalog) || !isRecord(value.policy)) throw new SelectorError('CONFIG_ERROR', 'invalid selector input');
  if (value.decisionService === undefined || typeof value.decisionService !== 'object' || typeof (value.decisionService as any).evaluate !== 'function') throw new SelectorError('CONFIG_ERROR', 'decision service required');
  if (value.signal !== undefined && (typeof value.signal !== 'object' || typeof (value.signal as any).aborted !== 'boolean')) throw new SelectorError('CONFIG_ERROR', 'invalid signal');
  for (const key of ['runId']) if (key in value && !safeOpaque(value[key])) throw new SelectorError('CONFIG_ERROR', 'invalid selector input');
  const policy = policySchema.safeParse(value.policy); if (!policy.success) throw new SelectorError('CONFIG_ERROR', 'invalid policy');
  const catalog = value.catalog as Record<string, unknown>;
  if (!ownKeys(catalog, ['schemaVersion','canonicalizationVersion','snapshotId','recordVersions','documentVersions','personas','models','skills','thews']) || !safeOpaque(catalog.snapshotId)) throw new SelectorError('CONFIG_ERROR', 'invalid catalog');
  for (const [key, schema] of [['personas', catalogSchemas.personaDefinitionSchema], ['models', catalogSchemas.modelEndpointSchema], ['skills', catalogSchemas.skillDefinitionSchema], ['thews', catalogSchemas.thewEvidenceSchema]] as const) {
    if (!Array.isArray(catalog[key]) || catalog[key].some(item => !schema.safeParse(item).success)) throw new SelectorError('CONFIG_ERROR', 'invalid catalog');
  }
  let replan: any = undefined;
  if (value.replan !== undefined) {
    if (!isRecord(value.replan) || !ownKeys(value.replan, ['generation','parentRosterId','parentDecisionLineage','priorFailure']) || value.replan.generation !== 1 || value.replan.priorFailure !== 'replanEligible' || !safeOpaque(value.replan.parentRosterId) || !Array.isArray(value.replan.parentDecisionLineage) || value.replan.parentDecisionLineage.length === 0 || value.replan.parentDecisionLineage.some(item => !digest(item))) throw new SelectorError('REPLAN_EXHAUSTED', 'invalid replan');
    if (new Set(value.replan.parentDecisionLineage as string[]).size !== value.replan.parentDecisionLineage.length) throw new SelectorError('REPLAN_EXHAUSTED', 'duplicate lineage');
    replan = copyData(value.replan);
  }
  const generation = value.generation ?? replan?.generation ?? 0;
  if (generation !== 0 && generation !== 1 || generation === 1 && !replan || generation === 0 && replan) throw new SelectorError('REPLAN_EXHAUSTED', 'invalid generation');
  const { decisionService: _service, signal: _signal, replan: _replan, ...serializable } = value;
  const data = copyData({ ...serializable, catalog, policy: policy.data }) as any;
  if (replan) data.replan = replan;
  return { ...data, decisionService: value.decisionService, signal: value.signal } as SelectorInput;
}
