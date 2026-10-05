import { decisionResponseSchema, type DecisionRequest, type DecisionResponse } from './contracts.js';
import { DecisionServiceError, typedError } from './errors.js';

const keysEqual = (a: Record<string, unknown>, b: Record<string, unknown>) => {
  const ak = Object.keys(a).sort();
  const bk = Object.keys(b).sort();
  return ak.length === bk.length && ak.every((key, index) => key === bk[index]);
};
const validDistribution = (value: Record<string, number>) => {
  const values = Object.values(value);
  return values.every(number => Number.isFinite(number) && number >= 0 && number <= 1)
    && Math.abs(values.reduce((sum, number) => sum + number, 0) - 1) <= 1e-6;
};

/** The single semantic trust boundary for provider/replay responses. */
export function admitDecisionResponse(request: DecisionRequest, value: unknown): DecisionResponse {
  const parsed = decisionResponseSchema.safeParse(value);
  if (!parsed.success) throw typedError('INVALID_DECISION', 'response');
  const response = parsed.data as DecisionResponse;
  if (response.decisionId !== request.decisionId
    || response.logicalCallId !== request.logicalCallId
    || response.requestedModel !== request.requestedModel
    || response.providerContractHash !== request.providerContractHash
    || response.sdkVersion !== request.sdkVersion
    || response.responseHash !== request.responseHash) {
    throw typedError('INVALID_DECISION', 'response');
  }
  const questions = request.questions as Record<string, any>;
  if (!keysEqual(response.answers, questions)) throw typedError('INVALID_DECISION', 'response');
  for (const [key, question] of Object.entries(questions)) {
    const answer = (response.answers as any)[key];
    if (!answer || answer.kind !== question.kind) throw typedError('INVALID_DECISION', 'response');
    if (question.kind === 'choice' && answer.kind === 'choice') {
      const offered = question.options as Record<string, string>;
      const distribution = answer.distribution as Record<string, number>;
      const offeredKeys = Object.keys(offered);
      const maximum = Math.max(...offeredKeys.map(id => distribution[id] as number));
      if (!keysEqual(distribution, offered) || !validDistribution(distribution)
        || !Object.prototype.hasOwnProperty.call(offered, answer.winner)
        || distribution[answer.winner] !== maximum) throw typedError('INVALID_DECISION', 'response');
    }
    if (question.kind === 'score' && answer.kind === 'score') {
      const offered = question.levels as string[];
      const distribution = answer.distribution as Record<string, number>;
      const expectedKeys = Object.fromEntries(offered.map(id => [id, true]));
      const maximum = Math.max(...offered.map(id => distribution[id] as number));
      if (!keysEqual(distribution, expectedKeys) || !validDistribution(distribution)
        || !offered.includes(answer.level) || distribution[answer.level] !== maximum
        || answer.expected < 0 || answer.expected > offered.length - 1) throw typedError('INVALID_DECISION', 'response');
    }
  }
  return response;
}

export type { DecisionRequest, DecisionResponse };
export { DecisionServiceError };
