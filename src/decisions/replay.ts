import { readFileSync, statSync, openSync, readSync, closeSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { decisionRequestRaw, decisionResponseSchema, type DecisionRequest, type DecisionResponse, type DecisionService, type RecordedFixture, stateHash, questionSetHash, REPLAY_LIMITS } from './contracts.js';
import { canonical, detached, hashManifest } from './canonical.js';
import { DecisionServiceError, typedError } from './errors.js';
import { admitDecisionResponse } from './admit-response.js';
const without=(o:Record<string,unknown>,...keys:string[])=>{const n=Object.create(null);for(const k of Object.keys(o))if(!keys.includes(k))Object.defineProperty(n,k,{value:o[k],enumerable:true,writable:true,configurable:true});return n;};
const responsePayload=(r:DecisionResponse)=>without(r as any,'responseHash');
const fixturePayload=(f:RecordedFixture)=>without(f as any,'fixtureHash');
export const responseHash=(r:DecisionResponse)=>hashManifest('yfere/response/v1',responsePayload(r));
export const fixtureHash=(f:RecordedFixture)=>hashManifest('yfere/fixture/v1',fixturePayload(f));
function parseBytes(bytes:Uint8Array):unknown { const copy=new Uint8Array(bytes); let text:string; try{text=new TextDecoder('utf-8',{fatal:true}).decode(copy);}catch{throw typedError('INVALID_INPUT','decode');} try{return JSON.parse(text);}catch{throw typedError('INVALID_INPUT','parse');} }
function sourceBytes(source:string|Uint8Array):Uint8Array { if(typeof source==='string'){try{const size=statSync(source).size;if(size>32_000_000)throw typedError('INVALID_INPUT','raw');const fd=openSync(source,'r');const out=new Uint8Array(32_000_001);const n=readSync(fd,out,0,out.length,0);closeSync(fd);if(n>32_000_000)throw typedError('INVALID_INPUT','raw');return out.slice(0,n);}catch(e){if(e instanceof DecisionServiceError)throw e;throw typedError('INVALID_INPUT','source');}} if(!(source instanceof Uint8Array))throw typedError('INVALID_INPUT','source'); if(source.byteLength>32_000_000)throw typedError('INVALID_INPUT','raw'); return new Uint8Array(source); }
function keysEqual(a:Record<string,unknown>,b:Record<string,unknown>){const ak=Object.keys(a).sort(),bk=Object.keys(b).sort();return ak.length===bk.length&&ak.every((k,i)=>k===bk[i]);}
function validDistribution(d:Record<string,number>){const values=Object.values(d);return values.every(v=>Number.isFinite(v)&&v>=0&&v<=1)&&Math.abs(values.reduce((s,v)=>s+v,0)-1)<=1e-6;}
function checkResponse(req:DecisionRequest,value:unknown):DecisionResponse {
 return admitDecisionResponse(req, value);
 /* legacy implementation retained only as a type-level boundary during the
    Phase 5 migration; all callers return through the shared admission above. */
 /*
 const p=decisionResponseSchema.safeParse(value); if(!p.success)throw typedError('INVALID_DECISION','response');
 const r=p.data as DecisionResponse; const questions=req.questions as Record<string,any>;
 if(r.decisionId!==req.decisionId||r.logicalCallId!==req.logicalCallId||r.requestedModel!==req.requestedModel||!keysEqual(r.answers,questions))throw typedError('INVALID_DECISION','response');
 for(const [k,q] of Object.entries(questions)){const a=(r.answers as any)[k];if(!a||a.kind!==q.kind)throw typedError('INVALID_DECISION','response');
  if(q.kind==='choice'&&a.kind==='choice'){const offered=q.options as Record<string,string>,d=a.distribution as Record<string,number>,ks=Object.keys(offered);const max=Math.max(...ks.map(x=>d[x] as number));if(!keysEqual(d,offered)||!validDistribution(d)||!Object.prototype.hasOwnProperty.call(offered,a.winner)||d[a.winner]!==max)throw typedError('INVALID_DECISION','response');}
  if(q.kind==='score'&&a.kind==='score'){const offered=q.levels as string[],d=a.distribution as Record<string,number>;const max=Math.max(...offered.map(x=>d[x] as number));const expectedKeys=Object.fromEntries(offered.map(x=>[x,true]));if(!keysEqual(d,expectedKeys)||!validDistribution(d)||!offered.includes(a.level)||d[a.level]!==max||a.expected<0||a.expected>offered.length-1)throw typedError('INVALID_DECISION','response');}
 } return r; */
}
function sameBase(a:DecisionRequest,b:DecisionRequest){return canonical(a)===canonical(b);}
export class RecordedDecisionService implements DecisionService {
 private readonly fixtures:ReadonlyMap<string,RecordedFixture>;
 constructor(source:string|Uint8Array){ const parsed=parseBytes(sourceBytes(source)); if(!Array.isArray(parsed)||parsed.length>REPLAY_LIMITS.fixtures)throw typedError('INVALID_INPUT','collection'); const map=new Map<string,RecordedFixture>();let aggregate=0;for(const raw of parsed){if(raw===null||typeof raw!=='object'||Array.isArray(raw))throw typedError('INVALID_INPUT','fixture');const bytes=Buffer.byteLength(canonical(raw),'utf8');if(bytes>REPLAY_LIMITS.canonicalBytes||aggregate>REPLAY_LIMITS.aggregateBytes-bytes)throw typedError('INVALID_INPUT','budget');aggregate+=bytes;const f=raw as any;if(!['synthetic','documented_example','recorded_live'].includes(f.provenance)||f.provenance!==f.response?.provenance)throw typedError('INVALID_INPUT','fixture');const reqParsed=decisionRequestRaw.safeParse(without(f,'response','provenance'));if(!reqParsed.success||f.fixtureVersion!=='yfere-recorded/v1')throw typedError('INVALID_INPUT','request');const req=reqParsed.data as DecisionRequest;const response=checkResponse(req,f.response);if(response.responseHash!==req.responseHash||response.providerContractHash!==req.providerContractHash||response.sdkVersion!==req.sdkVersion||responseHash(response)!==req.responseHash||stateHash(req.state)!==req.stateHash||questionSetHash(req.questions)!==req.questionSetHash||fixtureHash(f)!==req.fixtureHash)throw typedError('INVALID_INPUT','hash');const key=canonical([req.runId,req.stage,req.logicalCallId]);if(map.has(key))throw typedError('INVALID_INPUT','duplicate');map.set(key,Object.freeze(detached(f)));}this.fixtures=map; }
 async evaluate(input:DecisionRequest,signal?:AbortSignal):Promise<DecisionResponse>{if(signal?.aborted)throw typedError('CANCELLED','deadline');const p=decisionRequestRaw.safeParse(input);if(!p.success)throw typedError('INVALID_INPUT');const req=p.data as DecisionRequest;if(req.deadlineMs<=0)throw typedError('DEADLINE_EXCEEDED','deadline');if(stateHash(req.state)!==req.stateHash||questionSetHash(req.questions)!==req.questionSetHash)throw typedError('NON_REPLAYABLE','replay');const f=this.fixtures.get(canonical([req.runId,req.stage,req.logicalCallId]));if(!f||!sameBase(req,without(f as any,'response','provenance') as DecisionRequest))throw typedError('NON_REPLAYABLE','replay');if(f.response.elapsedMs>=req.deadlineMs)throw typedError('DEADLINE_EXCEEDED','deadline');if(f.response.attempts-1>req.retryBudget)throw typedError('BUDGET_EXCEEDED','replay');return detached(f.response); }
}
export type { DecisionRequest,DecisionResponse,RecordedFixture,DecisionService } from './contracts.js';
