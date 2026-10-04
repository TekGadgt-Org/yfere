import { z } from 'zod';
import type { CatalogSnapshot } from '../domain/catalog.js';

const id = z.string().min(1).max(128);
const ids = z.array(id).max(128);
export const exclusionCodes = ['UNKNOWN_PERSONA','UNKNOWN_MODEL','UNKNOWN_SKILL','ENDPOINT_UNAVAILABLE','ENDPOINT_UNAUTHORIZED','ENDPOINT_STATE_UNKNOWN','PERSONA_CAPABILITY_MISSING','REQUIRED_SKILL_MISSING','SKILL_UNTRUSTED','SKILL_PREREQUISITE_MISSING','SKILL_CONFLICT','SKILL_CAPABILITY_UNSATISFIED','SKILL_TOOL_UNSATISFIED','OPTIONAL_SKILL_AUTHORITY_ESCALATION','MODEL_FEATURE_INCOMPATIBLE','MODEL_TOOL_INCOMPATIBLE','CONTEXT_LIMIT_EXCEEDED','WORKSPACE_POLICY_DENIED','SIDE_EFFECT_POLICY_DENIED','MISSING_REQUIRED_TOOL','BUDGET_EXCEEDED','BUDGET_UNKNOWN','ARTIFACT_OWNERSHIP_CONFLICT','REVIEWER_NOT_INDEPENDENT','MANDATORY_PERSONA_INELIGIBLE','INSUFFICIENT_ELIGIBLE_PERSONAS','NO_MATCH'] as const;
export const exclusionCodeSchema = z.enum(exclusionCodes);
export type ExclusionCode = typeof exclusionCodes[number];
export const policySchema = z.object({
 taskId:id, taskAttemptId:id, requiredCapabilities:ids, requiredTools:ids, requiredFeatures:ids, contextLimit:z.number().int().positive(),
 allowedCapabilities:ids, allowedTools:ids, allowedSideEffects:z.array(z.enum(['none','workspace','external'])).min(1), workspaceMode:z.enum(['isolated','reviewed']),
 maxAgents:z.number().int().min(1).max(4), admissionPolicy:z.enum(['allow-fewer','exact']), mandatoryPersonaIds:ids,
 budget:z.object({ sharedUnits:z.number().int().nonnegative(), requireKnownCost:z.boolean().optional() }).strict(), artifactPolicy:z.enum(['exclusive','project-shared']), reviewRequired:z.boolean()
}).strict();
export type TaskPolicy = Readonly<z.infer<typeof policySchema>>;
export const candidateSchema = z.object({
 candidateId:id, personaId:id, modelId:id, skillIds:ids, capabilities:ids, tools:ids, contextUse:z.number().int().nonnegative(),
 sideEffect:z.enum(['none','workspace','external']), workspaceMode:z.enum(['isolated','reviewed']), reservation:z.union([z.number().int().nonnegative(), z.literal('unknown')]),
 artifacts:z.array(z.object({ artifactId:id, owner:z.literal('persona') })).max(128), reviews:z.array(z.object({ artifactId:id, producerPersonaId:id, reviewerPersonaId:id })).max(128)
}).strict();
export type ProposedCandidate = Readonly<z.infer<typeof candidateSchema>>;
export type PolicyInput = Readonly<{ catalog: CatalogSnapshot; policy: TaskPolicy; candidates: readonly ProposedCandidate[] }>;
export type Exclusion = Readonly<{ code: ExclusionCode; candidateId: string; personaId?: string; modelId?: string; skillId?: string; artifactId?: string }>;
export type EligibleCandidate = ProposedCandidate;
export type EligibilityResult = Readonly<{ kind:'accepted'|'abstained'; code?: ExclusionCode; eligible: readonly EligibleCandidate[]; exclusions: readonly Exclusion[] }>;
export type TeamResult = EligibilityResult;
export function detached<T>(value:T): T { const copy = structuredClone(value); return deepFreeze(copy); }
function deepFreeze<T>(value:T):T { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.freeze(value); for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child); } return value; }
export function exclusion(code:ExclusionCode, candidate:ProposedCandidate, extra:Partial<Exclusion> = {}): Exclusion { return { code, candidateId:candidate.candidateId, personaId:candidate.personaId, modelId:candidate.modelId, ...extra }; }
