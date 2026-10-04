import { detached, type PolicyInput, type TeamResult, type Exclusion } from './contracts.js';
import { evaluateEligibility } from './eligibility.js';
export function reconcileTeam(input:PolicyInput): TeamResult {
  const base = evaluateEligibility(input);
  if (base.kind !== 'accepted') return base;
  const exclusions: Exclusion[] = [...base.exclusions];
  const members = [...base.eligible].sort((a,b) => a.candidateId < b.candidateId ? -1 : a.candidateId > b.candidateId ? 1 : 0);
  if (members.length > input.policy.maxAgents) exclusions.push({ code:'BUDGET_EXCEEDED', candidateId:'roster' });
  const total = members.reduce<number | 'unknown'>((sum, c) => sum === 'unknown' || c.reservation === 'unknown' ? 'unknown' : sum + c.reservation, 0);
  if (total === 'unknown' && input.policy.budget.requireKnownCost) exclusions.push({ code:'BUDGET_UNKNOWN', candidateId:'team' });
  else if (typeof total === 'number' && total > input.policy.budget.sharedUnits) exclusions.push({ code:'BUDGET_EXCEEDED', candidateId:'team' });
  const owners = new Map<string,string>();
  for (const candidate of members) for (const artifact of candidate.artifacts) {
    const prior = owners.get(artifact.artifactId);
    if (prior && prior !== candidate.personaId) exclusions.push({ code:'ARTIFACT_OWNERSHIP_CONFLICT', candidateId:candidate.candidateId, personaId:candidate.personaId, artifactId:artifact.artifactId });
    owners.set(artifact.artifactId, candidate.personaId);
  }
  if (input.policy.reviewRequired) for (const candidate of members) for (const review of candidate.reviews) {
    if (review.producerPersonaId === review.reviewerPersonaId || !members.some(x => x.personaId === review.reviewerPersonaId)) exclusions.push({ code:'REVIEWER_NOT_INDEPENDENT', candidateId:candidate.candidateId, artifactId:review.artifactId });
  }
  exclusions.sort((a,b) => (a.candidateId < b.candidateId ? -1 : a.candidateId > b.candidateId ? 1 : 0) || (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));
  if (exclusions.some(x => ['BUDGET_EXCEEDED','BUDGET_UNKNOWN','ARTIFACT_OWNERSHIP_CONFLICT','REVIEWER_NOT_INDEPENDENT'].includes(x.code))) return detached({ kind:'abstained', code: exclusions.find(x => x.code === 'BUDGET_EXCEEDED')?.code ?? 'BUDGET_UNKNOWN', eligible:[], exclusions });
  return detached({ kind:'accepted', eligible:members, exclusions });
}
