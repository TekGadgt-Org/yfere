import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RecordedDecisionService, answerSchema, canonical, decisionRequestSchema, decisionResponseSchema, fixtureHash, hashManifest, questionSchema, questionSetHash, responseHash, stateHash, REPLAY_LIMITS, type RecordedFixture } from '../src/decisions/index.js';

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

const exactCanonical = (size: number) => {
  const prefix = '{"padding":"', suffix = '"}';
  const value = { padding: 'x'.repeat(size - Buffer.byteLength(prefix + suffix)) };
  expect(Buffer.byteLength(canonical(value))).toBe(size);
  return value;
};

const malformedFixture = (change: (fixture: any) => void) => {
  const fixture: any = structuredClone(makeFixture());
  change(fixture);
  fixture.response.responseHash = responseHash(fixture.response);
  fixture.responseHash = fixture.response.responseHash;
  fixture.fixtureHash = fixtureHash(fixture);
  return fixture;
};

const sizedFixture = (target: number, seed: number, allowOverLimit = false): RecordedFixture => {
  const questions: any = Object.create(null), answers: any = Object.create(null);
  for (let q = 0; q < 64; q++) {
    const options: any = Object.create(null), distribution: any = Object.create(null);
    for (let o = 0; o < 128; o++) { options[`o${o}`] = 'x'.repeat(300); distribution[`o${o}`] = o === 0 ? 1 : 0; }
    questions[`q${q}`] = { kind: 'choice', instructions: 'pick', options };
    answers[`q${q}`] = { kind: 'choice', winner: 'o0', distribution };
  }
  const base: any = makeFixture();
  const request: any = { ...base, decisionId: `sized-${seed}`, runId: `sized-${seed}`, logicalCallId: `sized-${seed}`, questions, response: { ...base.response, decisionId: `sized-${seed}`, logicalCallId: `sized-${seed}`, answers } };
  let remaining = target - Buffer.byteLength(canonical(request));
  for (const question of Object.values(questions) as any[]) for (const key of Object.keys(question.options)) {
    const add = Math.min(212, Math.max(0, remaining)); question.options[key] += 'x'.repeat(add); remaining -= add;
    if (!remaining) break;
  }
  if (remaining) throw new Error(`sized fixture target unavailable: ${target}, remaining ${remaining}`);
  request.stateHash = stateHash(request.state); request.questionSetHash = questionSetHash(request.questions);
  request.response.responseHash = responseHash(request.response); request.responseHash = request.response.responseHash;
  if (!allowOverLimit) request.fixtureHash = fixtureHash(request);
  if (!allowOverLimit) expect(Buffer.byteLength(canonical(request))).toBe(target);
  return request;
};

const malformedScoreFixture = (change: (fixture: any) => void) => {
  const fixture: any = structuredClone(makeFixture());
  fixture.questions.q = { kind: 'score', instructions: 'pick', levels: ['low', 'high'] };
  fixture.response.answers.q = { kind: 'score', level: 'high', distribution: { low: 0, high: 1 }, expected: 1 };
  change(fixture);
  fixture.questionSetHash = questionSetHash(fixture.questions);
  fixture.response.responseHash = responseHash(fixture.response);
  fixture.responseHash = fixture.response.responseHash;
  fixture.fixtureHash = fixtureHash(fixture);
  return fixture;
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
    expect(decisionResponseSchema.safeParse({ ...fixture.response, answers: { [valid]: answer } }).success).toBe(true);
    expect(decisionResponseSchema.safeParse({ ...fixture.response, answers: { [invalid]: answer } }).success).toBe(false);
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

  it('retains exact canonical and state size boundaries', () => {
    expect(() => canonical(exactCanonical(REPLAY_LIMITS.canonicalBytes))).not.toThrow();
    expect(() => canonical(exactCanonical(REPLAY_LIMITS.canonicalBytes + 1))).toThrow();
    expect(() => stateHash(exactCanonical(REPLAY_LIMITS.stateBytes))).not.toThrow();
    expect(() => stateHash(exactCanonical(REPLAY_LIMITS.stateBytes + 1))).toThrow();
  });

  it('admits exact complete-fixture and aggregate canonical boundaries', () => {
    const complete = sizedFixture(REPLAY_LIMITS.canonicalBytes, 0);
    expect(() => new RecordedDecisionService(new TextEncoder().encode(JSON.stringify([complete])))).not.toThrow();
    expect(() => new RecordedDecisionService(new TextEncoder().encode(JSON.stringify([sizedFixture(REPLAY_LIMITS.canonicalBytes + 1, 1, true)])))).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }));
    const fixtures = Array.from({ length: 5 }, (_, seed) => sizedFixture(3_200_000, seed + 2));
    expect(() => new RecordedDecisionService(new TextEncoder().encode(JSON.stringify(fixtures)))).not.toThrow();
    const over = [...fixtures.slice(0, 4), sizedFixture(3_200_001, 7)];
    expect(() => new RecordedDecisionService(new TextEncoder().encode(JSON.stringify(over)))).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }));
  }, 30_000);

  it('retains depth, node, key, and array-slot boundaries', () => {
    const chain = (depth: number) => { let value: any = { leaf: true }; for (let i = 0; i < depth; i++) value = { next: value }; return value; };
    expect(() => canonical(chain(REPLAY_LIMITS.depth - 1))).not.toThrow();
    expect(() => canonical(chain(REPLAY_LIMITS.depth))).toThrow();
    expect(() => canonical(Array.from({ length: REPLAY_LIMITS.nodes - 1 }, () => null))).not.toThrow();
    expect(() => canonical(Array.from({ length: REPLAY_LIMITS.nodes }, () => null))).toThrow();
    const keys = (count: number) => Object.fromEntries(Array.from({ length: count }, (_, i) => [`k${i}`, null]));
    expect(() => canonical(keys(REPLAY_LIMITS.keys))).not.toThrow();
    expect(() => canonical(keys(REPLAY_LIMITS.keys + 1))).toThrow();
    expect(() => canonical(Array.from({ length: REPLAY_LIMITS.arraySlots }, () => null))).toThrow();
  });

  it('rejects a malformed fixture after traversing a payload larger than 2.5MB', () => {
    const fixture: any = malformedFixture((f) => { f.state = { padding: 'x'.repeat(2_500_000) }; });
    expect(() => new RecordedDecisionService(new TextEncoder().encode(JSON.stringify([fixture])))).toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }));
  });

  it('rejects score, distribution, answer cardinality, and provenance negatives', () => {
    const cases = [
      (f: any) => { f.response.answers.q = { kind: 'score', level: 'missing', distribution: { a: 2 }, expected: 0 }; },
      (f: any) => { f.response.answers.q = { kind: 'choice', winner: 'a', distribution: { a: -1, b: 2 } }; },
      (f: any) => { f.response.answers.q = { kind: 'choice', winner: 'a', distribution: { a: 0.2, b: 0.2 } }; },
      (f: any) => { f.response.answers.extra = f.response.answers.q; },
      (f: any) => { delete f.response.answers.q; },
      (f: any) => { f.provenance = 'recorded_live'; },
      (f: any) => { f.response.provenance = 'recorded_live'; },
    ];
    for (const change of cases) expect(() => new RecordedDecisionService(new TextEncoder().encode(JSON.stringify([malformedFixture(change)])))).toThrow();
    const scoreCases = [
      (f: any) => { f.response.answers.q.level = 'unknown'; },
      (f: any) => { f.response.answers.q.expected = 2; },
      (f: any) => { f.response.answers.q.distribution = { low: 0.2, high: 0.2 }; },
    ];
    for (const change of scoreCases) expect(() => new RecordedDecisionService(new TextEncoder().encode(JSON.stringify([malformedScoreFixture(change)])))).toThrow();
  });

  it('keeps the historical NUL tuple-collision pair distinct', async () => {
    const first: any = rekey(makeFixture(), 1); const second: any = rekey(makeFixture(), 2);
    first.runId = 'a'; first.logicalCallId = 'b\0c'; first.response.logicalCallId = first.logicalCallId; first.response.responseHash = responseHash(first.response); first.responseHash = first.response.responseHash; first.fixtureHash = fixtureHash(first);
    second.runId = 'a\0b'; second.logicalCallId = 'c'; second.response.logicalCallId = second.logicalCallId; second.response.responseHash = responseHash(second.response); second.responseHash = second.response.responseHash; second.fixtureHash = fixtureHash(second);
    const service = new RecordedDecisionService(new TextEncoder().encode(JSON.stringify([first, second])));
    const { response: _a, provenance: _pa, ...requestA } = first;
    const { response: _b, provenance: _pb, ...requestB } = second;
    await expect(service.evaluate(requestA)).resolves.toMatchObject({ decisionId: first.decisionId });
    await expect(service.evaluate(requestB)).resolves.toMatchObject({ decisionId: second.decisionId });
  });

  it('retains only the public package decision exports', async () => {
    const exports = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).exports;
    expect(exports).toEqual({ '.': './dist/index.js', './decisions': './dist/decisions/index.js' });
    expect(exports['./decisions/replay']).toBeUndefined();
    expect(exports['./decisions/contracts']).toBeUndefined();
  });
});
