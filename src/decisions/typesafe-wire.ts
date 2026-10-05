import type { DecisionRequest, Question } from './contracts.js';

export type SystemOnePayload = { model: string; state: unknown; questions: Record<string, unknown> };
export type TypeSafeTransportResult = { body: unknown; requestId?: string; status?: number };
export type TypeSafeTransport = (payload: SystemOnePayload, options: { signal: AbortSignal; retry: { maxRetries: 0 } }) => Promise<TypeSafeTransportResult>;

const safeRecord = (value: Record<string, unknown>) => Object.fromEntries(Object.keys(value).map(k => [k, value[k]]));
const questionWire = (question: Question): unknown => {
  if (question.kind === 'choice') return { type: 'choice', instructions: question.instructions, criteria: safeRecord(question.options) };
  if (question.kind === 'score') return { type: 'score', instructions: question.instructions, criteria: [...question.levels] };
  return { type: 'noul', instructions: question.instructions, ...(question.criteria === undefined ? {} : { criteria: { true: question.criteria, false: question.criteria } }) };
};
export const projectSystemOneRequest = (request: DecisionRequest, model: string): SystemOnePayload => ({
  model, state: request.state, questions: Object.fromEntries(Object.entries(request.questions).map(([key, value]) => [key, questionWire(value as Question)])),
 });