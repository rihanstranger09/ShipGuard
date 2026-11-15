// Simplified handlers for validation (no @forge/api imports for local node test)
export async function calculateDeterministicScore(releaseData) {
  const { issues, prs, pages, incidents, demoMode } = releaseData;
  let totalPenalty = 0;
  const breakdown = [];

  // 1. Blocker Issues
  const blockers = issues.filter(i => i.priority === 'Blocker' && i.status !== 'Done');
  blockers.forEach(i => {
    totalPenalty += 35;
    breakdown.push({
      ruleId: 'RULE_BLOCKER',
      title: 'Open blocker issue',
      penalty: 35,
      evidence: [{ id: i.id, url: i.url }],
      recommendation: `Resolve blocker ${i.key} before release.`,
    });
  });

  // 2. High Severity Issues
  const highSev = issues.filter(i => (i.priority === 'High' || i.priority === 'Critical') && i.status !== 'Done' && i.priority !== 'Blocker');
  highSev.forEach(i => {
    totalPenalty += 20;
    breakdown.push({
      ruleId: 'RULE_HIGH_SEV',
      title: 'Critical/high-severity unresolved issue',
      penalty: 20,
      evidence: [{ id: i.id, url: i.url }],
      recommendation: `Review high-severity issue ${i.key}.`,
    });
  });

  // 3. Open PRs
  const openPRs = prs.filter(p => p.state === 'OPEN');
  openPRs.forEach(p => {
    totalPenalty += 10;
    breakdown.push({
      ruleId: 'RULE_OPEN_PR',
      title: 'Open PR linked to release issue',
      penalty: 10,
      evidence: [{ id: p.id, url: p.url }],
      recommendation: `Merge or close PR ${p.id}.`,
    });
  });

  // 4. Failing PR Checks
  const failingPRs = prs.filter(p => p.state === 'OPEN' && (p.checksFailed || !p.reviewsApproved));
  failingPRs.forEach(p => {
    totalPenalty += 15;
    breakdown.push({
      ruleId: 'RULE_PR_FAIL',
      title: 'PR with failing checks/missing review',
      penalty: 15,
      evidence: [{ id: p.id, url: p.url }],
      recommendation: `Fix checks or get reviews for ${p.id}.`,
    });
  });

  // 5. Unapproved Decisions
  const unapprovedPages = pages.filter(pg => pg.status !== 'Approved');
  unapprovedPages.forEach(pg => {
    totalPenalty += 15;
    breakdown.push({
      ruleId: 'RULE_DECISION',
      title: 'Unapproved decision (Confluence)',
      penalty: 15,
      evidence: [{ id: pg.id, url: pg.url }],
      recommendation: `Approve decision document ${pg.key}.`,
    });
  });

  // 6. Missing Rollback
  const highRiskIssues = issues.filter(i => i.priority === 'High' || i.priority === 'Blocker');
  const missingRollback = highRiskIssues.filter(i => !i.hasRollback);
  missingRollback.forEach(i => {
    totalPenalty += 10;
    breakdown.push({
      ruleId: 'RULE_ROLLBACK',
      title: 'Missing rollback/runbook (High risk)',
      penalty: 10,
      evidence: [{ id: i.id, url: i.url }],
      recommendation: `Create rollback plan for ${i.key}.`,
    });
  });

  // 7. Recent Incidents
  const recentIncidents = incidents.filter(inc => inc.status !== 'Resolved');
  recentIncidents.forEach(inc => {
    totalPenalty += 20;
    breakdown.push({
      ruleId: 'RULE_INCIDENT',
      title: 'Recent unresolved incident (affected)',
      penalty: 20,
      evidence: [{ id: inc.id, url: inc.url }],
      recommendation: `Resolve incident ${inc.key} affecting release components.`,
    });
  });

  const rawScore = 100 - totalPenalty;
  const score = Math.max(0, Math.min(100, rawScore));

  let status = 'Ready';
  if (score < 50) status = 'Blocked';
  else if (score < 80) status = 'At Risk';

  return {
    score,
    status,
    breakdown,
    confidence: breakdown.length > 0 ? 'High' : 'Low',
    citations: breakdown.flatMap(b => b.evidence),
    demoMode,
  };
}

export async function fetchEvidence(releaseId) {
  // Mocked storage for local validation
  const isDemo = true; // Simulating demo mode for validation

  if (isDemo) {
    return {
      issues: [
        { id: 'PROJ-101', key: 'PROJ-101', summary: 'Critical auth bug', priority: 'Blocker', status: 'Open', url: 'https://jira.example.com/browse/PROJ-101', hasRollback: false },
        { id: 'PROJ-103', key: 'PROJ-103', summary: 'Docs', priority: 'Low', status: 'Done', url: 'https://jira.example.com/browse/PROJ-103', hasRollback: true },
      ],
      prs: [
        { id: 'BIT-45', url: 'https://bitbucket.example.com/pull-requests/45', state: 'OPEN', checksFailed: true, reviewsApproved: false },
        { id: 'BIT-46', url: 'https://bitbucket.example.com/pull-requests/46', state: 'MERGED', checksFailed: false, reviewsApproved: true },
      ],
      pages: [
        { id: 'CONF-99', key: 'CONF-99', title: 'Deployment Plan', status: 'Approved', url: 'https://confluence.example.com/pages/99' },
      ],
      incidents: [],
      demoMode: true,
    };
  }

  return {
    issues: [],
    prs: [],
    pages: [],
    incidents: [],
    demoMode: false,
    partialContext: true,
  };
}

// MCP Handlers
export async function getReleaseReadiness(args) {
  const { releaseId, includeEvidence = true } = args;
  const evidence = await fetchEvidence(releaseId);
  const result = await calculateDeterministicScore(evidence);

  let aiExplanation = '';
  if (includeEvidence) {
    aiExplanation = `Mocked AI explanation for ${releaseId}. Score: ${result.score} (${result.status}). Confidence: ${result.confidence}.`;
  }

  return {
    score: result.score,
    status: result.status,
    deterministicBreakdown: result.breakdown,
    aiExplanation,
    confidence: result.confidence,
    citations: result.citations,
    demoMode: evidence.demoMode,
  };
}

export async function getReleaseEvidence(args) {
  const { releaseId } = args;
  const evidence = await fetchEvidence(releaseId);
  return evidence;
}

export async function recommendReleaseActions(args) {
  const { releaseId } = args;
  const evidence = await fetchEvidence(releaseId);
  const result = await calculateDeterministicScore(evidence);
  
  const actions = result.breakdown.map(b => ({
    title: b.title,
    description: b.recommendation,
    url: b.evidence[0]?.url || '',
    priority: b.penalty >= 20 ? 'High' : 'Medium',
  }));

  return { actions };
}

export async function draftReleaseBrief(args) {
  const { releaseId, audience = 'Stakeholders' } = args;
  const readiness = await getReleaseReadiness({ releaseId, includeEvidence: true });
  
  const brief = `Stakeholder Brief for Release ${releaseId}:
**Status**: ${readiness.status} (${readiness.score}/100) [1].
**Summary**: ${readiness.aiExplanation}
**Evidence**: ${readiness.citations.map(c => c.url).join(', ')}.
[1] Source: ShipGuard Engine`;

  return {
    brief,
    citations: readiness.citations,
  };
}
