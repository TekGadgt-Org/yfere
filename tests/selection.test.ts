import { describe, expect, it } from 'vitest';
import { selectRoster, type SelectorInput } from '../src/selection/index.js';
import { loadCatalogSnapshot } from '../src/domain/catalog.js';

const skill = { id:'required', version:'1.0.0', contentHash:'a'.repeat(64), trust:'reviewed', description:'required', positiveExamples:['x'], negativeExamples:[], requiredCapabilities:[], requiredTools:[], prerequisites:[], sideEffectClass:'none', conflicts:[], instructionTokenEstimate:1, artifactFormats:['text'] };
const model = { id:'model', version:'1.0.0', provider:'fixture', requestedModel:'model', transport:'offline-fixture', availability:'available', authorization:'authorized', modalities:['text'], features:[], tools:[], contextLimit:100, dataHandling:'synthetic-only', authorizationScope:'offline', cost:{input:'unknown',output:'unknown'}, operationalEvidenceIds:[] };
const persona = (id:string, overrides={}) => ({ id, version:'1.0.0', role:id, positiveExamples:['x'], negativeExamples:[], requiredCapabilities:[], outputContract:'text', requiredSkillIds:[], defaultSkillIds:[], eligibleSkillIds:[], workspacePolicy:'isolated', artifactOwnership:'persona', reviewIndependence:true, ...overrides });
const catalog = loadCatalogSnapshot([{format:'json',text:JSON.stringify({kind:'skills',version:'1.0.0',records:[skill]})},{format:'json',text:JSON.stringify({kind:'models',version:'1.0.0',records:[model]})},{format:'json',text:JSON.stringify({kind:'personas',version:'1.0.0',records:[persona('writer'),persona('coder')]})}]);
const base = (overrides:Partial<SelectorInput>={}):SelectorInput => ({catalog, settledPrompt:'do work', policy:{taskId:'task',taskAttemptId:'attempt',requiredCapabilities:[],requiredTools:[],requiredFeatures:[],contextLimit:50,allowedCapabilities:[],allowedTools:[],allowedSideEffects:['none'],workspaceMode:'isolated',maxAgents:1,admissionPolicy:'allow-fewer',mandatoryPersonaIds:[],budget:{sharedUnits:10},artifactPolicy:'exclusive',reviewRequired:false}, answers:{persona:{kind:'choice',winner:'writer',distribution:{writer:1,coder:0,none:0}}}, ...overrides});

describe('phase 5 selector',()=>{
 it('selects hard-eligible personas and returns a detached frozen assignment',async()=>{ const result=await selectRoster(base()); expect(result.kind).toBe('accepted'); expect(result.roster.members[0]).toMatchObject({personaId:'writer',modelId:'model',skillIds:[]}); expect(Object.isFrozen(result.roster)).toBe(true); });
 it('rejects a persona winner that was not offered',async()=>{ await expect(selectRoster(base({answers:{persona:{kind:'choice',winner:'missing',distribution:{writer:0,coder:0,none:1}}}}))).rejects.toMatchObject({code:'INVALID_DECISION'}); });
});
