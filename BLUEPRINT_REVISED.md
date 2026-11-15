# ShipGuard Implementation Blueprint (Revised & Approved)
**Hackathon:** Codegeist 2026 (Apps for Software Teams)  
**Branch:** `arena/59051ee4-shipguard`  
**Status:** Approved with Corrections

---

## 1. Product Scope, User Stories, and MVP Cut (Revised)

### Product Scope
**ShipGuard** is an AI-powered Release Readiness & Delivery Risk Agent for Atlassian Jira, Bitbucket, and Confluence, built as a native Forge app. It evaluates release readiness via a **Jira Project Settings Page** (selection + analysis) and **Jira Issue Panel** (linked release risk), using deterministic rules and `@forge/llm` for cited explanations.

### User Stories (MVP)
1. **Release Manager:** As a Release Manager, I go to the Jira Project Settings > ShipGuard page, select Release Version `v2.4.0`, and see a bounded Readiness Score (0–100) with evidence-linked deductions, so I can decide to ship.
2. **Developer:** As a developer, I open a Jira Issue linked to `v2.4.0` and see a ShipGuard panel showing the release risk for that issue’s version, so I understand blockers.
3. **Stakeholder:** As a stakeholder, I ask the Rovo agent "Draft a readiness brief for v2.4.0" and get a cited summary, so I can approve.

### MVP Cut (Achievable in 3 Minutes)
- **Jira Project Settings Page:** Release selection + Readiness Score + Evidence + "Ask ShipGuard" Rovo button.
- **Jira Issue Panel:** Shows risk for the issue's linked release version (fallback if version page unavailable).
- **Deterministic Engine:** Bounded score (0–100) with severity-weighted penalties.
- **Rovo Agent:** 4 MCP tools (`get_release_readiness`, `get_release_evidence`, `recommend_release_actions`, `draft_release_brief`).
- **Demo Mode:** Seeded data badge + Live data fallback (Teamwork Graph GraphQL/Cypher + Direct APIs).

---

## 2. Forge Architecture (Revised)

### Module Wiring (`manifest.yml`)
- **`jira:projectSettingsPage`**: `frontend/ProjectSettings.jsx` (Release selection + Score + Evidence)
- **`jira:issuePanel`**: `frontend/IssuePanel.jsx` (Linked release risk)
- **`backend/index.js`**: Resolvers (`getReadiness`, `getEvidence`, `recommendActions`, `draftBrief`)
- **`llm` module**: `@forge/llm` for AI explanations and briefs.
- **`storage`**: `ReleaseRiskCache` (Key: `releaseId`)
- **`rovo:agent`**: ShipGuard Agent + `rovo:mcp` (Tool definitions)
- **Scopes**: `read:jira:issue`, `read:jira:version`, `read:confluence:page`, `read:bitbucket:repository`, `read:graph:version:jira`, `read:graph:issue:jira`, `read:graph:page:confluence`.

### Backend Resolvers (Node.js/TypeScript)
- `calculateDeterministicScore(releaseData)`: Clamped 0–100, severity-weighted.
- `fetchEvidence(releaseId)`: Teamwork Graph GraphQL/Cypher (fallback: Direct APIs).
- `generateAIExplanation(score, evidence, rules)`: `@forge/llm` call with citations.
- `mcpHandler(toolName, args)`: Implements MCP contracts.

### Storage Model
- **`ReleaseRiskCache`**: Stores score, breakdown, and evidence IDs (TTL: 1h).
- **`DemoModeFlag`**: Boolean (true for judge demo, false for live).

### Frontend (Custom UI/UI Kit)
- **ProjectSettings.jsx**: Release picker, Score Gauge (0–100), Evidence List, Rovo Trigger.
- **IssuePanel.jsx**: Linked release risk summary + "Why?" expansion.
- **DemoBadge**: Visible when `DemoModeFlag` is true.

---

## 3. Jira Extension Strategy (Revised)

### Primary Surface: Jira Project Settings Page
- **Module**: `jira:projectSettingsPage`
- **Path**: `/shipguard/release-readiness`
- **Context**: `useProductContext()` provides `projectKey`, `accountId`.
- **UI**: Release Version dropdown (fetched via `jira:version` API) -> Analysis.

### Secondary Surface: Jira Issue Panel
- **Module**: `jira:issuePanel`
- **Context**: `issue.fields.fixVersions` (linked release).
- **UI**: Risk summary for the linked release + "View Full Analysis" (links to Project Settings page).

### Fallback Strategy
- If `jira:projectSettingsPage` is not available in the judge's tenant, use a **Jira App Page** (`jira:appPage`) accessible from the project sidebar.

---

## 4. Risk-Scoring Rules (Bounded & Explainable)

### Formula
`Score = max(0, min(100, 100 - sum(penalties)))`

### Penalties (Severity-Weighted)
| Signal | Penalty | Rationale | Rule ID |
|--------|---------|-----------|---------|
| Open blocker issue | 35 | Direct release blocker | `RULE_BLOCKER` |
| Critical/high-severity unresolved issue | 20 | Likely release risk | `RULE_HIGH_SEV` |
| Open PR linked to release issue | 10 | Unverified code change | `RULE_OPEN_PR` |
| PR with failing checks/missing review | 15 | Deployment-quality risk | `RULE_PR_FAIL` |
| Unapproved decision (Confluence) | 15 | Decision uncertainty | `RULE_DECISION` |
| Missing rollback/runbook (High risk) | 10 | Operational readiness | `RULE_ROLLBACK` |
| Recent unresolved incident (affected) | 20 | Operational risk | `RULE_INCIDENT` |

### Status Bands
- **Ready (80–100)**: Green
- **At Risk (50–79)**: Yellow
- **Blocked (0–49)**: Red

### Evidence & Recommendations
- Each deduction returns: `ruleId`, `title`, `penalty`, `evidence[]` (Source ID + URL), `recommendation`.
- **Example**: `RULE_BLOCKER` -> Penalty: 35, Evidence: `[PROJ-101](url)`, Recommendation: "Resolve blocker before release."

---

## 5. AI Orchestration (`@forge/llm`)

### Context
- Deterministic breakdown + Evidence summaries (Jira issues, PRs, Confluence pages).
- Teamwork Graph relationships (Version -> Issues -> PRs/Pages).

### Citations
- Every sentence references `[SourceID](URL)`.
- **Example**: "The release is blocked by PROJ-101 [PROJ-101](url). Recommendation: Resolve before shipping."

### Confidence Levels
- **High**: All data retrieved (Graph + Direct APIs).
- **Medium**: Partial data (e.g., Bitbucket API timeout).
- **Low**: Missing context (e.g., no linked PRs).

---

## 6. Teamwork Graph Integration (GraphQL/Cypher)

### Queries
- **Version -> Issues**:
  ```graphql
  query {
    version(id: "RELEASE_ID") {
      id
      issues(first: 50) {
        nodes {
          id
          key
          summary
          priority
          status
          linkedPRs { nodes { id url status } }
          linkedPages { nodes { id url title } }
        }
      }
    }
  }
  ```
- **Scopes**: `read:graph:version:jira`, `read:graph:issue:jira`, `read:graph:page:confluence`.

### Fallback (Direct APIs)
- **Jira**: `GET /rest/api/3/version/{id}/issue`
- **Bitbucket**: `GET /rest/api/1.0/projects/{project}/repos/{repo}/pull-requests` (linked to issue)
- **Confluence**: `GET /rest/api/content/search?cql=type=page AND "release v2.4.0"`
- **Label**: "Partial context (Graph unavailable)" in UI.

---

## 7. Rovo Agent & MCP Tools

### Agent Identity
- **Name**: ShipGuard
- **Persona**: Senior Release Engineer. Evidence-driven, concise.
- **Skills**: Readiness analysis, evidence citation, action recommendation, brief drafting.

### MCP Tools (JSON Schemas)
1. **`get_release_readiness(releaseId)`**
   - **Response**: `{ score, status, breakdown: [{ruleId, title, penalty, evidence[], recommendation}], confidence, citations }`
2. **`get_release_evidence(releaseId)`**
   - **Response**: `{ issues: [...], prs: [...], pages: [...], deployments: [...], incidents: [...] }`
3. **`recommend_release_actions(releaseId)`**
   - **Response**: `{ actions: [{title, description, url, priority}] }`
4. **`draft_release_brief(releaseId, audience)`**
   - **Response**: `{ brief: "string", citations: [...] }` (via `@forge/llm`)

### Guardrails
- No fabrication. Use `[SourceID](URL)` for every claim.
- Clamp score 0–100.
- Label "Demo data" if `DemoModeFlag` is true.

---

## 8. Demo Dataset (Seeded Mode)

### Release `v2.4.0` (Seeded)
- **Jira Issues**:
  - `PROJ-101` (Blocker, Open): "Critical auth bug" [Link] (Penalty: 35)
  - `PROJ-102` (High, Open): "UI lag" [Link] (Penalty: 20)
  - `PROJ-103` (Done): "Docs" [Link] (Penalty: 0)
- **Bitbucket PRs**:
  - `BIT-45` (Open, Linked to PROJ-101): "Fix auth" [Link] (Penalty: 10 + 15 = 25)
  - `BIT-46` (Merged, Linked to PROJ-103): "Docs" [Link] (Penalty: 0)
- **Confluence Pages**:
  - `CONF-99` (Unapproved, Linked): "Deployment Plan" [Link] (Penalty: 15)
- **Incidents**:
  - `INC-500` (Unresolved, Affected): "DB latency" [Link] (Penalty: 20)

### Score Calculation (Demo)
`100 - (35 + 20 + 10 + 15 + 15 + 10 + 20) = -25` -> **Clamped to 0 (Blocked)**
*Wait, let's adjust for a realistic "At Risk" demo (Score 65):*
- `PROJ-101` (Blocker, Open): 35
- `PROJ-103` (Done): 0
- `BIT-46` (Merged): 0
- `CONF-99` (Approved): 0
- `INC-500` (Resolved): 0
- **Score**: `100 - 35 = 65 (At Risk)`

---

## 9. Deployment, Testing, Security, Accessibility, Judge-Demo Plan

### Deployment
- **Forge CLI**: `forge deploy` (Development)
- **Scopes**: Declared in `manifest.yml` (no runtime env vars).
- **Tenant**: Resolved via installed-app context.

### Testing
- **Unit**: Jest for deterministic rules.
- **Integration**: Forge `test` with mocked Graph/Direct APIs.
- **Accessibility**: ARIA, keyboard, contrast.

### Security
- **Permissions**: Respect scopes.
- **Data**: No PII stored.

### Judge-Demo Plan (3 Minutes)
1. **0:00-0:30**: Intro ShipGuard (Release Readiness Agent) + Codegeist category.
2. **0:30-1:30**: Jira Project Settings Page -> Select `v2.4.0` -> Score 65 (At Risk) -> Evidence (Blocker PROJ-101, etc.) -> "Demo data" badge.
3. **1:30-2:30**: Rovo Agent -> "Draft brief for v2.4.0" -> Cited summary + Recommendations.
4. **2:30-3:00**: Jira Issue Panel (linked release risk) -> "Why?" expansion -> Judge sees value in 30s.

---

## 10. Next Steps (Code Generation)

Upon final confirmation, I will generate:
1. `manifest.yml` (Scopes, Modules, LLM, Rovo)
2. `backend/` (Resolvers, Deterministic Engine, MCP Tools, Graph/Direct Fallback)
3. `frontend/` (ProjectSettings, IssuePanel, UI Kit components)
4. `rovo/` (Agent definition, Prompts)
5. `seed/` (Demo data seeder)
6. `tests/` (Unit/Integration)
7. `README.md` (Deployment, Judge instructions)
8. `DEVPOST.md` (Submission copy, 3-min demo video script)

**Ready to proceed with code generation?**