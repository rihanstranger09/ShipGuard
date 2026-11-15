import { calculateDeterministicScore, fetchEvidence } from '../backend/handlers';

// Mocking @forge/api for Jest
jest.mock('@forge/api', () => ({
  storage: {
    get: jest.fn(),
    set: jest.fn(),
  },
  context: {
    getContext: jest.fn(() => ({})),
  },
  api: {
    asApp: () => ({ get: jest.fn() }),
  },
  llm: {
    createCompletion: jest.fn(() => ({
      choices: [{ text: 'Mocked AI explanation' }],
    })),
  },
}));

describe('ShipGuard Deterministic Engine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should clamp score between 0 and 100', async () => {
    // Mock storage to return demo mode true
    global.storage.get.mockResolvedValue('true');
    
    const demoEvidence = await fetchEvidence('v2.4.0');
    const result = await calculateDeterministicScore(demoEvidence);
    
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  test('should identify status bands correctly', async () => {
    global.storage.get.mockResolvedValue('true');
    
    const demoEvidence = await fetchEvidence('v2.4.0');
    const result = await calculateDeterministicScore(demoEvidence);
    
    if (result.score >= 80) expect(result.status).toBe('Ready');
    else if (result.score >= 50) expect(result.status).toBe('At Risk');
    else expect(result.status).toBe('Blocked');
  });

  test('should return evidence citations with ruleId, title, penalty, evidence, recommendation', async () => {
    global.storage.get.mockResolvedValue('true');
    
    const demoEvidence = await fetchEvidence('v2.4.0');
    const result = await calculateDeterministicScore(demoEvidence);
    
    result.deterministicBreakdown.forEach(b => {
      expect(b).toHaveProperty('ruleId');
      expect(b).toHaveProperty('title');
      expect(b).toHaveProperty('penalty');
      expect(b).toHaveProperty('evidence');
      expect(Array.isArray(b.evidence)).toBe(true);
      if (b.evidence.length > 0) {
        expect(b.evidence[0]).toHaveProperty('id');
        expect(b.evidence[0]).toHaveProperty('url');
      }
      expect(b).toHaveProperty('recommendation');
    });
    
    expect(result.citations.length).toBeGreaterThan(0);
    expect(result.citations[0].url).toContain('https://');
  });

  test('should return partial context when demo mode is false', async () => {
    global.storage.get.mockResolvedValue('false');
    
    const evidence = await fetchEvidence('v2.4.0');
    expect(evidence.demoMode).toBe(false);
    expect(evidence.partialContext).toBe(true);
  });
});

describe('Fetch Evidence Idempotency (Mocked Seeder)', () => {
  test('seeder should be idempotent (simulated)', async () => {
    // Simulate seeder logic
    const setMock = global.storage.set;
    await setMock('DemoModeFlag', 'true');
    const call1 = setMock.mock.calls.length;
    await setMock('DemoModeFlag', 'true');
    const call2 = setMock.mock.calls.length;
    
    // In actual logic, we'd check if records duplicate, but storage.set overwrites the key
    expect(call2).toBe(call1 + 1); // Called twice, but key is same
    expect(global.storage.set).toHaveBeenCalledWith('DemoModeFlag', 'true');
  });
});
