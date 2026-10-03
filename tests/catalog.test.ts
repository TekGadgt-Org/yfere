import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { CatalogValidationError, canonicalizeCatalog, loadCatalogSnapshot, normalizeCatalogDocuments, parseCatalogDocument } from '../src/domain/catalog.js';

const skill = { id: 'lint', version: '1.0.0', contentHash: 'a'.repeat(64), trust: 'reviewed', description: 'Lint code', positiveExamples: ['lint'], negativeExamples: ['deploy'], requiredCapabilities: [], requiredTools: [], prerequisites: [], sideEffectClass: 'none', conflicts: [], instructionTokenEstimate: 10, artifactFormats: ['text'] };
const model = { id: 'fixture-model', version: '1.0.0', provider: 'fixture', requestedModel: 'fixture-model', transport: 'offline-fixture', availability: 'available', authorization: 'authorized', modalities: ['text'], features: [], tools: [], contextLimit: 1000, dataHandling: 'synthetic-only', authorizationScope: 'offline', cost: { input: 'unknown', output: 0 }, operationalEvidenceIds: [] };
const persona = { id: 'reviewer', version: '1.0.0', role: 'Review work', positiveExamples: ['review'], negativeExamples: [], requiredCapabilities: [], outputContract: 'report', requiredSkillIds: ['lint'], defaultSkillIds: ['lint'], eligibleSkillIds: ['lint'], modelOverride: 'fixture-model', skillsOverride: 'auto', workspacePolicy: 'isolated', artifactOwnership: 'persona', reviewIndependence: true };
const doc = (kind: string, records: unknown[]) => JSON.stringify({ kind, version: '1.0.0', records });

describe('catalog loading', () => {
  it('loads and freezes a deterministic snapshot independent of document order', () => {
    const a = loadCatalogSnapshot([{ format: 'json', text: doc('skills', [skill]) }, { format: 'json', text: doc('models', [model]) }, { format: 'json', text: doc('personas', [persona]) }]);
    const b = loadCatalogSnapshot([{ format: 'json', text: doc('personas', [persona]) }, { format: 'json', text: doc('models', [model]) }, { format: 'json', text: doc('skills', [skill]) }]);
    expect(a.snapshotId).toBe(b.snapshotId);
    expect(Object.isFrozen(a)).toBe(true);
    expect(Object.isFrozen(a.personas[0])).toBe(true);
    expect(() => ((a.personas[0] as any).id = 'changed')).toThrow();
  });
  it('is deterministic across record order and does not depend on localeCompare', () => {
    const first = { ...skill, id: 'alpha-skill', requiredCapabilities: ['z-capability', 'a-capability'], artifactFormats: ['z-format', 'a-format'] };
    const second = { ...skill, id: 'beta-skill', prerequisites: ['alpha-skill'] };
    const a = loadCatalogSnapshot([{ format: 'json', text: doc('skills', [first, second]) }]);
    const b = loadCatalogSnapshot([{ format: 'json', text: doc('skills', [second, first]) }]);
    expect(a.snapshotId).toBe(b.snapshotId);
    expect(canonicalizeCatalog(a)).toBe(canonicalizeCatalog(b));
    const original = String.prototype.localeCompare;
    String.prototype.localeCompare = () => { throw new Error('localeCompare must not define catalog identity'); };
    try {
      expect(loadCatalogSnapshot([{ format: 'json', text: doc('skills', [second, first]) }]).snapshotId).toBe(a.snapshotId);
    } finally {
      String.prototype.localeCompare = original;
    }
  });
  it('preserves auto, empty and non-empty skill overrides', () => {
    expect((parseCatalogDocument(doc('personas', [{ ...persona, skillsOverride: 'auto' }]), 'json')).records[0] as any).toMatchObject({ skillsOverride: 'auto' });
    expect((parseCatalogDocument(doc('personas', [{ ...persona, skillsOverride: ['lint'] }]), 'json')).records[0] as any).toMatchObject({ skillsOverride: ['lint'] });
    expect(() => loadCatalogSnapshot([{ format: 'json', text: doc('skills', [skill]) }, { format: 'json', text: doc('models', [model]) }, { format: 'json', text: doc('personas', [{ ...persona, skillsOverride: [] }]) }])).toThrow(CatalogValidationError);
  });
  it('rejects duplicates, dangling refs, unknown keys, secrets and malformed input', () => {
    expect(() => parseCatalogDocument('{"kind":"skills","kind":"models","version":"1.0.0","records":[]}', 'json')).toThrow(/duplicate object key/);
    expect(() => parseCatalogDocument(doc('skills', [{ ...skill, extra: true }]), 'json', 'skills.json')).toThrow('skills.json');
    expect(() => loadCatalogSnapshot([{ format: 'json', text: doc('personas', [{ ...persona, requiredSkillIds: ['missing'] }]) }])).toThrow(/unknown skill reference/);
    expect(() => parseCatalogDocument('{bad', 'json')).toThrow(/malformed/);
    expect(() => parseCatalogDocument(doc('skills', [{ ...skill, apiKey: 'do-not-print' }]), 'json')).toThrow(/secret-shaped/);
  });
  it('changes identity when authority-bearing record values change', () => {
    const a = loadCatalogSnapshot([{ format: 'json', text: doc('skills', [skill]) }, { format: 'json', text: doc('models', [model]) }, { format: 'json', text: doc('personas', [persona]) }]);
    const b = loadCatalogSnapshot([{ format: 'json', text: doc('skills', [{ ...skill, version: '1.0.1' }]) }, { format: 'json', text: doc('models', [model]) }, { format: 'json', text: doc('personas', [persona]) }]);
    expect(a.snapshotId).not.toBe(b.snapshotId);
  });
  it('closes runtime normalization and validates skill dependency sets', () => {
    expect(() => normalizeCatalogDocuments([{ kind: '__proto__', version: '1.0.0', records: [] }])).toThrow(CatalogValidationError);
    expect(() => normalizeCatalogDocuments([{ kind: 'skills', version: '1.0.0', records: [{ ...skill, prerequisites: ['missing'] }] }])).toThrow(/skills\.records\[0\]\.prerequisites\[0\]/);
    expect(() => loadCatalogSnapshot([{ format: 'json', text: doc('skills', [{ ...skill, prerequisites: ['lint', 'lint'] }]) }])).toThrow(/duplicate reference/);
  });
  it('bounds hostile inputs and exposes all digest material', () => {
    let nested: unknown = null; for (let i = 0; i < 140; i++) nested = { x: nested };
    const deep = JSON.stringify({ kind: 'skills', version: '1.0.0', records: [], extra: nested });
    expect(() => parseCatalogDocument(deep, 'json')).toThrow(CatalogValidationError);
    expect(() => parseCatalogDocument(JSON.stringify({ kind: 'skills', version: '1.0.0', records: [{ ...skill, description: 'sk_live_12345678901234567890' }] }), 'json', 'bad\nsource')).toThrow(/bad_source/);
    const snapshot = loadCatalogSnapshot([{ format: 'json', text: doc('skills', [skill]) }]);
    const { snapshotId, ...payload } = snapshot;
    expect(snapshot.recordVersions).toEqual(['1.0.0']);
    expect(snapshotId).toBe(createHash('sha256').update(canonicalizeCatalog(payload)).digest('hex'));
  });
  it('deep-freezes nested authority values and keeps source-aware redaction', () => {
    const source = { ...skill, positiveExamples: ['nested'] };
    const snapshot = loadCatalogSnapshot([{ format: 'json', text: doc('skills', [source]) }]);
    source.positiveExamples[0] = 'mutated';
    expect(snapshot.skills[0].positiveExamples[0]).toBe('nested');
    expect(Object.isFrozen(snapshot.skills[0].positiveExamples)).toBe(true);
    expect(() => ((snapshot.skills[0].positiveExamples as string[])[0] = 'blocked')).toThrow();
    const modelSnapshot = loadCatalogSnapshot([{ format: 'json', text: doc('models', [model]) }]);
    expect(Object.isFrozen(modelSnapshot.models[0].cost)).toBe(true);
    expect(() => ((modelSnapshot.models[0].cost as { output: number }).output = 99)).toThrow();
    const secret = JSON.stringify({ kind: 'skills', version: '1.0.0', records: [{ ...skill, apiKey: 'sk_live_123456789012' }] });
    expect(() => parseCatalogDocument(secret, 'json', 'secrets.json')).toThrow(/secrets\.json/);
    expect(() => parseCatalogDocument(secret, 'json', 'secrets.json')).not.toThrow(/sk_live/);
  });
  it('binds document versions to their authority-bearing kind', () => {
    const skills = doc('skills', [skill]);
    const models = doc('models', [model]);
    const a = loadCatalogSnapshot([{ format: 'json', text: skills }, { format: 'json', text: models }]);
    const b = loadCatalogSnapshot([{ format: 'json', text: JSON.stringify({ kind: 'skills', version: '2.0.0', records: [skill] }) }, { format: 'json', text: models }]);
    expect(a.snapshotId).not.toBe(b.snapshotId);
    expect(a.documentVersions).toEqual([{ kind: 'models', version: '1.0.0' }, { kind: 'skills', version: '1.0.0' }]);
  });
  it('rejects credential URLs, bearer values, relative private paths, and unsafe formats', () => {
    for (const value of ['https://user:pass@example.test/repo', 'Authorization: Bearer abcdefghijkl', './private/config']) {
      expect(() => parseCatalogDocument(doc('skills', [{ ...skill, description: value }]), 'json', '/home/agent/.env')).toThrow(/secret-shaped/);
    }
    expect(() => parseCatalogDocument(doc('skills', [skill]), 'toml' as never)).toThrow(CatalogValidationError);
    expect(() => loadCatalogSnapshot(null as never)).toThrow(CatalogValidationError);
    expect(() => normalizeCatalogDocuments(Array.from({ length: 257 }, () => ({ kind: 'skills', version: '1.0.0', records: [] })))).toThrow(/document limit/);
  });
  it('enforces the aggregate byte budget on direct normalization and normalizes hostile accessors', () => {
    const records = (count: number) => Array.from({ length: count }, (_, i) => ({ ...skill, id: `bounded-${i}`, description: 'x'.repeat(99_000) }));
    expect(normalizeCatalogDocuments([{ kind: 'skills', version: '1.0.0', records: records(79) }]).skills).toHaveLength(79);
    expect(() => normalizeCatalogDocuments([{ kind: 'skills', version: '1.0.0', records: records(81) }])).toThrow(/byte limit/);
    expect(() => normalizeCatalogDocuments([{ get kind() { throw new Error('attacker-controlled accessor'); } }])).toThrow(CatalogValidationError);
    expect(() => normalizeCatalogDocuments([{ get kind() { throw new Error('attacker-controlled accessor'); } }])).not.toThrow(/attacker-controlled/);
    expect(() => loadCatalogSnapshot([{ get text() { throw new Error('attacker-controlled source'); }, format: 'json' } as never])).toThrow(CatalogValidationError);
  });
  it('accepts ordinary slash text while rejecting contextual repository paths', () => {
    for (const description of ['foo/bar', 'ordinary/path-like text', 'input/output mapping', 'text/plain']) {
      expect((parseCatalogDocument(doc('skills', [{ ...skill, description }]), 'json').records[0] as any).description).toBe(description);
    }
    for (const description of ['owner/private-repository', 'example.test/owner/private-repository']) {
      expect(() => parseCatalogDocument(doc('skills', [{ ...skill, description }]), 'json')).toThrow(/secret-shaped/);
    }
  });
  it('uses byte-identical aggregate accounting for escaped direct and loaded documents', () => {
    const record = { ...skill, description: 'quote " — multibyte punctuation' };
    const runtime = [{ kind: 'skills' as const, version: '1.0.0', records: [record] }];
    const source = [{ format: 'json' as const, text: JSON.stringify(runtime[0]) }];
    expect(normalizeCatalogDocuments(runtime).snapshotId).toBe(loadCatalogSnapshot(source).snapshotId);
  });
  it('scans allowed slash-bearing values linearly at ordinary and near-limit sizes', () => {
    for (const size of [1_000, 10_000, 99_000]) {
      const started = performance.now();
      expect(() => parseCatalogDocument(doc('skills', [{ ...skill, description: 'x'.repeat(size) + '/safe' }]), 'json')).not.toThrow();
      expect(performance.now() - started).toBeLessThan(2_000);
    }
    const records = Array.from({ length: 80 }, (_, i) => ({ ...skill, id: `large-${i}`, description: 'x'.repeat(98_000) + '/safe' }));
    const started = performance.now();
    expect(normalizeCatalogDocuments([{ kind: 'skills', version: '1.0.0', records }]).skills).toHaveLength(80);
    expect(performance.now() - started).toBeLessThan(10_000);
  }, 20_000);
  it('redacts hostile canonicalization accessors', () => {
    expect(() => canonicalizeCatalog({ get schemaVersion() { throw new Error('attacker-controlled getter'); } } as never)).toThrow(CatalogValidationError);
    expect(() => canonicalizeCatalog(new Proxy({}, { ownKeys: () => { throw new Error('attacker-controlled ownKeys'); } }) as never)).toThrow(CatalogValidationError);
    expect(() => canonicalizeCatalog(new Proxy({}, { ownKeys: () => { throw new Error('attacker-controlled ownKeys'); } }) as never)).not.toThrow(/attacker-controlled/);
  });
});
