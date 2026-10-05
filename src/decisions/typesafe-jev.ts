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

const race = <T>(work: Promise<T>, signal: AbortSignal, deadline: number): Promise<T> => new Promise((resolve, reject) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const finish = (fn: (value?: any) => void, value?: any) => { if (timer) clearTimeout(timer); signal.removeEventListener('abort', onAbort); fn(value); };
  const onAbort = () => finish(reject, typedError('CANCELLED', 'transport'));
  if (signal.aborted) return onAbort();
  const remaining = deadline - now();
  if (remaining <= 0) return reject(typedError('DEADLINE_EXCEEDED', 'transport'));
  timer = setTimeout(() => { finish(reject, typedError('DEADLINE_EXCEEDED', 'transport')); }, remaining);
  signal.addEventListener('abort', onAbort, { once: true });
  work.then(v => finish(resolve, v), e => finish(reject, e));
});
const sleep = (ms: number, signal: AbortSignal, deadline: number) => race(new Promise<void>(resolve => setTimeout(resolve, Math.max(0, ms))), signal, deadline);
const statusOf = (error: unknown) => typeof error === 'object' && error !== null && 'status' in error && typeof (error as { status?: unknown }).status === 'number' ? (error as { status: number }).status : undefined;
const providerError = (status: number | undefined, phase = 'transport', error?: unknown): DecisionServiceError => typedError(status === 401 ? 'PROVIDER_AUTH' : status === 422 ? 'PROVIDER_INVALID_REQUEST' : status === 429 ? 'PROVIDER_RATE_LIMITED' : status === 529 ? 'PROVIDER_OVERLOADED' : status === 408 || (typeof error === 'object' && error !== null && ('name' in error && (error as any).name === 'TimeoutError' || 'code' in error && (error as any).code === 'ETIMEDOUT')) ? 'PROVIDER_TIMEOUT' : 'PROVIDER_UNAVAILABLE', phase);
const retryable = (e: unknown) => e instanceof DecisionServiceError && ['PROVIDER_RATE_LIMITED', 'PROVIDER_OVERLOADED', 'PROVIDER_TIMEOUT', 'PROVIDER_UNAVAILABLE'].includes(e.code);
const safeRequestId = (id: unknown) => typeof id === 'string' && id.length <= 64 && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id) && !/(?:bearer|secret|token|key|pass|https?:|[\\/])/i.test(id) ? id : undefined;

const wireAnswers = (body: unknown, request: DecisionRequest) => {
  if (!ownKeys(body) || !ownKeys((body as any).answers)) fail();
  const wireBody = body as any;
  const expected = Object.keys(request.questions).map(key => correlationKey(request, key));
  if (!sameKeys(wireBody.answers, Object.fromEntries(expected.map(k => [k, true])))) fail();
  const questions = request.questions as Record<string, any>;
  const answers: Record<string, unknown> = {};
  for (const [key, question] of Object.entries(questions)) {
    const wireKey = correlationKey(request, key); const raw = wireBody.answers[wireKey];
    if (!ownKeys(raw)) fail();
    if (question.kind === 'choice') {
      const probabilities = raw.probabilities;
      if (!ownKeys(probabilities) || !sameKeys(probabilities, question.options)) fail();
      const distribution = Object.fromEntries(Object.keys(question.options).map(id => { const n = probabilities[id]; if (typeof n !== 'number' || !Number.isFinite(n)) fail(); return [id, n]; }));
      const winner = Object.keys(distribution).reduce((a, b) => distribution[b]! > distribution[a]! ? b : a);
      answers[key] = { kind: 'choice', winner, distribution, ...(typeof raw.confidence === 'number' ? { confidence: raw.confidence } : {}) };
    } else if (question.kind === 'score') {
      const probabilities = raw.probabilities, legend = raw.legend;
      if (!ownKeys(probabilities) || !ownKeys(legend) || !sameKeys(probabilities, Object.fromEntries(question.levels.map((_: string, i: number) => [String(i), true]))) || !sameKeys(legend, Object.fromEntries(question.levels.map((_: string, i: number) => [String(i), true])))) fail();
      const distribution = Object.fromEntries(question.levels.map((id: string, i: number) => { if (legend[String(i)] !== id || typeof probabilities[String(i)] !== 'number' || !Number.isFinite(probabilities[String(i)] as number)) fail(); return [id, probabilities[String(i)]]; }));
      const level = question.levels.reduce((a: string, b: string) => distribution[b]! > distribution[a]! ? b : a);
      if (typeof raw.score !== 'number' || !Number.isFinite(raw.score)) fail();
      answers[key] = { kind: 'score', level, distribution, expected: raw.score, ...(typeof raw.confidence === 'number' ? { confidence: raw.confidence } : {}) };
    } else { if (typeof raw.noul !== 'number' || !Number.isFinite(raw.noul)) fail(); answers[key] = { kind: 'noul', value: raw.noul }; }
  }
  return answers;
};

export class TypeSafeDecisionService implements DecisionService {
  readonly providerMode = 'typesafe-jev' as const;
  readonly contractIdentity = 'typesafe-jev/v1' as const;
  readonly config: Readonly<ReturnType<typeof typeSafeConfig>>;
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
          const result: TypeSafeTransportResult = await race(this.#transport(projectCorrelatedRequest(request, this.config.model.value), { signal: controller.signal, retry: { maxRetries: 0 } }), callerSignal, deadline);
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
          last = error instanceof DecisionServiceError ? error : providerError(statusOf(error), 'transport', error);
          if (!retryable(last) || attempts > request.retryBudget || attempts >= (this.config.maxAttempts ?? TYPESAFE_MAX_PHYSICAL_ATTEMPTS)) throw last;
          await sleep(Math.min(this.config.maxBackoffMs!, this.config.backoffMs! * 2 ** (attempts - 1), Math.max(0, deadline - now())), callerSignal, deadline);
        }
      }
      throw last ?? typedError('BUDGET_EXCEEDED', 'transport');
    } finally { callerSignal.removeEventListener('abort', forward); controller.abort(); }
  }
}
