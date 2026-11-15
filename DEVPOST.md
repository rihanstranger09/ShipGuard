# Devpost Submission Copy: ShipGuard

## Project Title
**ShipGuard: AI-Powered Release Readiness & Delivery Risk Agent**

## Hackathon
**Codegeist 2026** (Apps for Software Teams)

## Project Link
[https://codegeist2026.devpost.com](https://codegeist2026.devpost.com)

## Description
ShipGuard is a native Atlassian Forge app designed to eliminate release guesswork for Jira, Bitbucket, and Confluence teams. It evaluates release readiness by combining **deterministic risk rules** with **LLM-powered evidence citations**, providing a clear "Go/No-Go" score and actionable recommendations directly within the Atlassian ecosystem.

### Key Features
1. **Jira Project Settings Page**: Select a release version and view a bounded **Readiness Score (0–100)** with status bands (Ready/At Risk/Blocked).
2. **Jira Issue Panel**: See release risk for issues linked to a version, with a "Why?" expansion for detailed breakdown.
3. **Deterministic Risk Engine**: Severity-weighted penalties (Blockers, High Severity, Open PRs, Failing Checks, Unapproved Decisions, Missing Rollbacks, Incidents) with transparent evidence citations.
4. **Rovo Agent Integration**: Ask "ShipGuard" for cited readiness briefs and prioritized action recommendations via 4 MCP tools.
5. **Teamwork Graph Integration**: GraphQL/Cypher relationship discovery (Version → Issues → PRs/Pages) with Direct API fallback for partial context.
6. **Demo Mode**: Seeded data for judges with an obvious "Demo data" badge, ensuring a polished 3-minute demo.

### Technical Innovation
- **Native Forge Architecture**: Built entirely on Atlassian Forge (`manifest.yml`, `@forge/api`, `@forge/llm`, `rovo:agent`).
- **Bounded Deterministic Scoring**: `max(0, min(100, 100 - sum(penalties)))` with explainable rule IDs and recommendations.
- **Evidence-Backed AI**: Every LLM claim cites a source object with a clickable link `[SourceID](URL)`.
- **Teamwork Graph & Fallback**: Uses GraphQL/Cypher for relationship discovery and Direct APIs for robust fallback.

### Value Proposition
- **Judges see value in 30 seconds**: Risk Score + Status Band + Evidence Citations.
- **Core workflow in 3 minutes**: Select Release → Analyze Risk → Ask Rovo Brief → Check Issue Panel.
- **Risk Mitigation**: Prevents shipping blockers, unapproved decisions, and operational gaps.

## Deployment & Testing
- **Forge CLI**: `forge deploy` (Development environment).
- **Scopes**: Declared in `manifest.yml` (no runtime env vars).
- **Demo Seeder**: `forge run seed/seeder.js seed` to enable seeded data mode.
- **Tests**: Jest unit tests for deterministic engine and evidence fetching.

## 3-Minute Demo Video Script
- **0:00-0:30**: Introduction to ShipGuard and Codegeist 2026 category. Show Jira Project Settings Page with Release `v2.4.0` and **Score 65/100 (At Risk)**. Highlight the **Demo Data Badge**.
- **0:30-1:30**: Expand **Risk Breakdown** (Blocker PROJ-101 -35 pts, Missing Rollback -30 pts) and click **Evidence Citations** (`[PROJ-101](url)`).
- **1:30-2:30**: Click **Ask ShipGuard (Rovo Agent)**. Request "Draft a brief for stakeholders". Show the cited summary and prioritized actions.
- **2:30-3:00**: Open a Jira Issue linked to `v2.4.0`. View the **ShipGuard Issue Panel** showing release risk and "Why?" expansion.

## Contact
**Mohammed Rihan Wahid** (`rihanstranger09`)  
[GitHub Repository](https://github.com/rihanstranger09/ShipGuard)
