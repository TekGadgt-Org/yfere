export type DecisionErrorCode = 'INVALID_INPUT' | 'INVALID_DECISION' | 'NON_REPLAYABLE' | 'BUDGET_EXCEEDED' | 'CANCELLED' | 'DEADLINE_EXCEEDED';
export class DecisionServiceError extends Error { constructor(readonly code: DecisionErrorCode, readonly phase: string) { super(code); this.name = 'DecisionServiceError'; } }
export const typedError = (code: DecisionErrorCode, phase = 'request') => new DecisionServiceError(code, phase);
