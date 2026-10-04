import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RecordedDecisionService, answerSchema, canonical, decisionRequestSchema, fixtureHash, hashManifest, questionSchema, questionSetHash, responseHash, stateHash, type RecordedFixture } from '../src/decisions/index.js';

const makeFixture = (): RecordedFixture => {
  const request: any = { decisionId: 'd', runId: 'r', stage: 'model', round: 1, inputClasses: ['settled_prompt'], logicalCallId: 'c', state: { safe: true }, questions: { q: { kind: 'choice', instructions: 'pick', options: { a: 'A', b: 'B' } } }, catalogSnapshotId: 'catalog', policyVersion: 'policy', deadlineMs: 1000, retryBudget: 0, requestedModel: 'model', providerMode: 'recorded' };
  request.stateHash = stateHash(request.state); request.questionSetHash = questionSetHash(request.questions); request.providerContractHash = '1'.repeat(64); request.sdkVersion = '2'.repeat(64);
  const response: any = { decisionId: 'd', logicalCallId: 'c', provider: 'recorded', requestedModel: 'model', answers: { q: { kind: 'choice', winner: 'a', distribution: { a: 1, b: 0 } } }, elapsedMs: 1, attempts: 1, provenance: 'synthetic', providerContractHash: request.providerContractHash, sdkVersion: request.sdkVersion };
  response.responseHash = responseHash(response); request.responseHash = response.responseHash; request.fixtureVersion = 'yfere-recorded/v1';
  const fixture: any = { ...request, response, provenance: 'synthetic' }; fixture.fixtureHash = fixtureHash(fixture); request.fixtureHash = fixture.fixtureHash;
  return fixture;
};

const rekey = (source: RecordedFixture, n: number): RecordedFixture => {
  const f: any = structuredClone(source);
  f.decisionId = `d-${n}`; f.runId = `r-${n}`; f.logicalCallId = `c-${n}`;
  f.response.decisionId = f.decisionId; f.response.logicalCallId = f.logicalCallId;
  f.response.responseHash = responseHash(f.response); f.responseHash = f.response.responseHash;
  f.fixtureHash = fixtureHash(f);
  return f;
};

describe('recorded decision boundary', () => {
  it('matches the independently pinned canonical/hash golden vector', () => {
    expect(canonical({ b: 'x', a: 1 })).toBe('{"a":1,"b":"x"}');
    expect(hashManifest('golden', { b: 'x', a: 1 })).toBe('871b7ea57caf72b25fbab9c46aa88e59a37086b62c67cf631014b839ab9ad650');
  });
  it('replays an admitted fixture and returns a detached response', async () => {
    const fixture = makeFixture(); const service = new RecordedDecisionService(new TextEncoder().encode(JSON.stringify([fixture])));
    const { response: _response, provenance: _provenance, ...request } = fixture;
    const result = await service.evaluate(request);
    expect(result.answers.q).toEqual({ kind: 'choice', winner: 'a', distribution: { a: 1, b: 0 } });
    (result.answers.q as any).winner = 'b';
    await expect(service.evaluate(request)).resolves.toMatchObject({ answers: { q: { winner: 'a' } } });
  });
  it('rejects a changed valid request as non-replayable and preserves atomic publication', () => {
    const fixture = makeFixture(); const service = new RecordedDecisionService(new TextEncoder().encode(JSON.stringify([fixture])));
    expect(() => new RecordedDecisionService(new TextEncoder().encode(JSON.stringify([fixture, structuredClone(fixture)])))).toThrow();
    const { response: _response, provenance: _provenance, ...request } = fixture;
    return expect(service.evaluate({ ...request, runId: 'other' })).rejects.toMatchObject({ code: 'NON_REPLAYABLE' });
  });
  it('preserves dangerous dynamic keys through replay', async () => {
    const fixture = makeFixture();
    expect(() => new RecordedDecisionService(JSON.stringify([fixture]) as never)).toThrow();
    const dangerous: any = Object.create(null); for (const key of ['__proto__', 'constructor', 'prototype']) dangerous[key] = { kind: 'choice', instructions: 'x', options: { a: 'A' } };
    const changed: any = { ...fixture, questions: dangerous, response: { ...fixture.response, answers: Object.fromEntries(Object.keys(dangerous).map((key) => [key, { kind: 'choice', winner: 'a', distribution: { a: 1 } }])) } };
    changed.questionSetHash = questionSetHash(changed.questions);
    changed.response.responseHash = responseHash(changed.response); changed.responseHash = changed.response.responseHash;
    changed.fixtureHash = fixtureHash(changed);
    const service = new RecordedDecisionService(new TextEncoder().encode(JSON.stringify([changed])));
    const { response: _response, provenance: _provenance, ...request } = changed;
    await expect(service.evaluate(request)).resolves.toMatchObject({ answers: { '__proto__': { winner: 'a' }, constructor: { winner: 'a' }, prototype: { winner: 'a' } } });
  });
  it('enforces the 256 UTF-16 code-unit bound on every dynamic record key', () => {
    const fixture = makeFixture();
    const valid = 'k'.repeat(256), invalid = 'k'.repeat(257);
    const question: any = (fixture.questions as any).q;
    const { response: _response, provenance: _provenance, ...request } = fixture as any;
    expect(questionSchema.safeParse({ ...question, options: { [valid]: 'A' } }).success).toBe(true);
    expect(questionSchema.safeParse({ ...question, options: { [invalid]: 'A' } }).success).toBe(false);
    expect(decisionRequestSchema.safeParse({ ...request, questions: { [valid]: question } }).success).toBe(true);
    expect(decisionRequestSchema.safeParse({ ...request, questions: { [invalid]: question } }).success).toBe(false);
    const answer: any = (fixture.response.answers as any).q;
    expect(answerSchema.safeParse({ ...answer, distribution: { [valid]: 1 } }).success).toBe(true);
    expect(answerSchema.safeParse({ ...answer, distribution: { [invalid]: 1 } }).success).toBe(false);
    expect(answerSchema.safeParse({ ...answer, distribution: { [valid]: 1 } }).success).toBe(true);
    expect(answerSchema.safeParse({ ...answer, distribution: { [invalid]: 1 } }).success).toBe(false);
  });
  it('enforces copied byte admission and fatal UTF-8 before parsing', () => {
    const fixture = makeFixture();
    const bytes = new TextEncoder().encode(JSON.stringify([fixture]));
    expect(() => new RecordedDecisionService(new Uint8Array([0xff]))).toThrow();
    const oversized = new Uint8Array(32_000_001); oversized.set(bytes);
    expect(() => new RecordedDecisionService(oversized)).toThrow();
    const service = new RecordedDecisionService(bytes);
    bytes.fill(0x20);
    const { response: _response, provenance: _provenance, ...request } = fixture;
    return expect(service.evaluate(request)).resolves.toMatchObject({ decisionId: 'd' });
  });
  it('accepts exactly 32,000,000 raw bytes from bytes and filesystem paths', () => {
    const fixture = makeFixture();
    const json = JSON.stringify([fixture]);
    const bytes = new Uint8Array(32_000_000);
    bytes.set(new TextEncoder().encode(json), 0);
    bytes.fill(0x20, new TextEncoder().encode(json).byteLength);
    expect(() => new RecordedDecisionService(bytes)).not.toThrow();
    const dir = mkdtempSync(join(tmpdir(), 'yfere-replay-'));
    const path = join(dir, 'fixtures.json');
    try {
      writeFileSync(path, bytes);
      expect(() => new RecordedDecisionService(path)).not.toThrow();
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
  it('rejects 32,000,001 raw bytes from bytes and filesystem paths before parsing', () => {
    const fixture = makeFixture();
    const json = new TextEncoder().encode(JSON.stringify([fixture]));
    const bytes = new Uint8Array(32_000_001);
    bytes.set(json, 0); bytes.fill(0x20, json.byteLength);
    expect(() => new RecordedDecisionService(bytes)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }));
    const dir = mkdtempSync(join(tmpdir(), 'yfere-replay-')); const path = join(dir, 'fixtures.json');
    try { writeFileSync(path, bytes); expect(() => new RecordedDecisionService(path)).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' })); }
    finally { rmSync(dir, { recursive: true, force: true }); }
  });
  it('accepts 1,024 fixtures and rejects 1,025 before inspecting a later invalid child', () => {
    const base = makeFixture();
    const fixtures = Array.from({ length: 1024 }, (_, n) => rekey(base, n));
    expect(() => new RecordedDecisionService(new TextEncoder().encode(JSON.stringify(fixtures)))).not.toThrow();
    expect(() => new RecordedDecisionService(new TextEncoder().encode(JSON.stringify([...fixtures, null])))).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }));
  });
  it('retains cancellation, deadline, and retry-budget precedence as typed failures', async () => {
    const fixture = makeFixture(); const service = new RecordedDecisionService(new TextEncoder().encode(JSON.stringify([fixture])));
    const { response: _response, provenance: _provenance, ...request } = fixture;
    const aborted = new AbortController(); aborted.abort();
    await expect(service.evaluate(request, aborted.signal)).rejects.toMatchObject({ code: 'CANCELLED' });
    await expect(service.evaluate({ ...request, deadlineMs: 0 })).rejects.toMatchObject({ code: 'DEADLINE_EXCEEDED' });
    const boundary: any = rekey(fixture, 8000); boundary.deadlineMs = 1; boundary.fixtureHash = fixtureHash(boundary);
    const boundaryService = new RecordedDecisionService(new TextEncoder().encode(JSON.stringify([boundary])));
    const { response: _boundaryResponse, provenance: _boundaryProvenance, ...boundaryRequest } = boundary;
    await expect(boundaryService.evaluate(boundaryRequest)).rejects.toMatchObject({ code: 'DEADLINE_EXCEEDED' });
    const overrun: any = rekey(fixture, 9000); overrun.response.attempts = 2;
    overrun.response.responseHash = responseHash(overrun.response); overrun.responseHash = overrun.response.responseHash; overrun.fixtureHash = fixtureHash(overrun);
    const retryService = new RecordedDecisionService(new TextEncoder().encode(JSON.stringify([overrun])));
    const { response: _retryResponse, provenance: _retryProvenance, ...retryRequest } = overrun;
    await expect(retryService.evaluate(retryRequest)).rejects.toMatchObject({ code: 'BUDGET_EXCEEDED' });
  });
  it('binds every replay pin and recomputes request content pins', async () => {
    const fixture = makeFixture(); const service = new RecordedDecisionService(new TextEncoder().encode(JSON.stringify([fixture])));
    const { response: _response, provenance: _provenance, ...request } = fixture;
    for (const field of ['stateHash','questionSetHash','providerContractHash','sdkVersion','responseHash','fixtureHash','fixtureVersion'] as const) {
      const changed: any = { ...request, [field]: field === 'fixtureVersion' ? 'yfere-recorded/v2' : 'f'.repeat(64) };
      await expect(service.evaluate(changed)).rejects.toMatchObject({ code: 'NON_REPLAYABLE' });
    }
    await expect(service.evaluate({ ...request, state: { safe: false } })).rejects.toMatchObject({ code: 'NON_REPLAYABLE' });
    await expect(service.evaluate({ ...request, questions: { other: request.questions.q } })).rejects.toMatchObject({ code: 'NON_REPLAYABLE' });
  });
  it('rejects malformed response semantics and malformed fixture items with typed errors', () => {
    const fixture = makeFixture();
    const malformed: any = structuredClone(fixture); malformed.response.answers.q.distribution = { a: 0.2, b: 0.2 }; malformed.response.responseHash = responseHash(malformed.response); malformed.responseHash = malformed.response.responseHash; malformed.fixtureHash = fixtureHash(malformed);
    expect(() => new RecordedDecisionService(new TextEncoder().encode(JSON.stringify([malformed])))).toThrow(/INVALID_DECISION|INVALID_INPUT/);
    for (const value of [null, 1, 'x', []]) expect(() => new RecordedDecisionService(new TextEncoder().encode(JSON.stringify([value])))).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }));
  });
});
