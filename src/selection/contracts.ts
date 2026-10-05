import type { CatalogSnapshot, PersonaDefinition, ModelEndpoint, SkillDefinition } from '../domain/catalog.js';
import type { TaskPolicy } from '../policy/contracts.js';
import type { DecisionService, DecisionResponse } from '../decisions/contracts.js';

export type ChoiceAnswer = Readonly<{ kind:'choice'; winner:string; distribution:Readonly<Record<string,number>> }>;
export type StageAnswers = Readonly<{ persona?:ChoiceAnswer; model?:Readonly<Record<string,ChoiceAnswer>>; skill?:Readonly<Record<string,ChoiceAnswer>> }>;
export type PersonaOverride = Readonly<{ model?:string; skills?:'auto'|readonly string[] }>;
export type ReplanRequest = Readonly<{ generation:0|1; parentRosterId?:string; parentDecisionLineage?:readonly string[]; priorFailure:'replanEligible'|'none' }>;
export type SelectorInput = Readonly<{ catalog:CatalogSnapshot; policy:TaskPolicy; settledPrompt:string; answers?:StageAnswers; decisionService?:DecisionService; overrides?:Readonly<Record<string,PersonaOverride>>; generation?:number; parentRosterId?:string; parentDecisionLineage?:readonly string[]; replan?:ReplanRequest; signal?:AbortSignal; runId?:string }>;
export type SelectionErrorCode = 'CONFIG_ERROR'|'INVALID_DECISION'|'INCOMPATIBLE'|'NO_MATCH'|'INSUFFICIENT_ELIGIBLE_PERSONAS'|'DECISION_SERVICE_ERROR'|'CANCELLED'|'DEADLINE_EXCEEDED'|'BUDGET_EXCEEDED'|'NON_REPLAYABLE'|'REPLAN_EXHAUSTED';
export class SelectorError extends Error { constructor(readonly code:SelectionErrorCode,message:string){super(message);this.name='SelectorError';} }
export type AssignmentMember = Readonly<{ memberId:string; ordinal:number; personaId:string; modelId:string; skillIds:readonly string[]; }>;
export type AssignmentRoster = Readonly<{ rosterId:string; generation:number; parentRosterId?:string; parentDecisionLineage:readonly string[]; members:readonly AssignmentMember[] }>;
export type DecisionTrace = Readonly<{ stage:'persona'|'model'|'skill'; questionIds:readonly string[]; offeredIds:readonly string[]; winner?:string; distribution?:Readonly<Record<string,number>>; bypassed:boolean; decisionId?:string; logicalCallId?:string; requestHash?:string; responseHash?:string }>;
export type SelectionResult = Readonly<{ kind:'accepted'|'abstained'; code?:'NO_MATCH'; roster:AssignmentRoster; trace:readonly DecisionTrace[] }>;
export type SelectionCatalog = Readonly<{ personas:readonly PersonaDefinition[]; models:readonly ModelEndpoint[]; skills:readonly SkillDefinition[] }>;
export type SelectorContext = { catalog:SelectionCatalog; policy:TaskPolicy; input:SelectorInput; traces:DecisionTrace[]; };
export type DecisionAnswers = DecisionResponse['answers'];
