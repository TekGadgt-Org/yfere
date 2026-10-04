import { describe, expect, it } from 'vitest';
import { RecordedDecisionService, fixtureHash, questionSetHash, responseHash, stateHash, type RecordedFixture } from '../src/decisions/index.js';

const makeFixture = (): RecordedFixture => {
  const request: any = { decisionId: 'd', runId: 'r', stage: 'model', round: 1, inputClasses: ['settled_prompt'], logicalCallId: 'c', state: { safe: true }, questions: { q: { kind: 'choice', instructions: 'pick', options: { a: 'A', b: 'B' } } }, catalogSnapshotId: 'catalog', policyVersion: 'policy', deadlineMs: 1000, retryBudget: 0, requestedModel: 'model', providerMode: 'recorded' };
  request.stateHash = stateHash(request.state); request.questionSetHash = questionSetHash(request.questions); request.providerContractHash = '1'.repeat(64); request.sdkVersion = '2'.repeat(64);
  const response: any = { decisionId: 'd', logicalCallId: 'c', provider: 'recorded', requestedModel: 'model', answers: { q: { kind: 'choice', winner: 'a', distribution: { a: 1, b: 0 } } }, elapsedMs: 1, attempts: 1, provenance: 'synthetic', providerContractHash: request.providerContractHash, sdkVersion: request.sdkVersion };
  response.responseHash = responseHash(response); request.responseHash = response.responseHash; request.fixtureVersion = 'yfere-recorded/v1';
  const fixture: any = { ...request, response, provenance: 'synthetic' }; fixture.fixtureHash = fixtureHash(fixture); request.fixtureHash = fixture.fixtureHash;
  return fixture;
};

describe('recorded decision boundary', () => {
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
  it('enforces copied byte admission and fatal UTF-8 before parsing', () => {
    const fixture = makeFixture();
    const bytes = new TextEncoder().encode(JSON.stringify([fixture]));
    expect(() => new RecordedDecisionService(new Uint8Array([0xff]))).toThrow();
    const oversized = new Uint8Array(32_000_001); oversized.set(bytes);
    expect(() => new RecordedDecisionService(oversized)).toThrow();
    expect(() => new RecordedDecisionService(bytes)).not.toThrow();
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
