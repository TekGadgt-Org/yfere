import { detached } from '../policy/contracts.js';
import { SelectorError, type SelectorInput } from './contracts.js';

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const safeOpaque = (value: unknown) => typeof value === 'string' && value.length > 0 && value.length <= 128 && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value) && !value.includes('..') && !value.includes('://');

/** Closed, detached trust-boundary normalization for selector callers. */
export function normalizeSelectorInput(value: unknown): SelectorInput {
  if (!isRecord(value) || typeof value.settledPrompt !== 'string' || value.settledPrompt.length > 32_768
    || !isRecord(value.catalog) || !isRecord(value.policy)) throw new SelectorError('CONFIG_ERROR', 'invalid selector input');
  for (const key of ['runId']) if (key in value && !safeOpaque(value[key])) throw new SelectorError('CONFIG_ERROR', 'invalid selector input');
  if ('generation' in value && (!Number.isSafeInteger(value.generation) || value.generation !== 0)) throw new SelectorError('REPLAN_EXHAUSTED', 'invalid generation');
  return detached(value as SelectorInput);
}
