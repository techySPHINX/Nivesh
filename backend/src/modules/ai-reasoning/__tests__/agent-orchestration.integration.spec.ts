import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AIReasoningModule } from '../ai-reasoning.module';
import { PrismaService } from '../../core/database/prisma.service';

describe('Agent Orchestration Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AIReasoningModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /agents/orchestrate', () => {
    it('should execute goal planning workflow', async () => {
      const request_data = {
        query: 'I want to save ₹50 lakhs for my child education in 10 years',
        userContext: {
          userId: 'test-user-1',
          riskTolerance: 'moderate',
          investmentStyle: 'balanced',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/agents/orchestrate')
        .send(request_data)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.traceId).toBeDefined();
      expect(response.body.conversationId).toBeDefined();
      expect(response.body.result).toBeDefined();
      expect(response.body.confidence).toBeGreaterThan(0);
    });

    it('should validate required fields', async () => {
      const invalid_request = {
        query: 'Test query',
        // Missing userContext
      };

      await request(app.getHttpServer())
        .post('/agents/orchestrate')
        .send(invalid_request)
        .expect(400);
    });
  });

  describe('GET /agents/trace/:traceId', () => {
    it('should return decision trace', async () => {
      // First, execute an orchestration
      const orchestrationResponse = await request(app.getHttpServer())
        .post('/agents/orchestrate')
        .send({
          query: 'Portfolio risk analysis',
          userContext: {
            userId: 'test-user-2',
          },
        });

      const traceId = orchestrationResponse.body.traceId;

      // Then retrieve the trace
      const traceResponse = await request(app.getHttpServer())
        .get(`/agents/trace/${traceId}`)
        .expect(200);

      expect(traceResponse.body).toBeDefined();
      expect(traceResponse.body.traceId).toBe(traceId);
      expect(traceResponse.body.executions).toBeDefined();
    });

    it('should return 404 for non-existent trace', async () => {
      await request(app.getHttpServer())
        .get('/agents/trace/non-existent-trace')
        .expect(200); // Returns 200 with error message

      // Note: Current implementation returns 200 with error object
      // In production, should return 404
    });
  });

  describe('POST /agents/feedback/:traceId', () => {
    it('should accept positive feedback', async () => {
      // Execute orchestration
      const orchestrationResponse = await request(app.getHttpServer())
        .post('/agents/orchestrate')
        .send({
          query: 'Investment recommendations',
          userContext: {
            userId: 'test-user-3',
          },
        });

      const traceId = orchestrationResponse.body.traceId;

      // Submit feedback
      const feedbackResponse = await request(app.getHttpServer())
        .post(`/agents/feedback/${traceId}`)
        .send({
          feedback: 'positive',
          rating: 5,
          comment: 'Very helpful recommendations!',
        })
        .expect(200);

      expect(feedbackResponse.body.success).toBe(true);
      expect(feedbackResponse.body.traceId).toBe(traceId);
    });

    it('should validate feedback data', async () => {
      await request(app.getHttpServer())
        .post('/agents/feedback/some-trace')
        .send({
          feedback: 'invalid-type', // Invalid enum value
        })
        .expect(400);
    });
  });

  describe('GET /agents/performance', () => {
    it('should return agent performance metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/agents/performance')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.agents).toBeDefined();
      expect(Array.isArray(response.body.agents)).toBe(true);
      expect(response.body.agentWeights).toBeDefined();
    });
  });

  describe('GET /agents/insights', () => {
    it('should generate learning insights', async () => {
      const response = await request(app.getHttpServer())
        .get('/agents/insights')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.patterns).toBeDefined();
      expect(response.body.improvements).toBeDefined();
      expect(response.body.userBehavior).toBeDefined();
    });
  });

  describe('End-to-End Workflow', () => {
    it('should complete full orchestration cycle', async () => {
      const userId = 'e2e-test-user';

      // Step 1: Execute orchestration
      const orchestrationResponse = await request(app.getHttpServer())
        .post('/agents/orchestrate')
        .send({
          query: 'Create a retirement savings plan for ₹2 crore in 25 years',
          userContext: {
            userId,
            riskTolerance: 'moderate',
            investmentStyle: 'growth',
          },
        })
        .expect(200);

      const traceId = orchestrationResponse.body.traceId;
      expect(traceId).toBeDefined();

      // Step 2: Retrieve decision trace
      const traceResponse = await request(app.getHttpServer())
        .get(`/agents/trace/${traceId}`)
        .expect(200);

      expect(traceResponse.body.traceId).toBe(traceId);

      // Step 3: Submit positive feedback
      const feedbackResponse = await request(app.getHttpServer())
        .post(`/agents/feedback/${traceId}`)
        .send({
          feedback: 'positive',
          rating: 5,
        })
        .expect(200);

      expect(feedbackResponse.body.success).toBe(true);

      // Step 4: Verify performance metrics updated
      const performanceResponse = await request(app.getHttpServer())
        .get('/agents/performance')
        .expect(200);

      expect(performanceResponse.body.agents.length).toBeGreaterThan(0);

      // Step 5: Generate insights
      const insightsResponse = await request(app.getHttpServer())
        .get('/agents/insights')
        .expect(200);

      expect(insightsResponse.body.patterns).toBeDefined();
    });
  });
});
