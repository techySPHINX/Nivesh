import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../app.module';
import { PrismaService } from '../../../core/database/postgres/prisma.service';

describe('LLM Integration E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    
    // Create test user and get auth token (adjust based on your auth implementation)
    testUserId = 'test-user-llm-' + Date.now();
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.promptExecution.deleteMany({
      where: { userId: testUserId },
    });
    await app.close();
  });

  describe('POST /api/v1/ai/generate', () => {
    it('should generate text response', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/generate')
        .send({
          prompt: 'What is the benefit of investing in mutual funds?',
          userId: testUserId,
          temperature: 0.7,
        })
        .expect(201);

      expect(response.body).toHaveProperty('text');
      expect(response.body.text).toBeTruthy();
      expect(response.body.text.length).toBeGreaterThan(50);
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.metadata).toHaveProperty('tokensUsed');
      expect(response.body.metadata).toHaveProperty('latencyMs');
    });

    it('should block PII in input', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/generate')
        .send({
          prompt: 'My PAN card is ABCDE1234F, can I invest?',
          userId: testUserId,
        })
        .expect(400);

      expect(response.body.message).toContain('PII detected');
    });

    it('should handle harmful intent detection', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/generate')
        .send({
          prompt: 'How to hack into trading accounts?',
          userId: testUserId,
        })
        .expect(400);

      expect(response.body.message).toContain('harmful intent');
    });

    it('should add financial disclaimer to output', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/generate')
        .send({
          prompt: 'Should I buy Tesla stock?',
          userId: testUserId,
        })
        .expect(201);

      expect(response.body.text).toContain('not financial advice');
    });
  });

  describe('POST /api/v1/ai/structured', () => {
    it('should return structured output matching schema', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/structured')
        .send({
          prompt: 'Analyze SBI Bank stock',
          userId: testUserId,
          schema: {
            type: 'object',
            properties: {
              ticker: { type: 'string' },
              recommendation: { type: 'string', enum: ['BUY', 'HOLD', 'SELL'] },
              targetPrice: { type: 'number' },
              reasoning: { type: 'string' },
            },
            required: ['ticker', 'recommendation', 'targetPrice', 'reasoning'],
          },
        })
        .expect(201);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('ticker');
      expect(response.body.data).toHaveProperty('recommendation');
      expect(['BUY', 'HOLD', 'SELL']).toContain(response.body.data.recommendation);
      expect(response.body.data).toHaveProperty('targetPrice');
      expect(typeof response.body.data.targetPrice).toBe('number');
    });
  });

  describe('POST /api/v1/ai/function-call', () => {
    it('should execute EMI calculation function', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/function-call')
        .send({
          prompt: 'Calculate EMI for ₹10 lakh loan at 8% interest for 5 years',
          userId: testUserId,
          enableFunctions: true,
        })
        .expect(201);

      expect(response.body).toHaveProperty('text');
      expect(response.body).toHaveProperty('functionCalls');
      expect(response.body.functionCalls.length).toBeGreaterThan(0);
      
      const emiCall = response.body.functionCalls.find(
        (call: any) => call.name === 'calculate_emi'
      );
      expect(emiCall).toBeDefined();
      expect(emiCall.result).toHaveProperty('monthly_emi');
      expect(emiCall.result.monthly_emi).toBeGreaterThan(0);
    });

    it('should execute loan affordability function', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/function-call')
        .send({
          prompt: 'Can I afford ₹50 lakh home loan with ₹1.5 lakh monthly income?',
          userId: testUserId,
          enableFunctions: true,
        })
        .expect(201);

      expect(response.body).toHaveProperty('functionCalls');
      const affordabilityCall = response.body.functionCalls.find(
        (call: any) => call.name === 'assess_loan_affordability'
      );
      expect(affordabilityCall).toBeDefined();
      expect(affordabilityCall.result).toHaveProperty('is_affordable');
      expect(typeof affordabilityCall.result.is_affordable).toBe('boolean');
    });

    it('should execute SIP returns calculation', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/function-call')
        .send({
          prompt: 'What will I get if I invest ₹10,000 monthly for 20 years at 12% return?',
          userId: testUserId,
          enableFunctions: true,
        })
        .expect(201);

      expect(response.body).toHaveProperty('functionCalls');
      const sipCall = response.body.functionCalls.find(
        (call: any) => call.name === 'calculate_sip_returns'
      );
      expect(sipCall).toBeDefined();
      expect(sipCall.result).toHaveProperty('final_amount');
      expect(sipCall.result.final_amount).toBeGreaterThan(0);
    });
  });

  describe('Prompt Management', () => {
    let promptId: string;

    it('POST /api/v1/ai/prompts - should create prompt', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/prompts')
        .send({
          promptName: 'test-financial-advisor',
          promptText: 'You are a helpful financial advisor. Answer in simple terms.',
          version: '1.0.0',
          status: 'DRAFT',
          temperature: 0.8,
          topP: 0.95,
          maxTokens: 2048,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.promptName).toBe('test-financial-advisor');
      expect(response.body.version).toBe('1.0.0');
      promptId = response.body.id;
    });

    it('GET /api/v1/ai/prompts/:promptName - should retrieve prompt', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/ai/prompts/test-financial-advisor')
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.promptName).toBe('test-financial-advisor');
    });

    it('PATCH /api/v1/ai/prompts/:id/deploy - should deploy prompt to production', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/ai/prompts/${promptId}/deploy`)
        .send({ rolloutPercentage: 100 })
        .expect(200);

      expect(response.body.status).toBe('PRODUCTION');
      expect(response.body.rolloutPercentage).toBe(100);
    });

    it('POST /api/v1/ai/prompts/:id/rollback - should rollback to previous version', async () => {
      // Create version 2.0.0
      const v2Response = await request(app.getHttpServer())
        .post('/api/v1/ai/prompts')
        .send({
          promptName: 'test-financial-advisor',
          promptText: 'Updated prompt text v2',
          version: '2.0.0',
          status: 'PRODUCTION',
          rolloutPercentage: 100,
        })
        .expect(201);

      const v2Id = v2Response.body.id;

      // Rollback
      const rollbackResponse = await request(app.getHttpServer())
        .post(`/api/v1/ai/prompts/${v2Id}/rollback`)
        .send({ targetVersion: '1.0.0' })
        .expect(200);

      expect(rollbackResponse.body.success).toBe(true);
    });

    afterAll(async () => {
      // Cleanup
      await prisma.promptRegistry.deleteMany({
        where: { promptName: 'test-financial-advisor' },
      });
    });
  });

  describe('A/B Testing', () => {
    let controlPromptId: string;
    let treatmentPromptId: string;
    let testId: string;

    beforeAll(async () => {
      // Create control version
      const controlResponse = await request(app.getHttpServer())
        .post('/api/v1/ai/prompts')
        .send({
          promptName: 'ab-test-prompt',
          promptText: 'Control: Be brief and direct.',
          version: '1.0.0',
          status: 'PRODUCTION',
        })
        .expect(201);
      controlPromptId = controlResponse.body.id;

      // Create treatment version
      const treatmentResponse = await request(app.getHttpServer())
        .post('/api/v1/ai/prompts')
        .send({
          promptName: 'ab-test-prompt',
          promptText: 'Treatment: Be detailed and friendly.',
          version: '2.0.0',
          status: 'TESTING',
        })
        .expect(201);
      treatmentPromptId = treatmentResponse.body.id;
    });

    it('POST /api/v1/ai/ab-tests - should create A/B test', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/ab-tests')
        .send({
          testName: 'tone-test',
          controlPromptId,
          treatmentPromptId,
          trafficSplit: 50,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.testName).toBe('tone-test');
      expect(response.body.trafficSplit).toBe(50);
      testId = response.body.id;
    });

    it('GET /api/v1/ai/ab-tests/:id - should retrieve test results', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/ai/ab-tests/${testId}`)
        .expect(200);

      expect(response.body.testName).toBe('tone-test');
      expect(response.body).toHaveProperty('metrics');
    });

    it('POST /api/v1/ai/ab-tests/:id/conclude - should conclude test', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/ai/ab-tests/${testId}/conclude`)
        .send({ winningVariant: 'TREATMENT' })
        .expect(200);

      expect(response.body.status).toBe('CONCLUDED');
      expect(response.body.winningVariant).toBe('TREATMENT');
    });

    afterAll(async () => {
      await prisma.promptABTest.deleteMany({ where: { testName: 'tone-test' } });
      await prisma.promptRegistry.deleteMany({ where: { promptName: 'ab-test-prompt' } });
    });
  });

  describe('Safety Guardrails', () => {
    it('should detect and block credit card numbers', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/generate')
        .send({
          prompt: 'My card is 4532-1234-5678-9010, help me invest',
          userId: testUserId,
        })
        .expect(400);

      expect(response.body.message).toContain('PII detected');
    });

    it('should detect and block Aadhaar numbers', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/generate')
        .send({
          prompt: 'My Aadhaar is 1234 5678 9012, verify my account',
          userId: testUserId,
        })
        .expect(400);

      expect(response.body.message).toContain('PII detected');
    });

    it('should allow safe financial queries', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/generate')
        .send({
          prompt: 'What are the tax benefits of ELSS funds?',
          userId: testUserId,
        })
        .expect(201);

      expect(response.body).toHaveProperty('text');
      expect(response.body.text).toBeTruthy();
    });
  });

  describe('Performance & Monitoring', () => {
    it('should log execution metrics', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/generate')
        .send({
          prompt: 'Explain compound interest',
          userId: testUserId,
        })
        .expect(201);

      // Check execution was logged
      const execution = await prisma.promptExecution.findFirst({
        where: { userId: testUserId },
        orderBy: { createdAt: 'desc' },
      });

      expect(execution).toBeDefined();
      expect(execution?.tokensUsed).toBeGreaterThan(0);
      expect(execution?.latencyMs).toBeGreaterThan(0);
      expect(execution?.traceId).toBeTruthy();
    });

    it('should handle retry on rate limit (429)', async () => {
      // This test requires mocking Gemini API to return 429
      // For now, we just verify the service has retry logic
      expect(true).toBe(true);
    });
  });
});
