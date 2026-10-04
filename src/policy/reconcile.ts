import { detached, publicId, type PolicyInput, type TeamResult, type Exclusion } from './contracts.js';
import { evaluateEligibilityInternal, sanitizeEligibilityResult } from './eligibility.js';

export function reconcileTeam(input:PolicyInput): TeamResult {
  const base = evaluateEligibilityInternal(input);
  if (base.kind !== 'accepted') return sanitizeEligibilityResult(base);
  const exclusions: Exclusion[] = [...base.exclusions];
  const members = [...base.eligible].map(member => ({ ...member, artifacts:[...new Map(member.artifacts.map(artifact => [artifact.artifactId, artifact])).values()] })).sort((a,b) => a.candidateId < b.candidateId ? -1 : a.candidateId > b.candidateId ? 1 : 0);
  if (members.length > input.policy.maxAgents) exclusions.push({ code:'BUDGET_EXCEEDED', candidateId:'roster' });
  let total: number | 'unknown' = 0; let overflow = false;
  for (const member of members) {
    if (typeof total !== 'number' || typeof member.reservation !== 'number') { total = 'unknown'; break; }
    if (total > Number.MAX_SAFE_INTEGER - member.reservation) { overflow = true; break; }
    total += member.reservation;
  }
  if (overflow) exclusions.push({ code:'BUDGET_EXCEEDED', candidateId:'team' });
  else if (total === 'unknown' && input.policy.budget.requireKnownCost) exclusions.push({ code:'BUDGET_UNKNOWN', candidateId:'team' });
  else if (typeof total === 'number' && total > input.policy.budget.sharedUnits) exclusions.push({ code:'BUDGET_EXCEEDED', candidateId:'team' });
  const owners = new Map<string,string>();
  for (const member of members) for (const artifact of member.artifacts) {
    const prior = owners.get(artifact.artifactId);
    if (prior && prior !== member.personaId && input.policy.artifactPolicy === 'exclusive') exclusions.push({ code:'ARTIFACT_OWNERSHIP_CONFLICT', candidateId:publicId(member.candidateId), personaId:publicId(member.personaId), artifactId:publicId(artifact.artifactId) });
    if (!prior) owners.set(artifact.artifactId, member.personaId);
  }
  if (input.policy.reviewRequired) {
    const relations = members.flatMap(owner => owner.reviews.map(review => ({ owner, review })));
    const artifactIds = new Set(members.flatMap(member => member.artifacts.map(artifact => artifact.artifactId)));
    const seen = new Set<string>();
    for (const { owner, review } of relations) {
      const actualOwner = members.find(member => member.artifacts.some(artifact => artifact.artifactId === review.artifactId));
      const reviewer = members.find(member => member.personaId === review.reviewerPersonaId);
      const catalogReviewer = input.catalog.personas.find(persona => persona.id === review.reviewerPersonaId);
      const key = `${review.artifactId}:${review.producerPersonaId}:${review.reviewerPersonaId}`;
      if (!artifactIds.has(review.artifactId) || !actualOwner || actualOwner.personaId !== review.producerPersonaId || owner.personaId !== review.reviewerPersonaId || !reviewer || reviewer.personaId === review.producerPersonaId || !catalogReviewer?.reviewIndependence || seen.has(key)) exclusions.push({ code:'REVIEWER_NOT_INDEPENDENT', candidateId:publicId(owner.candidateId), artifactId:publicId(review.artifactId) });
      seen.add(key);
    }
    for (const member of members) for (const artifact of member.artifacts) {
      const valid = relations.filter(({ owner, review }) => owner.personaId === review.reviewerPersonaId && review.producerPersonaId === member.personaId && review.artifactId === artifact.artifactId && members.some(x => x.personaId === review.reviewerPersonaId && x.personaId !== member.personaId) && input.catalog.personas.find(x => x.id === review.reviewerPersonaId)?.reviewIndependence);
      if (valid.length !== 1) exclusions.push({ code:'REVIEWER_NOT_INDEPENDENT', candidateId:publicId(member.candidateId), artifactId:publicId(artifact.artifactId) });
    }
  }
  exclusions.sort((a,b) => `${a.candidateId}|${a.code}|${a.artifactId ?? ''}` < `${b.candidateId}|${b.code}|${b.artifactId ?? ''}` ? -1 : 1);
  const precedence = ['ARTIFACT_OWNERSHIP_CONFLICT','REVIEWER_NOT_INDEPENDENT','BUDGET_EXCEEDED','BUDGET_UNKNOWN'] as const;
  const hard = precedence.find(code => exclusions.some(x => x.code === code));
  const result: TeamResult = hard ? { kind:'abstained', code:hard, eligible:[], exclusions } : { kind:'accepted', eligible:members, exclusions };
  return sanitizeEligibilityResult(result);
}
