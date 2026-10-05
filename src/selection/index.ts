// The future provider registry is deliberately recorded without constructing transports.
export const FUTURE_PROVIDER_REGISTRY = ['codex', 'claude-code', 'opencode-go'] as const;
export * from './contracts.js';
export { selectRoster, select } from './pipeline.js';
export { normalizeSelectorInput } from './input.js';
export { buildDecisionRequest } from './decision-call.js';
