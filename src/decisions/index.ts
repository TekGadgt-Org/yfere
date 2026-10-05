import { OFFLINE_POLICY_VERSION } from '../domain/contracts.js';
export { RecordedDecisionService, responseHash, fixtureHash } from './replay.js';
export { stateHash, questionSetHash, decisionRequestSchema, decisionResponseSchema, questionSchema, answerSchema, REPLAY_LIMITS } from './contracts.js';
export { canonical, hashManifest, manifestBytes } from './canonical.js';
export { DecisionServiceError } from './errors.js';
export { admitDecisionResponse } from './admit-response.js';
export { TypeSafeDecisionService } from './typesafe-jev.js';

export { typeSafeConfig, TYPESAFE_SDK_VERSION, TYPESAFE_SDK_LICENSE, TYPESAFE_SDK_INTEGRITY } from './typesafe-config.js';

export type { TypeSafeConfig, TypeSafeModel } from './typesafe-config.js';
export type { DecisionRequest, DecisionResponse, RecordedFixture, DecisionService, Question, Answer } from './contracts.js';

export const OFFLINE_DECISION_POLICY = Object.freeze({
  version: OFFLINE_POLICY_VERSION,
  liveEvaluation: 'disabled',
} as const);
