import { describe, expect, it } from 'vitest';
import { TypeSafeDecisionService, typeSafeConfig, TYPESAFE_SDK_INTEGRITY, TYPESAFE_SDK_LICENSE, TYPESAFE_SDK_VERSION } from '../src/decisions/index.js';
import { correlationKey, projectSystemOneRequest } from '../src/decisions/typesafe-wire.js';

describe('hermetic TypeSafe contract', () => {
  it('pins the audited package identity without constructing a client', () => {
    expect([TYPESAFE_SDK_VERSION, TYPESAFE_SDK_LICENSE, TYPESAFE_SDK_INTEGRITY]).toEqual([
      '0.6.0', 'MIT', 'sha512-IddX+Q0XM+VagOUZFeP7wZjaO4SHMdvnh2zEBdrZZnXedWI3BNK1lKhMx3ayrkFWvVLbVcUHJy6AVZlY+e6Jaw==',
    ]);
    expect(typeSafeConfig({ model: { kind: 'pinned', value: 'jev-1.13.0' } }).model).toEqual({ kind: 'pinned', value: 'jev-1.13.0' });
  });

  it('projects only the exact System One keys and preserves ordering', () => {
    const request: any = { state: { text: 'synthetic' }, questions: {
      route: { kind: 'choice', instructions: 'Choose', options: { a: 'A', b: 'B' } },
      fit: { kind: 'score', instructions: 'Rate', levels: ['low', 'high'] },
      ok: { kind: 'noul', instructions: 'Does it fit?' },
    } };
    expect(projectSystemOneRequest(request, 'jev-1.13.0')).toEqual({ model: 'jev-1.13.0', state: request.state, questions: {
      route: { type: 'choice', instructions: 'Choose', criteria: { a: 'A', b: 'B' } },
      fit: { type: 'score', instructions: 'Rate', criteria: ['low', 'high'] },
      ok: { type: 'noul', instructions: 'Does it fit?' },
    } });
  });

  it('evaluates a correlated choice through shared admission without a live client', async () => {
    const request: any = {
      decisionId: 'decision-1', runId: 'run-1', stage: 'persona', round: 1,
      inputClasses: ['settled_prompt'], logicalCallId: 'call-1', state: { text: 'x' },
      questions: { route: { kind: 'choice', instructions: 'Choose', options: { a: 'A', b: 'B' } } },
      catalogSnapshotId: 'catalog-1', policyVersion: 'policy-1', deadlineMs: 1000, retryBudget: 0,
      requestedModel: 'jev-1.13.0', providerMode: 'typesafe-jev', stateHash: 'a'.repeat(64),
      questionSetHash: 'b'.repeat(64), providerContractHash: 'c'.repeat(64), sdkVersion: 'd'.repeat(64), responseHash: '0'.repeat(64),
    };
    let calls = 0;
    const service = new TypeSafeDecisionService(async (payload, options) => {
      calls++; expect(options.retry.maxRetries).toBe(0); expect(Object.keys(payload.questions)[0]).toContain('route::');
      return { body: { model: 'jev-1.13.0', answers: { [correlationKey(request, 'route')]: { probabilities: { a: 1, b: 0 } } } } };
    }, { model: { kind: 'pinned', value: 'jev-1.13.0' } });
    const result = await service.evaluate(request);
    expect(result.answers.route).toMatchObject({ kind: 'choice', winner: 'a', distribution: { a: 1, b: 0 } });
    expect(calls).toBe(1);
  });

  it('rejects extra provider probability keys and over-cap retry budgets before transport', async () => {
    expect(() => typeSafeConfig({ model: { kind: 'pinned', value: 'jev-1.13.0' }, backoffMs: Number.NaN })).toThrow();
    const request: any = { decisionId: 'd', runId: 'r', stage: 'persona', round: 1, inputClasses: ['settled_prompt'], logicalCallId: 'c', state: {}, questions: { q: { kind: 'choice', instructions: 'q', options: { a: 'a', b: 'b' } } }, catalogSnapshotId: 'cat', policyVersion: 'p', deadlineMs: 1000, retryBudget: 4, requestedModel: 'jev-1.13.0', providerMode: 'typesafe-jev', stateHash: 'a'.repeat(64), questionSetHash: 'b'.repeat(64), providerContractHash: 'c'.repeat(64), sdkVersion: 'd'.repeat(64), responseHash: '0'.repeat(64) };
    let calls = 0;
    const service = new TypeSafeDecisionService(async () => { calls++; return { body: {} }; }, { model: { kind: 'pinned', value: 'jev-1.13.0' } });
    await expect(service.evaluate(request)).rejects.toMatchObject({ code: 'BUDGET_EXCEEDED' });
    expect(calls).toBe(0);
  });

  it('detaches and freezes the configured model authority', () => {
    const model = { kind: 'pinned' as const, value: 'jev-1.13.0' };
    const config = typeSafeConfig({ model });
    model.value = 'jev-9.9.9';
    expect(config.model.value).toBe('jev-1.13.0');
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.model)).toBe(true);
  });

  it('rejects closed-answer violations and non-finite optional fields', async () => {
    const request: any = { decisionId: 'd', runId: 'r', stage: 'persona', round: 1, inputClasses: ['settled_prompt'], logicalCallId: 'c', state: {}, questions: { q: { kind: 'choice', instructions: 'q', options: { a: 'a' } } }, catalogSnapshotId: 'cat', policyVersion: 'p', deadlineMs: 1000, retryBudget: 0, requestedModel: 'jev-1.13.0', providerMode: 'typesafe-jev', stateHash: 'a'.repeat(64), questionSetHash: 'b'.repeat(64), providerContractHash: 'c'.repeat(64), sdkVersion: 'd'.repeat(64), responseHash: '0'.repeat(64) };
    for (const answer of [{ probabilities: { a: 1 }, extra: true }, { probabilities: { a: 1 }, confidence: Number.NaN }]) {
      const service = new TypeSafeDecisionService(async () => ({ body: { model: 'jev-1.13.0', answers: { [correlationKey(request, 'q')]: answer } } }), { model: { kind: 'pinned', value: 'jev-1.13.0' } });
      await expect(service.evaluate(request)).rejects.toMatchObject({ code: 'PROVIDER_MALFORMED_RESPONSE' });
    }
  });

  it('normalizes hostile thrown accessors to a fixed unavailable error', async () => {
    const thrown = Object.defineProperty({}, 'status', { enumerable: true, get: () => { throw new Error('SECRET-ACCESSOR-CANARY'); } });
    const service = new TypeSafeDecisionService(async () => Promise.reject(thrown), { model: { kind: 'pinned', value: 'jev-1.13.0' } });
    const request: any = { decisionId: 'd', runId: 'r', stage: 'persona', round: 1, inputClasses: ['settled_prompt'], logicalCallId: 'c', state: {}, questions: { q: { kind: 'choice', instructions: 'q', options: { a: 'a' } } }, catalogSnapshotId: 'cat', policyVersion: 'p', deadlineMs: 1000, retryBudget: 0, requestedModel: 'jev-1.13.0', providerMode: 'typesafe-jev', stateHash: 'a'.repeat(64), questionSetHash: 'b'.repeat(64), providerContractHash: 'c'.repeat(64), sdkVersion: 'd'.repeat(64), responseHash: '0'.repeat(64) };
    await expect(service.evaluate(request)).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });
  });
});
