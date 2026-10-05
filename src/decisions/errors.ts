export type DecisionErrorCode = 'INVALID_INPUT' | 'INVALID_DECISION' | 'NON_REPLAYABLE' | 'BUDGET_EXCEEDED' | 'CANCELLED' | 'DEADLINE_EXCEEDED'
  | 'PROVIDER_AUTH' | 'PROVIDER_INVALID_REQUEST' | 'PROVIDER_RATE_LIMITED' | 'PROVIDER_OVERLOADED'
  | 'PROVIDER_TIMEOUT' | 'PROVIDER_UNAVAILABLE' | 'PROVIDER_MALFORMED_RESPONSE';
export class DecisionServiceError extends Error { constructor(readonly code: DecisionErrorCode, readonly phase: string) { super(code); this.name = 'DecisionServiceError'; Object.setPrototypeOf(this, new.target.prototype); } }
export const typedError = (code: DecisionErrorCode, phase = 'request') => new DecisionServiceError(code, phase);
