import EvaluationGuardrailAgent from '../agents/EvaluationGuardrailAgent.js';

describe('EvaluationGuardrailAgent', () => {
  const validRec = {
    recommendedPort: 'Otay Mesa',
    recommendedLane: 'standard',
    estimatedWaitMinutes: 20,
    confidence: 'high',
    explanation: 'Otay Mesa is currently 25 minutes faster than San Ysidro.',
    sources: ['CBP BWT API', 'Community Reports (3 reports, 60 min)'],
  };

  it('passes a valid recommendation', async () => {
    const agent = new EvaluationGuardrailAgent();
    const result = await agent.run(validRec);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(1.0);
    expect(result.issues).toHaveLength(0);
  });

  it('fails when sources are missing', async () => {
    const agent = new EvaluationGuardrailAgent();
    const result = await agent.run({ ...validRec, sources: [] });
    expect(result.passed).toBe(false);
    expect(result.issues.some((i) => i.check === 'source_citation')).toBe(true);
  });

  it('fails when estimatedWaitMinutes is out of range', async () => {
    const agent = new EvaluationGuardrailAgent();
    const result = await agent.run({ ...validRec, estimatedWaitMinutes: 700 });
    expect(result.passed).toBe(false);
    expect(result.issues.some((i) => i.check === 'numeric_range')).toBe(true);
  });

  it('always returns a sanitizedResponse', async () => {
    const agent = new EvaluationGuardrailAgent();
    const result = await agent.run({ ...validRec, sources: [] });
    expect(result).toHaveProperty('sanitizedResponse');
  });
});
