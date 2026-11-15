import { resolve } from 'path';
import { storage, context, api, llm } from '@forge/api';
import { runProjectSettings, runIssuePanel, getReadiness, getEvidence, recommendActions, draftBrief, seedDemoData } from './handlers';

// Entry points
export const handler = {
  runProjectSettings,
  runIssuePanel,
  getReadiness,
  getEvidence,
  recommendActions,
  draftBrief,
  seedDemoData,
};

// Export handlers for Forge
export {
  runProjectSettings as main,
  runIssuePanel as issuePanel,
  getReadiness,
  getEvidence,
  recommendActions,
  draftBrief,
  seedDemoData,
};
