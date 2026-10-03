import { OFFLINE_POLICY_VERSION } from '../domain/contracts.js';

export const OFFLINE_DECISION_POLICY = Object.freeze({
  version: OFFLINE_POLICY_VERSION,
  liveEvaluation: 'disabled',
} as const);
