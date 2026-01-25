import { Test, TestingModule } from '@nestjs/testing';
import { AgentLearningService } from '../agent-learning.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { DecisionTraceService } from '../decision-trace.service';
import { AgentType } from '../../types/agent.types';

describe('AgentLearningService', () => {
  let service: AgentLearningService;
  let prisma: PrismaService;
  let decisionTrace: DecisionTraceService;

  const mockPrisma = {
    agentFeedback: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    agentExecution: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    agentMetrics: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockDecisionTrace = {
    getAgentMetrics: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentLearningService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: DecisionTraceService, useValue: mockDecisionTrace },
      ],
    }).compile();

    service = module.get<AgentLearningService>(AgentLearningService);
    prisma = module.get<PrismaService>(PrismaService);
    decisionTrace = module.get<DecisionTraceService>(DecisionTraceService);

    jest.clearAllMocks();
  });

  describe('recordFeedback', () => {
    it('should record positive feedback and update metrics', async () => {
      const feedbackData = {
        traceId: 'trace123',
        userId: 'user123',
        feedback: 'positive' as const,
        rating: 5,
        comment: 'Very helpful!',
        timestamp: new Date(),
      };

      mockPrisma.agentExecution.findFirst.mockResolvedValue({
        traceId: 'trace123',
        agentType: AgentType.FINANCIAL_PLANNING,
        success: true,
      });

      mockPrisma.agentMetrics.findUnique.mockResolvedValue({
        agentType: AgentType.FINANCIAL_PLANNING,
        totalExecutions: 100,
        positiveFeedbackCount: 75,
        negativeFeedbackCount: 10,
      });

      await service.recordFeedback(feedbackData);

      expect(mockPrisma.agentFeedback.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            traceId: 'trace123',
            feedback: 'positive',
            rating: 5,
          }),
        }),
      );

      expect(mockPrisma.agentMetrics.update).toHaveBeenCalled();
    });

    it('should create metrics for new agent', async () => {
      const feedbackData = {
        traceId: 'trace456',
        userId: 'user123',
        feedback: 'negative' as const,
        rating: 2,
        timestamp: new Date(),
      };

      mockPrisma.agentExecution.findFirst.mockResolvedValue({
        traceId: 'trace456',
        agentType: AgentType.RISK_ASSESSMENT,
        success: false,
      });

      mockPrisma.agentMetrics.findUnique.mockResolvedValue(null);

      await service.recordFeedback(feedbackData);

      expect(mockPrisma.agentMetrics.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            agentType: AgentType.RISK_ASSESSMENT,
            negativeFeedbackCount: 1,
            positiveFeedbackCount: 0,
          }),
        }),
      );
    });
  });

  describe('getAgentPerformance', () => {
    it('should return performance metrics', async () => {
      mockDecisionTrace.getAgentMetrics.mockResolvedValue({
        agentType: AgentType.FINANCIAL_PLANNING,
        totalExecutions: 100,
        successfulExecutions: 85,
        avgConfidence: 0.82,
        avgDurationMs: 1500,
        positiveFeedbackCount: 70,
        negativeFeedbackCount: 10,
      });

      mockPrisma.agentExecution.findMany.mockResolvedValue([]);

      const performance = await service.getAgentPerformance(
        AgentType.FINANCIAL_PLANNING,
      );

      expect(performance).toBeDefined();
      expect(performance?.successRate).toBe(85);
      expect(performance?.positiveFeedbackRate).toBeCloseTo(87.5, 1); // 70/(70+10)*100
    });

    it('should return null for agent with no metrics', async () => {
      mockDecisionTrace.getAgentMetrics.mockResolvedValue(null);

      const performance = await service.getAgentPerformance(
        AgentType.SIMULATION,
      );

      expect(performance).toBeNull();
    });
  });

  describe('optimizeAgentWeights', () => {
    it('should adjust weights based on performance', async () => {
      // Setup high-performing agent
      mockDecisionTrace.getAgentMetrics.mockResolvedValue({
        agentType: AgentType.INVESTMENT_ADVISOR,
        totalExecutions: 50,
        successfulExecutions: 48,
        avgConfidence: 0.9,
        avgDurationMs: 1200,
        positiveFeedbackCount: 40,
        negativeFeedbackCount: 2,
      });

      mockPrisma.agentExecution.findMany.mockResolvedValue([]);

      const initialWeight = service.getAgentWeight(
        AgentType.INVESTMENT_ADVISOR,
      );
      expect(initialWeight).toBe(1.0);

      await service.optimizeAgentWeights();

      const optimizedWeight = service.getAgentWeight(
        AgentType.INVESTMENT_ADVISOR,
      );
      expect(optimizedWeight).toBeGreaterThan(1.0); // Should increase for high performance
      expect(optimizedWeight).toBeLessThanOrEqual(2.0); // Clamped max
    });

    it('should decrease weights for poor performance', async () => {
      mockDecisionTrace.getAgentMetrics.mockResolvedValue({
        agentType: AgentType.MONITORING,
        totalExecutions: 50,
        successfulExecutions: 25,
        avgConfidence: 0.5,
        avgDurationMs: 3000,
        positiveFeedbackCount: 10,
        negativeFeedbackCount: 30,
      });

      mockPrisma.agentExecution.findMany.mockResolvedValue([]);

      await service.optimizeAgentWeights();

      const optimizedWeight = service.getAgentWeight(AgentType.MONITORING);
      expect(optimizedWeight).toBeLessThan(1.0); // Should decrease for poor performance
      expect(optimizedWeight).toBeGreaterThanOrEqual(0.5); // Clamped min
    });
  });

  describe('generateLearningInsights', () => {
    it('should generate comprehensive insights', async () => {
      mockPrisma.agentExecution.findMany.mockResolvedValue([
        {
          agentType: AgentType.FINANCIAL_PLANNING,
          success: true,
          createdAt: new Date(),
        },
        {
          agentType: AgentType.FINANCIAL_PLANNING,
          success: true,
          createdAt: new Date(),
        },
        {
          agentType: AgentType.RISK_ASSESSMENT,
          success: false,
          createdAt: new Date(),
        },
      ]);

      mockDecisionTrace.getAgentMetrics.mockResolvedValue({
        agentType: AgentType.RISK_ASSESSMENT,
        totalExecutions: 100,
        successfulExecutions: 50,
        avgConfidence: 0.6,
        avgDurationMs: 2000,
        positiveFeedbackCount: 30,
        negativeFeedbackCount: 20,
      });

      const insights = await service.generateLearningInsights();

      expect(insights).toBeDefined();
      expect(insights.patterns).toBeDefined();
      expect(insights.improvements).toBeDefined();
      expect(insights.userBehavior).toBeDefined();

      // Should suggest improvements for low success rate
      const riskImprovements = insights.improvements.filter((i) =>
        i.area.includes('risk_assessment'),
      );
      expect(riskImprovements.length).toBeGreaterThan(0);
    });
  });

  describe('getAllAgentWeights', () => {
    it('should return all agent weights as object', () => {
      const weights = service.getAllAgentWeights();

      expect(weights).toBeDefined();
      expect(typeof weights).toBe('object');
      expect(weights[AgentType.ORCHESTRATOR]).toBe(1.0); // Default weight
    });
  });
});
