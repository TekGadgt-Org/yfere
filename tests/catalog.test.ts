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
});
