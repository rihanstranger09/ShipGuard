import { storage } from '@forge/api';

export async function seed() {
  // Seed Release v2.4.0 Data in Storage (for Demo Mode)
  const demoData = {
    releaseId: 'v2.4.0',
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

  await storage.set('DemoModeFlag', 'true');
  // In a real app, we might store the demoData object too, but for MVP we use the flag to trigger seeded logic in handlers.js
  console.log('ShipGuard Demo Data Seeded');
  return { success: true, message: 'Demo data seeded successfully' };
}

export async function clear() {
  await storage.set('DemoModeFlag', 'false');
  return { success: true, message: 'Demo mode cleared' };
}
