import { admitDecisionResponse } from './admit-response.js';
import { hashManifest } from './canonical.js';
import { typedError, DecisionServiceError } from './errors.js';
import type { DecisionRequest, DecisionResponse, DecisionService } from './contracts.js';
import { typeSafeConfig, type TypeSafeConfig } from './typesafe-config.js';
import { correlationKey, projectCorrelatedRequest, type TypeSafeTransport, type TypeSafeTransportResult } from './typesafe-wire.js';

export const TYPESAFE_MAX_PHYSICAL_ATTEMPTS = 4 as const;
const now = () => typeof performance !== 'undefined' ? performance.now() : Date.now();
const ownKeys = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const sameKeys = (a: object, b: object) => { const ak = Object.keys(a).sort(); const bk = Object.keys(b).sort(); return ak.length === bk.length && ak.every((k, i) => k === bk[i]); };
const fail = () => { throw typedError('PROVIDER_MALFORMED_RESPONSE', 'mapping'); };
const dataObject = (value: unknown, required: readonly string[], optional: readonly string[] = []) => {
  if (!ownKeys(value)) fail();
  const names = Object.getOwnPropertyNames(value);
  if (names.some(name => !required.includes(name) && !optional.includes(name)) || required.some(name => !names.includes(name))) fail();
  const out: Record<string, unknown> = {};
  for (const key of names) { const descriptor = Object.getOwnPropertyDescriptor(value, key); if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) fail(); out[key] = (descriptor as PropertyDescriptor & { value: unknown }).value; }
  return out;
};

const race = <T>(work: Promise<T>, signal: AbortSignal, deadline: number, onDeadline: () => void): Promise<T> => new Promise((resolve, reject) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const finish = (fn: (value?: any) => void, value?: any) => { if (timer) clearTimeout(timer); signal.removeEventListener('abort', onAbort); fn(value); };
  const onAbort = () => finish(reject, typedError('CANCELLED', 'transport'));
  if (signal.aborted) return onAbort();
  const remaining = deadline - now();
  if (remaining <= 0) { onDeadline(); return reject(typedError('DEADLINE_EXCEEDED', 'transport')); }
  timer = setTimeout(() => { onDeadline(); finish(reject, typedError('DEADLINE_EXCEEDED', 'transport')); }, remaining);
  signal.addEventListener('abort', onAbort, { once: true });
  work.then(v => finish(resolve, v), e => finish(reject, e));
});
const sleep = (ms: number, signal: AbortSignal, deadline: number, onDeadline: () => void) => new Promise<void>((resolve, reject) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const remaining = deadline - now(); const duration = Math.min(Math.max(0, ms), Math.max(0, remaining));
  const cleanup = () => { if (timer) clearTimeout(timer); signal.removeEventListener('abort', onAbort); };
  const onAbort = () => { cleanup(); reject(typedError('CANCELLED', 'transport')); };
  if (signal.aborted) return onAbort();
  if (remaining <= 0) { onDeadline(); return reject(typedError('DEADLINE_EXCEEDED', 'transport')); }
  timer = setTimeout(() => { cleanup(); if (remaining <= ms) { onDeadline(); reject(typedError('DEADLINE_EXCEEDED', 'transport')); } else resolve(); }, duration);
  signal.addEventListener('abort', onAbort, { once: true });
});
const errorFacts = (error: unknown): { status?: number; name?: string; code?: string } | undefined => {
  try { if (!error || typeof error !== 'object') return {}; const result: { status?: number; name?: string; code?: string } = {}; for (const key of ['status', 'name', 'code'] as const) { const d = Object.getOwnPropertyDescriptor(error, key); if (d && !('value' in d)) return undefined; if (d && d.value !== undefined) (result as any)[key] = d.value; } return result; } catch { return undefined; }
};
const providerError = (status: number | undefined, phase = 'transport', error?: unknown): DecisionServiceError => { const facts = errorFacts(error); if (error !== undefined && facts === undefined) return typedError('PROVIDER_UNAVAILABLE', phase); const timeout = status === 408 || facts?.name === 'TimeoutError' || facts?.code === 'ETIMEDOUT'; return typedError(status === 401 ? 'PROVIDER_AUTH' : status === 422 ? 'PROVIDER_INVALID_REQUEST' : status === 429 ? 'PROVIDER_RATE_LIMITED' : status === 529 ? 'PROVIDER_OVERLOADED' : timeout ? 'PROVIDER_TIMEOUT' : 'PROVIDER_UNAVAILABLE', phase); };
const retryable = (e: unknown) => e instanceof DecisionServiceError && ['PROVIDER_RATE_LIMITED', 'PROVIDER_OVERLOADED', 'PROVIDER_TIMEOUT', 'PROVIDER_UNAVAILABLE'].includes(e.code);
const safeRequestId = (id: unknown) => typeof id === 'string' && id.length <= 64 && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id) && !/(?:bearer|secret|token|key|pass|https?:|[\\/])/i.test(id) ? id : undefined;

const wireAnswers = (body: unknown, request: DecisionRequest) => {
  if (!ownKeys(body)) fail();
  const wireBody = dataObject(body, ['model', 'answers']);
  const answerMap = dataObject(wireBody.answers, Object.keys(wireBody.answers as object));
  const expected = Object.keys(request.questions).map(key => correlationKey(request, key));
  if (!sameKeys(answerMap, Object.fromEntries(expected.map(k => [k, true])))) fail();
  const questions = request.questions as Record<string, any>;
  const answers: Record<string, unknown> = {};
  for (const [key, question] of Object.entries(questions)) {
    const wireKey = correlationKey(request, key); const raw = question.kind === 'choice' ? dataObject(answerMap[wireKey], ['probabilities'], ['confidence']) : question.kind === 'score' ? dataObject(answerMap[wireKey], ['probabilities', 'legend', 'score'], ['confidence']) : dataObject(answerMap[wireKey], ['noul']);
    if (question.kind === 'choice') {
      const probabilities = dataObject(raw.probabilities, Object.keys(question.options));
      if (!sameKeys(probabilities, question.options)) fail();
      const distribution = Object.fromEntries(Object.keys(question.options).map(id => { const n = probabilities[id]; if (typeof n !== 'number' || !Number.isFinite(n)) fail(); return [id, n]; }));
      const winner = Object.keys(distribution).reduce((a, b) => distribution[b]! > distribution[a]! ? b : a);
      if (raw.confidence !== undefined && (typeof raw.confidence !== 'number' || !Number.isFinite(raw.confidence))) fail();
      answers[key] = { kind: 'choice', winner, distribution, ...(raw.confidence === undefined ? {} : { confidence: raw.confidence }) };
    } else if (question.kind === 'score') {
      const probabilities = dataObject(raw.probabilities, question.levels.map((_: string, i: number) => String(i))), legend = dataObject(raw.legend, question.levels.map((_: string, i: number) => String(i)));
      if (!sameKeys(probabilities, Object.fromEntries(question.levels.map((_: string, i: number) => [String(i), true]))) || !sameKeys(legend, Object.fromEntries(question.levels.map((_: string, i: number) => [String(i), true])))) fail();
      const distribution = Object.fromEntries(question.levels.map((id: string, i: number) => { if (legend[String(i)] !== id || typeof probabilities[String(i)] !== 'number' || !Number.isFinite(probabilities[String(i)] as number)) fail(); return [id, probabilities[String(i)]]; }));
      const level = question.levels.reduce((a: string, b: string) => distribution[b]! > distribution[a]! ? b : a);
      if (typeof raw.score !== 'number' || !Number.isFinite(raw.score)) fail();
      if (raw.confidence !== undefined && (typeof raw.confidence !== 'number' || !Number.isFinite(raw.confidence))) fail();
      answers[key] = { kind: 'score', level, distribution, expected: raw.score, ...(raw.confidence === undefined ? {} : { confidence: raw.confidence }) };
    } else { if (typeof raw.noul !== 'number' || !Number.isFinite(raw.noul)) fail(); answers[key] = { kind: 'noul', value: raw.noul }; }
  }
  return answers;
};

export class TypeSafeDecisionService implements DecisionService {
  readonly providerMode = 'typesafe-jev' as const;
  readonly contractIdentity = 'typesafe-jev/v1' as const;
  readonly config: Readonly<ReturnType<typeof typeSafeConfig>>;
  get requestedModel() { return this.config.model.value; }
  #transport: TypeSafeTransport;
  constructor(transport: TypeSafeTransport, config: TypeSafeConfig) { this.#transport = transport; this.config = typeSafeConfig(config); }
  async evaluate(request: DecisionRequest, callerSignal = new AbortController().signal): Promise<DecisionResponse> {
    if (request.providerMode !== this.providerMode || request.requestedModel !== this.config.model.value) throw typedError('INVALID_INPUT', 'model');
    if (request.retryBudget > TYPESAFE_MAX_PHYSICAL_ATTEMPTS - 1) throw typedError('BUDGET_EXCEEDED', 'request');
    const controller = new AbortController(); const forward = () => controller.abort();
    callerSignal.addEventListener('abort', forward, { once: true });
    const deadline = now() + request.deadlineMs; let attempts = 0; let last: unknown;
    try {
      while (attempts <= request.retryBudget && attempts < (this.config.maxAttempts ?? TYPESAFE_MAX_PHYSICAL_ATTEMPTS)) {
        if (callerSignal.aborted) throw typedError('CANCELLED', 'request'); if (now() >= deadline) throw typedError('DEADLINE_EXCEEDED', 'request');
        attempts++;
        try {
          const result: TypeSafeTransportResult = await race(this.#transport(projectCorrelatedRequest(request, this.config.model.value), { signal: controller.signal, retry: { maxRetries: 0 } }), callerSignal, deadline, () => controller.abort());
          if (result.status !== undefined && result.status >= 400) throw providerError(result.status);
          const body = result.body;
          if (!ownKeys(body) || typeof (body as any).model !== 'string') fail();
          const model = (body as any).model as string;
          if (this.config.model.kind === 'pinned' && model !== this.config.model.value) fail();
          if (this.config.model.kind === 'alias' && !/^jev-[0-9]+\.[0-9]+\.[0-9]+$/.test(model)) fail();
          const answers = wireAnswers(body, request);
          const requestId = safeRequestId(result.requestId);
          const response = { decisionId: request.decisionId, logicalCallId: request.logicalCallId, provider: 'typesafe-jev', requestedModel: request.requestedModel, returnedModel: model, answers, ...(requestId ? { requestId } : {}), elapsedMs: Math.max(0, Math.floor(now() - (deadline - request.deadlineMs))), attempts, provenance: 'synthetic' as const, providerContractHash: request.providerContractHash, sdkVersion: request.sdkVersion } as DecisionResponse;
          response.responseHash = hashManifest('yfere/response/v1', Object.fromEntries(Object.entries(response).filter(([key]) => key !== 'responseHash')));
          return admitDecisionResponse(request, response);
        } catch (error) {
          if (callerSignal.aborted || (error instanceof DecisionServiceError && error.code === 'CANCELLED')) throw typedError('CANCELLED', 'transport');
          if (error instanceof DecisionServiceError && error.code === 'DEADLINE_EXCEEDED') throw error;
          last = error instanceof DecisionServiceError ? error : providerError(errorFacts(error)?.status, 'transport', error);
          if (!retryable(last) || attempts > request.retryBudget || attempts >= (this.config.maxAttempts ?? TYPESAFE_MAX_PHYSICAL_ATTEMPTS)) throw last;
          await sleep(Math.min(this.config.maxBackoffMs!, this.config.backoffMs! * 2 ** (attempts - 1)), callerSignal, deadline, () => controller.abort());
        }
      }
      throw last ?? typedError('BUDGET_EXCEEDED', 'transport');
    } finally { callerSignal.removeEventListener('abort', forward); controller.abort(); }
  }
}
