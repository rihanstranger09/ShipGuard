import { storage, context, api, llm } from '@forge/api';

// Deterministic Rules
const RULES = [
  { id: 'RULE_BLOCKER', title: 'Open blocker issue', penalty: 35, rationale: 'Direct release blocker' },
  { id: 'RULE_HIGH_SEV', title: 'Critical/high-severity unresolved issue', penalty: 20, rationale: 'Likely release risk' },
  { id: 'RULE_OPEN_PR', title: 'Open PR linked to release issue', penalty: 10, rationale: 'Unverified code change' },
  { id: 'RULE_PR_FAIL', title: 'PR with failing checks/missing review', penalty: 15, rationale: 'Deployment-quality risk' },
  { id: 'RULE_DECISION', title: 'Unapproved decision (Confluence)', penalty: 15, rationale: 'Decision uncertainty' },
  { id: 'RULE_ROLLBACK', title: 'Missing rollback/runbook (High risk)', penalty: 10, rationale: 'Operational readiness gap' },
  { id: 'RULE_INCIDENT', title: 'Recent unresolved incident (affected)', penalty: 20, rationale: 'Operational risk' },
];

// Forge LLM Model Selection (Runtime)
async function getSupportedClaudeModel() {
  try {
    // Note: @forge/llm list method is used to find ACTIVE Claude models
    // In the actual Forge runtime, this would be:
    // const models = await llm.list();
    // const haiku = models.find(m => m.id.includes('claude') && m.id.includes('haiku') && m.status === 'ACTIVE');
    // return haiku?.id || 'claude-haiku-4-5-20251001';
    
    // For blueprint/validation purposes, we use the specified model ID:
    return 'claude-haiku-4-5-20251001';
  } catch (e) {
    return null;
  }
}

export async function calculateDeterministicScore(releaseData) {
  if (!releaseData || !releaseData.issues) {
    return { score: 0, status: 'Blocked', breakdown: [], confidence: 'Low', citations: [], demoMode: false };
  }
  const { issues, prs, pages, incidents, demoMode } = releaseData;
  let totalPenalty = 0;
  const breakdown = [];

  const blockers = issues.filter(i => i.priority === 'Blocker' && i.status !== 'Done');
  blockers.forEach(i => { totalPenalty += RULES[0].penalty; breakdown.push({ ruleId: RULES[0].id, title: RULES[0].title, penalty: RULES[0].penalty, evidence: [{ id: i.id, url: i.url }], recommendation: `Resolve blocker ${i.key} before release.` }); });

  const highSev = issues.filter(i => (i.priority === 'High' || i.priority === 'Critical') && i.status !== 'Done' && i.priority !== 'Blocker');
  highSev.forEach(i => { totalPenalty += RULES[1].penalty; breakdown.push({ ruleId: RULES[1].id, title: RULES[1].title, penalty: RULES[1].penalty, evidence: [{ id: i.id, url: i.url }], recommendation: `Review high-severity issue ${i.key}.` }); });

  const openPRs = prs.filter(p => p.state === 'OPEN');
  openPRs.forEach(p => { totalPenalty += RULES[2].penalty; breakdown.push({ ruleId: RULES[2].id, title: RULES[2].title, penalty: RULES[2].penalty, evidence: [{ id: p.id, url: p.url }], recommendation: `Merge or close PR ${p.id}.` }); });

  const failingPRs = prs.filter(p => p.state === 'OPEN' && (p.checksFailed || !p.reviewsApproved));
  failingPRs.forEach(p => { totalPenalty += RULES[3].penalty; breakdown.push({ ruleId: RULES[3].id, title: RULES[3].title, penalty: RULES[3].penalty, evidence: [{ id: p.id, url: p.url }], recommendation: `Fix checks or get reviews for ${p.id}.` }); });

  const unapprovedPages = pages.filter(pg => pg.status !== 'Approved');
  unapprovedPages.forEach(pg => { totalPenalty += RULES[4].penalty; breakdown.push({ ruleId: RULES[4].id, title: RULES[4].title, penalty: RULES[4].penalty, evidence: [{ id: pg.id, url: pg.url }], recommendation: `Approve decision document ${pg.key}.` }); });

  const highRiskIssues = issues.filter(i => i.priority === 'High' || i.priority === 'Blocker');
  const missingRollback = highRiskIssues.filter(i => !i.hasRollback);
  missingRollback.forEach(i => { totalPenalty += RULES[5].penalty; breakdown.push({ ruleId: RULES[5].id, title: RULES[5].title, penalty: RULES[5].penalty, evidence: [{ id: i.id, url: i.url }], recommendation: `Create rollback plan for ${i.key}.` }); });

  const recentIncidents = incidents.filter(inc => inc.status !== 'Resolved');
  recentIncidents.forEach(inc => { totalPenalty += RULES[6].penalty; breakdown.push({ ruleId: RULES[6].id, title: RULES[6].title, penalty: RULES[6].penalty, evidence: [{ id: inc.id, url: inc.url }], recommendation: `Resolve incident ${inc.key} affecting release components.` }); });

  const rawScore = 100 - totalPenalty;
  const score = Math.max(0, Math.min(100, rawScore));
  let status = 'Ready';
  if (score < 50) status = 'Blocked';
  else if (score < 80) status = 'At Risk';

  return { score, status, breakdown, confidence: breakdown.length > 0 ? 'High' : 'Low', citations: breakdown.flatMap(b => b.evidence), demoMode };
}

export async function fetchEvidence(releaseId) {
  if (!releaseId) return { issues: [], prs: [], pages: [], incidents: [], demoMode: false, partialContext: true };
  const ctx = context.getContext();
  const isDemo = await storage.get('DemoModeFlag') === 'true';

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
  return { issues: [], prs: [], pages: [], incidents: [], demoMode: false, partialContext: true };
}

// MCP Handlers
export async function getReleaseReadiness(args) {
  const { releaseId, includeEvidence = true } = args || {};
  if (!releaseId) return { score: 0, status: 'Blocked', deterministicBreakdown: [], aiExplanation: 'ERROR: MISSING_RELEASE_ID', confidence: 'Low', citations: [], demoMode: false, ok: false, error: 'MISSING_RELEASE_ID' };
  
  const evidence = await fetchEvidence(releaseId);
  const result = await calculateDeterministicScore(evidence);

  let aiExplanation = '';
  if (includeEvidence) {
    const modelId = await getSupportedClaudeModel();
    if (!modelId) {
      aiExplanation = 'LLM_UNAVAILABLE: No active Claude model found. Deterministic score only.';
    } else {
      try {
        const llmResponse = await llm.createCompletion({
          model: modelId,
          prompt: `Analyze release readiness for version ${releaseId}. Score: ${result.score} (${result.status}). Breakdown: ${JSON.stringify(result.breakdown)}. Evidence: ${JSON.stringify(evidence)}. Provide a cited explanation.`,
          maxTokens: 500,
        });
        aiExplanation = llmResponse.choices[0].text;
      } catch (e) {
        aiExplanation = 'LLM_TIMEOUT_OR_ERROR: Deterministic score only.';
      }
    }
  }

  return { ...result, aiExplanation, ok: true, error: null };
}

export async function getReleaseEvidence(args) {
  const { releaseId } = args || {};
  if (!releaseId) return { issues: [], prs: [], pages: [], incidents: [], demoMode: false, partialContext: true, ok: false, error: 'MISSING_RELEASE_ID' };
  const evidence = await fetchEvidence(releaseId);
  return { ...evidence, ok: true, error: null };
}

export async function recommendReleaseActions(args) {
  const { releaseId } = args || {};
  if (!releaseId) return { actions: [], ok: false, error: 'MISSING_RELEASE_ID' };
  const evidence = await fetchEvidence(releaseId);
  const result = await calculateDeterministicScore(evidence);
  const actions = result.breakdown.map(b => ({ title: b.title, description: b.recommendation, url: b.evidence[0]?.url || '', priority: b.penalty >= 20 ? 'High' : 'Medium' }));
  return { actions, ok: true, error: null };
}

export async function draftReleaseBrief(args) {
  const { releaseId, audience = 'Stakeholders' } = args || {};
  if (!releaseId) return { brief: '', citations: [], ok: false, error: 'MISSING_RELEASE_ID' };
  const readiness = await getReleaseReadiness({ releaseId, includeEvidence: true });
  if (!readiness.ok) return readiness;
  
  const modelId = await getSupportedClaudeModel();
  if (!modelId) {
    return { brief: 'LLM_UNAVAILABLE: Deterministic summary only. Score: ${readiness.score}.', citations: readiness.citations, ok: true, error: null };
  }

  try {
    const llmResponse = await llm.createCompletion({
      model: modelId,
      prompt: `Draft a ${audience}-ready go/no-go summary for release ${releaseId}. Score: ${readiness.score} (${readiness.status}). AI Explanation: ${readiness.aiExplanation}. Citations: ${readiness.citations.map(c => c.url).join(', ')}. Keep it concise and evidence-backed.`,
      maxTokens: 800,
    });
    return { brief: llmResponse.choices[0].text, citations: readiness.citations, ok: true, error: null };
  } catch (e) {
    return { brief: 'LLM_TIMEOUT_OR_ERROR: Deterministic summary only.', citations: readiness.citations, ok: true, error: null };
  }
}

// Project Settings Page Handler
export async function runProjectSettings(args) { return { type: 'customUI', url: '/frontend/project-settings.html' }; }

// Issue Panel Handler
export async function runIssuePanel(args) {
  const { issueKey } = args.context.extension.issue || {};
  const releaseId = 'v2.4.0'; // Default for demo
  const readiness = await getReleaseReadiness({ releaseId });
  return { type: 'customUI', url: `/frontend/issue-panel.html?releaseId=${releaseId}&score=${readiness.score}&status=${readiness.status}`, title: `ShipGuard Risk: ${readiness.status}` };
}

// Admin Action: Seed Demo Data
export async function seedDemoData() {
  await storage.set('DemoModeFlag', 'true');
  return { success: true, message: 'Demo mode enabled in storage' };
}

// Admin Action: Clear Demo Data
export async function clearDemoData() {
  await storage.set('DemoModeFlag', 'false');
  return { success: true, message: 'Demo mode cleared' };
}
