import { hashManifest } from '../decisions/canonical.js';
import { questionSetHash, stateHash, type DecisionRequest, type Question } from '../decisions/contracts.js';
import type { SelectorInput } from './contracts.js';

export type DecisionStage = 'persona' | 'model' | 'skill';
export function buildDecisionRequest(input: SelectorInput, stage: DecisionStage, offered: readonly string[], key: string, round: 1 | 2): DecisionRequest {
  const questions: Record<string, Question> = { [key]: { kind: 'choice', instructions: `Select one offered ${stage} identifier.`, options: Object.fromEntries(offered.map(id => [id, id])) } };
  const state = { settledPrompt: input.settledPrompt, stage, key, offered, task: input.policy.taskId, catalogSnapshotId: input.catalog.snapshotId, policyVersion: input.policy.taskId };
  const stateDigest = stateHash(state); const questionsDigest = questionSetHash(questions);
  const runId = input.runId ?? input.policy.taskId;
  const identity = { runId, taskAttemptId: input.policy.taskAttemptId, catalogSnapshotId: input.catalog.snapshotId, policyVersion: input.policy.taskId, stage, round, stateHash: stateDigest, questionSetHash: questionsDigest };
  const pin = hashManifest('yfere/request-pin/v1', identity);
  const pending = '0'.repeat(64);
  return { decisionId: hashManifest('yfere/decision/v1', identity), runId, stage, round, inputClasses: ['settled_prompt', stage === 'persona' ? 'persona_definitions' : stage === 'model' ? 'model_catalog_metadata' : 'skill_catalog_metadata'], logicalCallId: hashManifest('yfere/call/v1', identity), state, questions, catalogSnapshotId: input.catalog.snapshotId, policyVersion: input.policy.taskId, deadlineMs: 30_000, retryBudget: 2, requestedModel: 'fixture', providerMode: 'recorded', stateHash: stateDigest, questionSetHash: questionsDigest, providerContractHash: pin, sdkVersion: pin, responseHash: pending, fixtureVersion: 'yfere-recorded/v1', fixtureHash: pending };
}
