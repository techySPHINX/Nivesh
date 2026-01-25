import { Test, TestingModule } from '@nestjs/testing';
import { OrchestratorAgent } from '../orchestrator.agent';
import { AgentRegistry } from '../../services/agent-registry.service';
import { ExecutionPlanBuilder } from '../../services/execution-plan-builder.service';
import { DecisionTraceService } from '../../services/decision-trace.service';
import { ToolRegistry } from '../../services/tool-registry.service';
import { AgentType } from '../../types/agent.types';

describe('OrchestratorAgent', () => {
  let orchestrator: OrchestratorAgent;
  let agentRegistry: AgentRegistry;
  let executionPlanBuilder: ExecutionPlanBuilder;
  let decisionTrace: DecisionTraceService;

  const mockAgentRegistry = {
    getAgent: jest.fn(),
    getAllAgents: jest.fn(),
  };

  const mockExecutionPlanBuilder = {
    buildPlan: jest.fn(),
  };

  const mockDecisionTrace = {
    startTrace: jest.fn().mockReturnValue('test-trace-id'),
    recordExecution: jest.fn(),
    completeTrace: jest.fn(),
    failTrace: jest.fn(),
  };

  const mockToolRegistry = {
    registerTool: jest.fn(),
    getTool: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrchestratorAgent,
        { provide: AgentRegistry, useValue: mockAgentRegistry },
        { provide: ExecutionPlanBuilder, useValue: mockExecutionPlanBuilder },
        { provide: DecisionTraceService, useValue: mockDecisionTrace },
        { provide: ToolRegistry, useValue: mockToolRegistry },
      ],
    }).compile();

    orchestrator = module.get<OrchestratorAgent>(OrchestratorAgent);
    agentRegistry = module.get<AgentRegistry>(AgentRegistry);
    executionPlanBuilder = module.get<ExecutionPlanBuilder>(
      ExecutionPlanBuilder,
    );
    decisionTrace = module.get<DecisionTraceService>(DecisionTraceService);

    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should orchestrate goal planning workflow', async () => {
      const input = {
        query: 'I want to save ₹50 lakhs for my child education in 10 years',
        userContext: {
          userId: 'user123',
          riskTolerance: 'moderate',
        },
      };

      const mockPlan = [
        {
          agentType: AgentType.FINANCIAL_PLANNING,
          task: 'Calculate savings rate',
          dependencies: [],
        },
        {
          agentType: AgentType.INVESTMENT_ADVISOR,
          task: 'Recommend investment strategy',
          dependencies: [AgentType.FINANCIAL_PLANNING],
        },
      ];

      mockExecutionPlanBuilder.buildPlan.mockResolvedValue(mockPlan);

      const mockFinancialPlanningAgent = {
        execute: jest.fn().mockResolvedValue({
          result: {
            monthlySavings: 32500,
            goalAchievable: true,
          },
          confidence: 0.85,
          reasoning: ['Calculated based on 12% expected returns'],
        }),
      };

      const mockInvestmentAdvisor = {
        execute: jest.fn().mockResolvedValue({
          result: {
            strategy: 'Balanced equity + debt',
            allocation: { equity: 60, debt: 40 },
          },
          confidence: 0.8,
          reasoning: ['Moderate risk tolerance considered'],
        }),
      };

      mockAgentRegistry.getAgent
        .mockReturnValueOnce(mockFinancialPlanningAgent)
        .mockReturnValueOnce(mockInvestmentAdvisor);

      const result = await orchestrator.execute(input);

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(mockExecutionPlanBuilder.buildPlan).toHaveBeenCalledWith(input);
      expect(mockDecisionTrace.startTrace).toHaveBeenCalledWith(input.query);
      expect(mockDecisionTrace.recordExecution).toHaveBeenCalled();
      expect(mockDecisionTrace.completeTrace).toHaveBeenCalled();
    });

    it('should handle agent execution failure gracefully', async () => {
      const input = {
        query: 'Test query',
        userContext: { userId: 'user123' },
      };

      const mockPlan = [
        {
          agentType: AgentType.RISK_ASSESSMENT,
          task: 'Assess risk',
          dependencies: [],
        },
      ];

      mockExecutionPlanBuilder.buildPlan.mockResolvedValue(mockPlan);

      const mockAgent = {
        execute: jest
          .fn()
          .mockRejectedValue(new Error('Agent execution failed')),
      };

      mockAgentRegistry.getAgent.mockReturnValue(mockAgent);

      await expect(orchestrator.execute(input)).rejects.toThrow(
        'Agent execution failed',
      );
      expect(mockDecisionTrace.failTrace).toHaveBeenCalled();
    });

    it('should pass context between dependent agents', async () => {
      const input = {
        query: 'Portfolio risk analysis',
        userContext: { userId: 'user123' },
      };

      const mockPlan = [
        {
          agentType: AgentType.RISK_ASSESSMENT,
          task: 'Calculate risk',
          dependencies: [],
        },
        {
          agentType: AgentType.SIMULATION,
          task: 'Simulate outcomes',
          dependencies: [AgentType.RISK_ASSESSMENT],
        },
      ];

      mockExecutionPlanBuilder.buildPlan.mockResolvedValue(mockPlan);

      const riskResult = { riskScore: 0.65, volatility: 15 };
      const mockRiskAgent = {
        execute: jest.fn().mockResolvedValue({
          result: riskResult,
          confidence: 0.9,
        }),
      };

      const mockSimulationAgent = {
        execute: jest.fn().mockResolvedValue({
          result: { scenarios: [] },
          confidence: 0.85,
        }),
      };

      mockAgentRegistry.getAgent
        .mockReturnValueOnce(mockRiskAgent)
        .mockReturnValueOnce(mockSimulationAgent);

      await orchestrator.execute(input);

      // Verify simulation agent received risk assessment results
      const simulationInput =
        mockSimulationAgent.execute.mock.calls[0][0];
      expect(simulationInput.additionalContext).toBeDefined();
    });
  });

  describe('canHandle', () => {
    it('should return true for any query (orchestrator handles all)', () => {
      const result = orchestrator.canHandle({
        query: 'Any financial query',
        userContext: { userId: 'test' },
      });

      expect(result).toBe(true);
    });
  });
});
