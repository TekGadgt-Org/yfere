import { detached, publicId, type PolicyInput, type TeamResult, type Exclusion } from './contracts.js';
import { evaluateEligibility } from './eligibility.js';
export function reconcileTeam(input:PolicyInput): TeamResult {
  const base = evaluateEligibility(input);
  if (base.kind !== 'accepted') return base;
  const exclusions: Exclusion[] = [...base.exclusions];
  const members = [...base.eligible].map(member => ({ ...member, artifacts:[...new Map(member.artifacts.map(artifact => [artifact.artifactId, artifact])).values()] })).sort((a,b) => a.candidateId < b.candidateId ? -1 : a.candidateId > b.candidateId ? 1 : 0);
  if (members.length > input.policy.maxAgents) exclusions.push({ code:'BUDGET_EXCEEDED', candidateId:'roster' });
  let total: number | 'unknown' = 0;
  let overflow = false;
  for (const member of members) {
    const current: number | 'unknown' = total;
    if (typeof current !== 'number' || typeof member.reservation !== 'number') { total = 'unknown'; break; }
    if (current > Number.MAX_SAFE_INTEGER - member.reservation) { overflow = true; break; }
    total = current + member.reservation;
  }
  if (overflow) exclusions.push({ code:'BUDGET_EXCEEDED', candidateId:'team' });
  else if (total === 'unknown' && input.policy.budget.requireKnownCost) exclusions.push({ code:'BUDGET_UNKNOWN', candidateId:'team' });
  else if (typeof total === 'number' && total > input.policy.budget.sharedUnits) exclusions.push({ code:'BUDGET_EXCEEDED', candidateId:'team' });
  const owners = new Map<string,string>();
  for (const candidate of members) for (const artifact of candidate.artifacts) {
    const prior = owners.get(artifact.artifactId);
    if (prior && prior !== candidate.personaId && input.policy.artifactPolicy === 'exclusive') exclusions.push({ code:'ARTIFACT_OWNERSHIP_CONFLICT', candidateId:publicId(candidate.candidateId), personaId:publicId(candidate.personaId), artifactId:publicId(artifact.artifactId) });
    if (!prior) owners.set(artifact.artifactId, candidate.personaId);
  }
  if (input.policy.reviewRequired) {
    const seenReviews = new Set<string>();
    for (const candidate of members) for (const artifact of candidate.artifacts) {
      const matches = members.flatMap(owner => owner.reviews.map(review => ({ owner, review }))).filter(x => x.review.artifactId === artifact.artifactId);
      if (matches.length !== 1) exclusions.push({ code:'REVIEWER_NOT_INDEPENDENT', candidateId:publicId(candidate.candidateId), artifactId:publicId(artifact.artifactId) });
      for (const { owner, review } of matches) {
        const key = `${review.artifactId}:${review.producerPersonaId}:${review.reviewerPersonaId}`;
        if (seenReviews.has(key) || review.producerPersonaId !== candidate.personaId || review.producerPersonaId !== owner.personaId || review.reviewerPersonaId === review.producerPersonaId || !members.some(x => x.personaId === review.reviewerPersonaId && x.personaId !== review.producerPersonaId) || !input.catalog.personas.find(x => x.id === review.reviewerPersonaId)?.reviewIndependence) exclusions.push({ code:'REVIEWER_NOT_INDEPENDENT', candidateId:publicId(owner.candidateId), artifactId:publicId(review.artifactId) });
        seenReviews.add(key);
      }
    }
  }
  exclusions.sort((a,b) => {
    const left = [a.candidateId,a.code,a.personaId ?? '',a.modelId ?? '',a.skillId ?? '',a.artifactId ?? ''];
    const right = [b.candidateId,b.code,b.personaId ?? '',b.modelId ?? '',b.skillId ?? '',b.artifactId ?? ''];
    for (let i = 0; i < left.length; i++) if (left[i] !== right[i]) return left[i]! < right[i]! ? -1 : 1;
    return 0;
  });
  const precedence = ['ARTIFACT_OWNERSHIP_CONFLICT','REVIEWER_NOT_INDEPENDENT','BUDGET_EXCEEDED','BUDGET_UNKNOWN'] as const;
  const hard = precedence.find(code => exclusions.some(x => x.code === code));
  if (hard) return detached({ kind:'abstained', code:hard, eligible:[], exclusions });
  return detached({ kind:'accepted', eligible:members, exclusions });
}
