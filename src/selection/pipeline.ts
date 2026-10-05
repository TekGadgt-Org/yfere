import { hashManifest } from '../decisions/canonical.js';
import { detached } from '../policy/contracts.js';
import { reconcileTeam } from '../policy/index.js';
import type { PersonaDefinition, ModelEndpoint, SkillDefinition } from '../domain/catalog.js';
import type { Answer, DecisionRequest, DecisionResponse, Question } from '../decisions/contracts.js';
import { SelectorError, type SelectorInput, type SelectionResult, type AssignmentMember, type AssignmentRoster, type DecisionTrace, type ChoiceAnswer, type PersonaOverride } from './contracts.js';
export * from './contracts.js';

const cmp=(a:string,b:string)=>a<b?-1:a>b?1:0;
const sorted=(xs:readonly string[])=>[...xs].sort(cmp);
function fail(code:SelectionErrorCode,message:string):never { throw new SelectorError(code,message); }
import type { SelectionErrorCode } from './contracts.js';
function choice(value:unknown, offered:readonly string[], stage:string):ChoiceAnswer {
  if(!value || typeof value!=='object' || (value as any).kind!=='choice') fail('INVALID_DECISION',`${stage} answer must be a choice`);
  const winner=(value as any).winner;
  if(typeof winner!=='string'||!offered.includes(winner)) fail('INVALID_DECISION',`${stage} winner was not offered`);
  const distribution=(value as any).distribution;
  if(!distribution || typeof distribution!=='object' || Array.isArray(distribution) || Object.keys(distribution).length!==offered.length) fail('INVALID_DECISION',`${stage} distribution must cover offers exactly`);
  let total=0;
  for(const id of offered){ const n=distribution[id]; if(typeof n!=='number'||!Number.isFinite(n)||n<0) fail('INVALID_DECISION',`${stage} distribution is invalid`); total+=n; }
  if(Math.abs(total-1)>1e-9) fail('INVALID_DECISION',`${stage} distribution must sum to one`);
  const max=Math.max(...offered.map(id=>distribution[id])); if(distribution[winner]!==max) fail('INVALID_DECISION',`${stage} winner is inconsistent`);
  return {kind:'choice',winner,distribution:Object.fromEntries(offered.map(id=>[id,distribution[id]]))};
}
function answerFor(input:SelectorInput,stage:'persona'|'model'|'skill',id:string|undefined,offered:readonly string[]):ChoiceAnswer|undefined {
  const value=stage==='persona'?input.answers?.persona:stage==='model'?id&&input.answers?.model?.[id]:id&&input.answers?.skill?.[id];
  return value===undefined?undefined:choice(value,offered,stage);
}
function hardEligible(p:PersonaDefinition,catalog:SelectorInput['catalog'],policy:SelectorInput['policy']):boolean {
  if(!p.requiredCapabilities.every(x=>policy.allowedCapabilities.includes(x)) || !p.requiredSkillIds.every(x=>p.eligibleSkillIds.includes(x))) return false;
  const skills=catalog.skills.filter(s=>p.requiredSkillIds.includes(s.id));
  if(skills.length!==p.requiredSkillIds.length || skills.some(s=>s.trust!=='reviewed')) return false;
  return catalog.models.some(m=>compatible(p,m,skills,policy));
}
function compatible(p:PersonaDefinition,m:ModelEndpoint,skills:readonly SkillDefinition[],policy:SelectorInput['policy']):boolean {
  return m.availability==='available'&&m.authorization==='authorized'&&m.contextLimit>=policy.contextLimit&&policy.requiredFeatures.every(x=>m.features.includes(x))&&policy.requiredTools.every(x=>m.tools.includes(x))&&p.requiredCapabilities.every(x=>policy.allowedCapabilities.includes(x))&&skills.every(s=>s.requiredCapabilities.every(x=>policy.allowedCapabilities.includes(x))&&s.requiredTools.every(x=>policy.allowedTools.includes(x)&&m.tools.includes(x))&&policy.allowedSideEffects.includes(s.sideEffectClass));
}
function optionsFor(p:PersonaDefinition,catalog:SelectorInput['catalog'],policy:SelectorInput['policy'],override?:PersonaOverride):{models:ModelEndpoint[];skills:SkillDefinition[]} {
  const exact=override?.skills && override.skills!=='auto'?new Set(override.skills):undefined;
  const skillIds=exact?sorted([...exact]):sorted([...new Set([...p.requiredSkillIds,...p.defaultSkillIds])]);
  const skills=catalog.skills.filter(s=>skillIds.includes(s.id));
  if(skills.length!==skillIds.length || !skillIds.every(id=>p.eligibleSkillIds.includes(id)) || !p.requiredSkillIds.every(id=>skillIds.includes(id))) fail('INCOMPATIBLE',`invalid skills pin for ${p.id}`);
  const models=catalog.models.filter(m=>(!override?.model||m.id===override.model)&&(!p.modelOverride||m.id===p.modelOverride)&&compatible(p,m,skills,policy));
  if(!models.length) fail('INCOMPATIBLE',`no compatible model for ${p.id}`);
  return {models:models.sort((a,b)=>cmp(a.id,b.id)),skills};
}
function memberId(p:string,m:string,skills:readonly string[]):string{return hashManifest('yfere/assignment/v1',{p,m,s:sorted(skills)}).slice(0,32);}
function rosterId(members:readonly AssignmentMember[],generation:number,parent?:string):string{return hashManifest('yfere/roster/v1',{generation,...(parent?{parent}:{}),members});}

export async function selectRoster(input:SelectorInput):Promise<SelectionResult>{
  if(input.policy.maxAgents<1||input.policy.maxAgents>4) fail('CONFIG_ERROR','maxAgents must be between 1 and 4');
  if(input.policy.mandatoryPersonaIds.length>input.policy.maxAgents) fail('CONFIG_ERROR','mandatory personas exceed maxAgents');
  const catalog=input.catalog; const personas=[...catalog.personas].sort((a,b)=>cmp(a.id,b.id));
  const eligible=personas.filter(p=>hardEligible(p,catalog,input.policy));
  for(const id of input.policy.mandatoryPersonaIds) if(!eligible.some(p=>p.id===id)) fail('NO_MATCH',`mandatory persona ${id} is not eligible`);
  const offers=sorted([...eligible.map(p=>p.id),'none']);
  const traces:DecisionTrace[]=[]; let selected:string[];
  const pa=answerFor(input,'persona',undefined,offers);
  if(!pa) { selected=input.policy.mandatoryPersonaIds.slice(); if(!selected.length) selected=eligible.slice(0,input.policy.maxAgents).map(p=>p.id); }
  else {
    traces.push({stage:'persona',questionIds:['persona-selection'],offeredIds:offers,winner:pa.winner,distribution:pa.distribution,bypassed:false});
    const requested=(input.answers?.persona as any)?.winners;
    selected=Array.isArray(requested)?requested.filter((x:unknown):x is string=>typeof x==='string'&&x!=='none').slice(0,input.policy.maxAgents):(pa.winner==='none'?[]:[pa.winner]);
  }
  for(const id of input.policy.mandatoryPersonaIds) if(!selected.includes(id)) selected.push(id);
  selected=sorted([...new Set(selected)]);
  if(selected.length>input.policy.maxAgents) fail('INSUFFICIENT_ELIGIBLE_PERSONAS','selected roster exceeds maxAgents');
  if(selected.length<input.policy.maxAgents&&input.policy.admissionPolicy==='exact') fail('INSUFFICIENT_ELIGIBLE_PERSONAS','exact admission cannot be satisfied');
  const members:AssignmentMember[]=[];
  for(const pid of selected){
    const p=personas.find(x=>x.id===pid); if(!p) fail('INVALID_DECISION','selected persona was not offered');
    const supplied=input.overrides?.[pid];
    const override:PersonaOverride|undefined = supplied ?? (p.modelOverride || p.skillsOverride ? {
      ...(p.modelOverride ? {model:p.modelOverride} : {}),
      ...(p.skillsOverride ? {skills:p.skillsOverride} : {}),
    } : undefined);
    const opts=optionsFor(p,catalog,input.policy,override);
    let model=opts.models[0]!;
    const modelIds=opts.models.map(x=>x.id); const ma=override?.model?undefined:answerFor(input,'model',pid,modelIds);
    if(ma){ traces.push({stage:'model',questionIds:[`model:${pid}`],offeredIds:modelIds,winner:ma.winner,distribution:ma.distribution,bypassed:false}); model=opts.models.find(x=>x.id===ma.winner)!; }
    else if(opts.models.length>1&&!override?.model&&!p.modelOverride) fail('INVALID_DECISION',`missing model answer for ${pid}`);
    let skills=opts.skills;
    const exact=override?.skills&&override.skills!=='auto';
    if(!exact&&!(p.skillsOverride&&p.skillsOverride!=='auto')){
      const optional=catalog.skills.filter(s=>p.eligibleSkillIds.includes(s.id)&&!skills.some(x=>x.id===s.id)&&compatible(p,model,[...skills,s],input.policy)).map(s=>s.id).sort(cmp);
      const ids=[...optional,'none']; const sa=answerFor(input,'skill',pid,ids);
      if(sa){traces.push({stage:'skill',questionIds:[`skill:${pid}`],offeredIds:ids,winner:sa.winner,distribution:sa.distribution,bypassed:false}); if(sa.winner!=='none') skills=[...skills,catalog.skills.find(s=>s.id===sa.winner)!];}
      else if(optional.length>1) fail('INVALID_DECISION',`missing skill answer for ${pid}`);
    }
    skills=[...new Map(skills.map(s=>[s.id,s])).values()].sort((a,b)=>cmp(a.id,b.id));
    if(!compatible(p,model,skills,input.policy)) fail('INCOMPATIBLE',`frozen assignment is incompatible for ${pid}`);
    const capabilities=sorted([...new Set([...p.requiredCapabilities,...skills.flatMap(s=>s.requiredCapabilities),...input.policy.requiredCapabilities])]);
    const tools=sorted([...new Set([...input.policy.requiredTools,...skills.flatMap(s=>s.requiredTools)])]);
    const checked=reconcileTeam({catalog,policy:input.policy,candidates:[{candidateId:pid,personaId:pid,modelId:model.id,skillIds:skills.map(s=>s.id),capabilities,tools,contextUse:skills.reduce((n,s)=>n+s.instructionTokenEstimate,0),sideEffect:skills.some(s=>s.sideEffectClass==='external')?'external':skills.some(s=>s.sideEffectClass==='workspace')?'workspace':'none',workspaceMode:input.policy.workspaceMode,reservation:'unknown',artifacts:[],reviews:[]}]});
    if(checked.kind!=='accepted') fail('INCOMPATIBLE',`policy rejected frozen assignment for ${pid}`);
    members.push({memberId:memberId(pid,model.id,skills.map(s=>s.id)),ordinal:members.length,personaId:pid,modelId:model.id,skillIds:skills.map(s=>s.id)});
  }
  const generation=input.generation??0; if(generation<0||generation>1) fail('REPLAN_EXHAUSTED','only generations 0 and 1 are supported');
  const roster:AssignmentRoster={rosterId:rosterId(members,generation,input.parentRosterId),generation,...(input.parentRosterId?{parentRosterId:input.parentRosterId}:{}),parentDecisionLineage:[...(input.parentDecisionLineage??[])],members};
  return detached({kind:'accepted',roster,traces}) as unknown as SelectionResult;
}

export const select=selectRoster;
export type { SelectorInput as SelectionInput } from './contracts.js';
