# ShipGuard: AI-Powered Release Readiness & Delivery Risk Agent

## Overview
ShipGuard is a native Atlassian Forge app for **Codegeist 2026 (Apps for Software Teams)**. It evaluates release readiness for Jira versions by analyzing linked issues, pull requests, decision documents, and incidents.

## Features
- **Jira Project Settings Page**: Select a release version and view the Readiness Score (0–100).
- **Jira Issue Panel**: See release risk for issues linked to a version.
- **Deterministic Risk Engine**: Bounded score with severity-weighted penalties and evidence citations.
- **Rovo Agent**: Ask "ShipGuard" for cited readiness briefs and action recommendations.
- **Teamwork Graph Integration**: GraphQL/Cypher relationship discovery with Direct API fallback.
- **Demo Mode**: Seeded data for judges with "Demo data" badge.

## Architecture
- **Frontend**: Custom UI (HTML/JS) for Project Settings and Issue Panel.
- **Backend**: Node.js resolvers (`@forge/api`) for risk calculation, evidence fetching, and LLM calls.
- **Storage**: Forge Entity Properties for caching and demo mode flag.
- **LLM**: `@forge/llm` for cited explanations and briefs.
- **Rovo**: Agent definition with 4 MCP tools.

## Installation & Deployment
1. **Prerequisites**: Atlassian Forge CLI (`npm install -g @forge/cli`), Jira/Confluence/Bitbucket tenant.
2. **Clone Repository**: `git clone https://github.com/rihanstranger09/ShipGuard.git`
3. **Install Dependencies**: `npm install`
4. **Configure Scopes**: Ensure `manifest.yml` scopes match tenant permissions.
5. **Deploy**:
   ```bash
   forge deploy
   ```
6. **Seed Demo Data**:
   ```bash
   forge run seed/seeder.js seed
   ```
7. **Test**:
   ```bash
   forge test
   ```

## Judge-Testing Instructions (3 Minutes)
1. **0:00-0:30**: Open Jira Project Settings > ShipGuard Release Readiness. Select Release `v2.4.0`. Observe **Score 65/100 (At Risk)** and **Demo Data Badge**.
2. **0:30-1:30**: Review **Risk Breakdown** (Blocker PROJ-101, Missing Rollback) and **Evidence Citations** (clickable links).
3. **1:30-2:30**: Click **Ask ShipGuard (Rovo Agent)**. Request "Draft a brief for stakeholders". Observe cited summary and recommendations.
4. **2:30-3:00**: Open a Jira Issue linked to `v2.4.0`. View **ShipGuard Issue Panel** showing release risk and "Why?" expansion.

## Scopes
- `read:jira:issue`, `read:jira:version`
- `read:confluence:page`
- `read:bitbucket:repository`
- `read:graph:version:jira`, `read:graph:issue:jira`, `read:graph:page:confluence`
- `write:storage`, `read:storage`

## License
MIT

## Devpost Submission Copy
**Title**: ShipGuard: AI-Powered Release Readiness & Delivery Risk Agent  
**Category**: Apps for Software Teams  
**Description**: ShipGuard is a native Forge app that eliminates release guesswork. By combining deterministic risk rules with LLM-powered evidence citations, it provides Jira teams with a clear "Go/No-Go" score and actionable recommendations. Whether it's a blocker issue, an unapproved decision, or a missing rollback plan, ShipGuard surfaces the risks that matter—directly in Jira and Confluence.  
**Value Proposition**: Judges can see the value in 30 seconds (Risk Score + Citations) and complete the core workflow in 3 minutes (Settings Page -> Rovo Brief -> Issue Panel).  
**Technical Innovation**: Native Forge architecture, Teamwork Graph GraphQL integration, `@forge/llm` orchestration, and bounded deterministic scoring.  
**Demo Video Script (3 Minutes)**:
- **0:00-0:30**: Intro ShipGuard and Codegeist category. Show Jira Project Settings Page with Release `v2.4.0` and Score 65 (At Risk).
- **0:30-1:30**: Expand Risk Breakdown (Blocker PROJ-101, Missing Rollback) and click Evidence links.
- **1:30-2:30**: Use Rovo Agent to draft a stakeholder brief. Show cited summary.
- **2:30-3:00**: Show Jira Issue Panel for linked release risk and "Why?" expansion.

## Contact
Mohammed Rihan Wahid (rihanstranger09)
