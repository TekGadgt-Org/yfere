import { createHash } from 'node:crypto';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

export const CATALOG_SCHEMA_VERSION = 'catalog-schema-v1' as const;
export const CANONICALIZATION_VERSION = 'canonical-json-v1' as const;

const id = z.string().regex(/^[a-z][a-z0-9]*(?:[-_][a-z0-9]+)*$/, 'invalid catalog identifier').max(128);
const version = z.string().regex(/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/, 'invalid version').max(64);
const text = z.string().min(1).max(100_000);
const finite = z.number().finite();
const unknownOrNumber = z.union([finite, z.literal('unknown')]);
const refList = z.array(id).max(128);
const provenance = z.enum(['synthetic', 'documented_example', 'recorded_live']);
const availability = z.enum(['available', 'unavailable', 'unknown']);
const authorization = z.enum(['authorized', 'unauthorized', 'unknown']);
const trust = z.enum(['reviewed', 'unreviewed', 'blocked']);

export const personaDefinitionSchema = z.object({
  id, version, role: text, positiveExamples: z.array(text).max(128), negativeExamples: z.array(text).max(128),
  requiredCapabilities: refList, outputContract: text, requiredSkillIds: refList, defaultSkillIds: refList, eligibleSkillIds: refList,
  modelOverride: id.optional(), skillsOverride: z.union([z.literal('auto'), refList]).optional(),
  workspacePolicy: z.enum(['isolated', 'reviewed']), artifactOwnership: z.enum(['persona', 'project']), reviewIndependence: z.boolean(),
}).strict();

export const modelEndpointSchema = z.object({
  id, version, provider: z.enum(['codex', 'claude-code', 'opencode-go', 'fixture']), requestedModel: id, exactModel: id.optional(),
  transport: z.enum(['offline-fixture', 'direct-api', 'native-runtime']), availability, authorization,
  modalities: z.array(z.enum(['text', 'image', 'audio'])).max(8), features: refList, tools: refList, contextLimit: z.number().int().positive().safe(),
  dataHandling: z.enum(['synthetic-only', 'public-only', 'reviewed-minimized']), authorizationScope: z.enum(['offline', 'controlled-local', 'live']),
  cost: z.object({ input: unknownOrNumber, output: unknownOrNumber }).strict(), operationalEvidenceIds: refList,
}).strict();

export const skillDefinitionSchema = z.object({
  id, version, contentHash: z.string().regex(/^[a-f0-9]{64}$/, 'invalid content hash'), trust, description: text,
  positiveExamples: z.array(text).max(128), negativeExamples: z.array(text).max(128), requiredCapabilities: refList, requiredTools: refList,
  prerequisites: refList, sideEffectClass: z.enum(['none', 'workspace', 'external']), conflicts: refList,
  instructionTokenEstimate: z.number().int().nonnegative().safe(), artifactFormats: z.array(id).max(32),
}).strict();

const subject = z.object({ endpointId: id.optional(), personaId: id.optional(), skillId: id.optional(), taskFamily: id.optional() }).strict().refine(v => Object.keys(v).length > 0, 'evidence subject is required');
const interval = z.object({ low: finite, high: finite }).strict().superRefine((v, c) => { if (v.low > v.high) c.addIssue({ code: 'custom', path: ['low'], message: 'must not exceed high' }); });
export const thewEvidenceSchema = z.object({
  id, version, subject, metric: id, rubricVersion: version, value: unknownOrNumber, sampleCount: z.union([z.number().int().nonnegative().safe(), z.literal('unknown')]),
  uncertainty: z.union([interval, z.literal('unknown')]), provenance, measuredAt: z.string().datetime({ offset: true }), validUntil: z.string().datetime({ offset: true }).optional(),
  applicability: z.enum(['exact', 'related', 'unknown']), status: z.enum(['accepted', 'superseded', 'rejected']),
}).strict();

const documentKinds = ['personas', 'models', 'skills', 'thews'] as const;
export type DocumentKind = typeof documentKinds[number];
const recordSchemas = { personas: personaDefinitionSchema, models: modelEndpointSchema, skills: skillDefinitionSchema, thews: thewEvidenceSchema } as const;
export const catalogDocumentSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('personas'), version, records: z.array(personaDefinitionSchema).max(10_000) }).strict(),
  z.object({ kind: z.literal('models'), version, records: z.array(modelEndpointSchema).max(10_000) }).strict(),
  z.object({ kind: z.literal('skills'), version, records: z.array(skillDefinitionSchema).max(10_000) }).strict(),
  z.object({ kind: z.literal('thews'), version, records: z.array(thewEvidenceSchema).max(10_000) }).strict(),
]);

export type PersonaDefinition = Readonly<z.infer<typeof personaDefinitionSchema>>;
export type ModelEndpoint = Readonly<z.infer<typeof modelEndpointSchema>>;
export type SkillDefinition = Readonly<z.infer<typeof skillDefinitionSchema>>;
export type ThewEvidence = Readonly<z.infer<typeof thewEvidenceSchema>>;
export type CatalogDocument = z.infer<typeof catalogDocumentSchema>;
export type CatalogSnapshot = Readonly<{
  schemaVersion: typeof CATALOG_SCHEMA_VERSION; canonicalizationVersion: typeof CANONICALIZATION_VERSION; snapshotId: string;
  personas: readonly PersonaDefinition[]; models: readonly ModelEndpoint[]; skills: readonly SkillDefinition[]; thews: readonly ThewEvidence[];
}>;

export class CatalogValidationError extends Error {
  readonly code = 'CATALOG_INVALID' as const;
  constructor(readonly path: string, message: string) { super(`${path}: ${message}`); this.name = 'CatalogValidationError'; }
}

function freeze<T>(value: T): T { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.freeze(value); for (const child of Object.values(value as Record<string, unknown>)) freeze(child); } return value; }
function clone<T>(value: T): T { if (typeof structuredClone === 'function') return structuredClone(value); return JSON.parse(JSON.stringify(value)) as T; }
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value);
}
export function canonicalizeCatalog(snapshot: Omit<CatalogSnapshot, 'snapshotId'>): string { return canonical(snapshot); }

function issue(path: string, message: string): never { throw new CatalogValidationError(path, message); }
function rejectDuplicateJsonKeys(input: string, source: string): void {
  const stack: Array<{ type: 'object'; keys: Set<string>; expectingKey: boolean } | { type: 'array' }> = [];
  let i = 0;
  const skip = () => { while (/\s/.test(input[i] ?? '')) i++; };
  const stringToken = (): string => {
    const start = i++; let escaped = false;
    while (i < input.length) { const c = input[i++]; if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') return JSON.parse(input.slice(start, i)) as string; }
    issue(source, 'malformed catalog document');
  };
  while (i < input.length) {
    skip(); const c = input[i];
    if (c === '"') { const token = stringToken(); const frame = stack[stack.length - 1]; if (frame?.type === 'object' && frame.expectingKey) { if (frame.keys.has(token)) issue(source, 'duplicate object key'); frame.keys.add(token); frame.expectingKey = false; } continue; }
    if (c === '{') { stack.push({ type: 'object', keys: new Set(), expectingKey: true }); i++; continue; }
    if (c === '[') { stack.push({ type: 'array' }); i++; continue; }
    if (c === '}') { stack.pop(); i++; continue; }
    if (c === ']') { stack.pop(); i++; continue; }
    if (c === ':' || c === ',') { const frame = stack[stack.length - 1]; if (c === ',' && frame?.type === 'object') frame.expectingKey = true; i++; continue; }
    i++;
  }
}
function rejectSecretLike(value: unknown, path = ''): void {
  if (value && typeof value === 'object') for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (/^(?:password|passwd|token|secret|api[-_]?key|credential|private[-_]?key)$/i.test(key) || /(?:password|passwd|token|secret|api[-_]?key|credential|private[-_]?key)(?:[-_]|$)/i.test(key)) issue(`${path}.${key}`, 'secret-shaped field is not permitted');
    rejectSecretLike(child, `${path}.${key}`);
  }
}
function checkRefs(snapshot: { personas: PersonaDefinition[]; models: ModelEndpoint[]; skills: SkillDefinition[]; thews: ThewEvidence[] }): void {
  const all = new Map<string, string>();
  for (const [kind, records] of Object.entries(snapshot) as Array<[string, Array<{ id: string }>]>) for (const [i, record] of records.entries()) {
    if (all.has(record.id)) issue(`${kind}.records[${i}].id`, 'duplicate catalog identifier'); all.set(record.id, kind);
  }
  const skills = new Set(snapshot.skills.map(x => x.id)); const models = new Set(snapshot.models.map(x => x.id)); const personas = new Set(snapshot.personas.map(x => x.id)); const thews = new Set(snapshot.thews.map(x => x.id));
  const requireSkill = (value: string, path: string) => { if (!skills.has(value)) issue(path, 'unknown skill reference'); const s = snapshot.skills.find(x => x.id === value)!; if (s.trust !== 'reviewed') issue(path, 'skill is not trusted'); };
  snapshot.personas.forEach((p, i) => {
    p.requiredSkillIds.forEach((x, j) => requireSkill(x, `personas.records[${i}].requiredSkillIds[${j}]`));
    p.defaultSkillIds.forEach((x, j) => requireSkill(x, `personas.records[${i}].defaultSkillIds[${j}]`));
    p.eligibleSkillIds.forEach((x, j) => requireSkill(x, `personas.records[${i}].eligibleSkillIds[${j}]`));
    if (p.modelOverride) { if (!models.has(p.modelOverride)) issue(`personas.records[${i}].modelOverride`, 'unknown model reference'); const m = snapshot.models.find(x => x.id === p.modelOverride)!; if (m.availability !== 'available' || m.authorization !== 'authorized') issue(`personas.records[${i}].modelOverride`, 'model is unavailable or unauthorized'); }
    if (Array.isArray(p.skillsOverride)) p.skillsOverride.forEach((x, j) => requireSkill(x, `personas.records[${i}].skillsOverride[${j}]`));
    if (Array.isArray(p.skillsOverride) && !p.requiredSkillIds.every(x => p.skillsOverride!.includes(x))) issue(`personas.records[${i}].skillsOverride`, 'explicit skills must include required skills');
  });
  snapshot.models.forEach((m, i) => m.operationalEvidenceIds.forEach((x, j) => { if (!thews.has(x)) issue(`models.records[${i}].operationalEvidenceIds[${j}]`, 'unknown thew reference'); }));
  snapshot.thews.forEach((t, i) => { if (t.subject.endpointId && !models.has(t.subject.endpointId)) issue(`thews.records[${i}].subject.endpointId`, 'unknown model reference'); if (t.subject.personaId && !personas.has(t.subject.personaId)) issue(`thews.records[${i}].subject.personaId`, 'unknown persona reference'); if (t.subject.skillId && !skills.has(t.subject.skillId)) issue(`thews.records[${i}].subject.skillId`, 'unknown skill reference'); });
}

export function normalizeCatalogDocuments(documents: readonly CatalogDocument[]): CatalogSnapshot {
  const grouped = { personas: [] as PersonaDefinition[], models: [] as ModelEndpoint[], skills: [] as SkillDefinition[], thews: [] as ThewEvidence[] };
  const versions = new Set<string>();
  for (const document of documents) { versions.add(document.version); grouped[document.kind].push(...clone(document.records) as never[]); }
  for (const records of Object.values(grouped)) records.sort((a, b) => a.id.localeCompare(b.id));
  checkRefs(grouped);
  const base = { schemaVersion: CATALOG_SCHEMA_VERSION, canonicalizationVersion: CANONICALIZATION_VERSION, personas: grouped.personas, models: grouped.models, skills: grouped.skills, thews: grouped.thews } as Omit<CatalogSnapshot, 'snapshotId'>;
  const snapshotId = createHash('sha256').update(canonical({ ...base, recordVersions: [...versions].sort() })).digest('hex');
  return freeze({ ...base, snapshotId });
}

export function parseCatalogDocument(textValue: string, format: 'json' | 'yaml', source = '<input>'): CatalogDocument {
  let value: unknown;
  try { if (format === 'json') rejectDuplicateJsonKeys(textValue, source); value = format === 'json' ? JSON.parse(textValue) : parseYaml(textValue, { version: '1.2' }); } catch (error) { if (error instanceof CatalogValidationError) throw error; issue(source, 'malformed catalog document'); }
  rejectSecretLike(value);
  const result = catalogDocumentSchema.safeParse(value);
  if (!result.success) { const first = result.error.issues[0]; issue(`${source}${first?.path.length ? `.${first.path.join('.')}` : ''}`, 'invalid catalog document'); }
  return result.data;
}

export type CatalogSource = Readonly<{ source?: string; format: 'json' | 'yaml'; text: string }>;
export function loadCatalogSnapshot(sources: readonly CatalogSource[]): CatalogSnapshot { return normalizeCatalogDocuments(sources.map(s => parseCatalogDocument(s.text, s.format, s.source ?? '<input>'))); }
export const catalogSchemas = Object.freeze({ personaDefinitionSchema, modelEndpointSchema, skillDefinitionSchema, thewEvidenceSchema, catalogDocumentSchema });
export { recordSchemas };
