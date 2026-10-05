import { admitDecisionResponse } from './admit-response.js';
import { hashManifest } from './canonical.js';
import { typedError, DecisionServiceError } from './errors.js';
import type { DecisionRequest, DecisionResponse, DecisionService } from './contracts.js';
import { typeSafeConfig, type TypeSafeConfig } from './typesafe-config.js';
import { projectSystemOneRequest, type TypeSafeTransport, type TypeSafeTransportResult } from './typesafe-wire.js';

const sleep = (ms: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => { if (ms <= 0) return resolve(); const timer = setTimeout(resolve, ms); const abort = () => { clearTimeout(timer); reject(typedError('CANCELLED', 'backoff')); }; if (signal.aborted) return abort(); signal.addEventListener('abort', abort, { once: true }); });
const cancelled = (signal: AbortSignal) => signal.aborted;
const providerError = (status: number | undefined, phase = 'transport'): DecisionServiceError => {
  const code = status === 401 ? 'PROVIDER_AUTH' : status === 422 ? 'PROVIDER_INVALID_REQUEST' : status === 429 ? 'PROVIDER_RATE_LIMITED' : status === 529 ? 'PROVIDER_OVERLOADED' : status && status >= 500 ? 'PROVIDER_UNAVAILABLE' : 'PROVIDER_UNAVAILABLE';
  return typedError(code, phase);
};
const retryable = (error: unknown) => error instanceof DecisionServiceError && ['PROVIDER_RATE_LIMITED', 'PROVIDER_OVERLOADED', 'PROVIDER_TIMEOUT', 'PROVIDER_UNAVAILABLE'].includes(error.code);
const wireAnswers = (body: any, request: DecisionRequest) => {
  if (!body || typeof body !== 'object' || !body.answers || typeof body.answers !== 'object' || Array.isArray(body.answers)) throw typedError('PROVIDER_MALFORMED_RESPONSE', 'mapping');
  const answers: Record<string, any> = {};
  for (const [key, question] of Object.entries(request.questions) as [string, any][]) {
    const raw = body.answers[key]; if (!raw || typeof raw !== 'object') throw typedError('PROVIDER_MALFORMED_RESPONSE', 'mapping');
    if (question.kind === 'choice') {
      const probabilities = raw.probabilities; if (!probabilities || typeof probabilities !== 'object') throw typedError('PROVIDER_MALFORMED_RESPONSE', 'mapping');
      const distribution = Object.fromEntries(Object.keys(question.options).map(id => { const n = probabilities[id]; if (typeof n !== 'number') throw typedError('PROVIDER_MALFORMED_RESPONSE', 'mapping'); return [id, n]; }));
      const winner = Object.keys(distribution).reduce((a, b) => distribution[b]! > distribution[a]! ? b : a);
      answers[key] = { kind: 'choice', winner, distribution, ...(typeof raw.confidence === 'number' ? { confidence: raw.confidence } : {}) };
    } else if (question.kind === 'score') {
      const probabilities = raw.probabilities, legend = raw.legend; if (!probabilities || !legend) throw typedError('PROVIDER_MALFORMED_RESPONSE', 'mapping');
      const distribution = Object.fromEntries(question.levels.map((id: string, i: number) => { if (legend[String(i)] !== id || typeof probabilities[String(i)] !== 'number') throw typedError('PROVIDER_MALFORMED_RESPONSE', 'mapping'); return [id, probabilities[String(i)]]; }));
      const level = question.levels.reduce((a: string, b: string) => distribution[b]! > distribution[a]! ? b : a);
      if (typeof raw.score !== 'number') throw typedError('PROVIDER_MALFORMED_RESPONSE', 'mapping');
      answers[key] = { kind: 'score', level, distribution, expected: raw.score, ...(typeof raw.confidence === 'number' ? { confidence: raw.confidence } : {}) };
    } else { if (typeof raw.noul !== 'number') throw typedError('PROVIDER_MALFORMED_RESPONSE', 'mapping'); answers[key] = { kind: 'noul', value: raw.noul }; }
  }
  if (Object.keys(body.answers).length !== Object.keys(request.questions).length) throw typedError('PROVIDER_MALFORMED_RESPONSE', 'mapping');
  return answers;
};

export class TypeSafeDecisionService implements DecisionService {
  readonly config: Readonly<ReturnType<typeof typeSafeConfig>>;
  constructor(private readonly transport: TypeSafeTransport, config: TypeSafeConfig) { this.config = typeSafeConfig(config); }
  async evaluate(request: DecisionRequest, signal = new AbortController().signal): Promise<DecisionResponse> {
    if (request.requestedModel !== this.config.model.value) throw typedError('INVALID_INPUT', 'model');
    const started = Date.now(), deadline = started + request.deadlineMs, maxAttempts = Math.min(this.config.maxAttempts ?? request.retryBudget + 1, request.retryBudget + 1);
    let attempts = 0, last: unknown;
    while (attempts < maxAttempts) {
      if (cancelled(signal)) throw typedError('CANCELLED', 'request'); if (Date.now() >= deadline) throw typedError('DEADLINE_EXCEEDED', 'request');
      attempts++;
      try {
        const result: TypeSafeTransportResult = await this.transport(projectSystemOneRequest(request, this.config.model.value), { signal, retry: { maxRetries: 0 } });
        if (result.status !== undefined && result.status >= 400) throw providerError(result.status);
        if (cancelled(signal)) throw typedError('CANCELLED', 'response'); if (Date.now() >= deadline) throw typedError('DEADLINE_EXCEEDED', 'response');
        const returnedModel = typeof (result.body as any)?.model === 'string' ? (result.body as any).model : undefined;
        if (returnedModel && (this.config.model.kind === 'pinned' ? returnedModel !== this.config.model.value : returnedModel !== 'jev-1.13.0')) throw typedError('PROVIDER_MALFORMED_RESPONSE', 'mapping');
        const response = { decisionId: request.decisionId, logicalCallId: request.logicalCallId, provider: 'typesafe-jev', requestedModel: request.requestedModel, returnedModel, answers: wireAnswers(result.body, request), ...(result.requestId ? { requestId: result.requestId } : {}), elapsedMs: Date.now() - started, attempts, provenance: 'synthetic' as const, providerContractHash: request.providerContractHash, sdkVersion: request.sdkVersion } as any;
        response.responseHash = hashManifest('yfere/response/v1', response); return admitDecisionResponse(request, response);
      } catch (error) {
        if (error instanceof DecisionServiceError) last = error; else last = typedError('PROVIDER_UNAVAILABLE', 'transport');
        if (cancelled(signal)) throw typedError('CANCELLED', 'transport'); if (Date.now() >= deadline) throw typedError('DEADLINE_EXCEEDED', 'transport');
        if (!retryable(last) || attempts >= maxAttempts) throw last;
        await sleep(Math.min(this.config.maxBackoffMs ?? 5000, (this.config.backoffMs ?? 0) * 2 ** (attempts - 1)), signal);
      }
    }
    throw last ?? typedError('BUDGET_EXCEEDED', 'transport');
  }
}