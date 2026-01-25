import { Test, TestingModule } from '@nestjs/testing';
import { OrchestratorAgent } from '../orchestrator.agent';
import { AgentRegistry } from '../../services/agent-registry.service';
import { DecisionTraceService } from '../../services/decision-trace.service';
import { ToolRegistry } from '../../services/tool-registry.service';
import { SemanticRetrieverService } from '../../../rag-pipeline/application/services/semantic-retriever.service';
import { ContextBuilderService } from '../../../rag-pipeline/application/services/context-builder.service';
import { AgentMemoryService } from '../../services/agent-memory.service';
import { AgentType, AgentMessage } from '../../types/agent.types';

describe('OrchestratorAgent - RAG Integration', () => {
  let orchestrator: OrchestratorAgent;
  let semanticRetriever: SemanticRetrieverService;
  let contextBuilder: ContextBuilderService;
  let agentMemory: AgentMemoryService;
  let agentRegistry: AgentRegistry;

  const mockSemanticRetriever = {
    retrieveContext: jest.fn(),
  };

  const mockContextBuilder = {
    buildContext: jest.fn(),
  };

  const mockAgentMemory = {
    getUserPreferences: jest.fn(),
    getRelevantConversations: jest.fn(),
    storeMessage: jest.fn(),
    storeResponse: jest.fn(),
  };

  const mockAgentRegistry = {
    routeMessage: jest.fn(),
    getAgent: jest.fn(),
  };

  const mockDecisionTrace = {
    generateTraceId: jest.fn().mockResolvedValue('test-trace-id'),
    startTrace: jest.fn(),
    recordExecution: jest.fn(),
    completeTrace: jest.fn(),
    recordReasoning: jest.fn(),
  };

  const mockToolRegistry = {
    getTool: jest.fn(),
    registerTool: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrchestratorAgent,
        { provide: AgentRegistry, useValue: mockAgentRegistry },
        { provide: DecisionTraceService, useValue: mockDecisionTrace },
        { provide: ToolRegistry, useValue: mockToolRegistry },
        { provide: SemanticRetrieverService, useValue: mockSemanticRetriever },
        { provide: ContextBuilderService, useValue: mockContextBuilder },
        { provide: AgentMemoryService, useValue: mockAgentMemory },
      ],
    }).compile();

    orchestrator = module.get<OrchestratorAgent>(OrchestratorAgent);
    semanticRetriever = module.get<SemanticRetrieverService>(SemanticRetrieverService);
    contextBuilder = module.get<ContextBuilderService>(ContextBuilderService);
    agentMemory = module.get<AgentMemoryService>(AgentMemoryService);
    agentRegistry = module.get<AgentRegistry>(AgentRegistry);

    jest.clearAllMocks();
  });

  describe('RAG-Enhanced Orchestration', () => {
    it('should retrieve relevant context from RAG pipeline', async () => {
      const userId = 'user123';
      const query = 'I want to save ₹50 lakhs for my child education in 10 years';

      // Mock RAG retrieval results
      const ragResults = [
        {
          content: 'User has existing SIP of ₹10,000/month',
          score: 0.92,
          metadata: { type: 'transaction', category: 'SIP' },
        },
        {
          content: 'User has education goal with target ₹40L',
          score: 0.88,
          metadata: { type: 'goal', priority: 'high' },
        },
        {
          content: 'User\'s risk profile: moderate',
          score: 0.85,
          metadata: { type: 'user_profile', riskTolerance: 'moderate' },
        },
      ];

      mockSemanticRetriever.retrieveContext.mockResolvedValue(ragResults);
      mockContextBuilder.buildContext.mockResolvedValue({
        userContext: 'User has ongoing investments and education goal',
        relevantFacts: ['SIP: ₹10K/month', 'Risk: moderate'],
      });

      // Mock user preferences
      mockAgentMemory.getUserPreferences.mockResolvedValue({
        riskTolerance: 'moderate',
        investmentStyle: 'balanced',
        preferredAgents: [AgentType.FINANCIAL_PLANNING],
        communicationStyle: 'detailed',
      });

      mockAgentMemory.getRelevantConversations.mockResolvedValue([
        {
          conversationId: 'conv1',
          messages: [{ content: 'Previous goal planning discussion' }],
        },
      ]);

      // Mock agent execution
      mockAgentRegistry.routeMessage.mockResolvedValue([
        {
          success: true,
          result: { monthlySavings: 32500 },
          confidence: 0.85,
          reasoning: ['Calculated based on 12% returns'],
        },
      ]);

      const message: AgentMessage = {
        id: 'msg1',
        from: AgentType.ORCHESTRATOR,
        to: [AgentType.ORCHESTRATOR],
        type: 'request',
        payload: {
          query,
          context: { userId, traceId: 'trace1' },
        },
        timestamp: new Date(),
      };

      const result = await orchestrator.execute(message);

      // Verify RAG pipeline was called
      expect(mockSemanticRetriever.retrieveContext).toHaveBeenCalledWith(
        query,
        userId,
        expect.objectContaining({
          topK: 8,
          scoreThreshold: 0.7,
        }),
      );

      // Verify context builder was called
      expect(mockContextBuilder.buildContext).toHaveBeenCalled();

      // Verify user preferences retrieved
      expect(mockAgentMemory.getUserPreferences).toHaveBeenCalledWith(userId);

      // Verify conversation history retrieved
      expect(mockAgentMemory.getRelevantConversations).toHaveBeenCalledWith(
        userId,
        expect.any(String),
        3,
      );

      // Verify execution succeeded
      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
    });

    it('should handle RAG failure gracefully', async () => {
      const userId = 'user123';
      const query = 'Portfolio review';

      // Mock RAG failure
      mockSemanticRetriever.retrieveContext.mockRejectedValue(
        new Error('Vector store connection failed'),
      );

      // Mock minimal memory retrieval
      mockAgentMemory.getUserPreferences.mockResolvedValue({
        riskTolerance: 'moderate',
        investmentStyle: 'balanced',
        preferredAgents: [],
        communicationStyle: 'concise',
      });

      mockAgentMemory.getRelevantConversations.mockResolvedValue([]);

      // Mock agent execution
      mockAgentRegistry.routeMessage.mockResolvedValue([
        {
          success: true,
          result: { analysis: 'Portfolio analyzed' },
          confidence: 0.75,
          reasoning: ['Analysis completed without RAG context'],
        },
      ]);

      const message: AgentMessage = {
        id: 'msg2',
        from: AgentType.ORCHESTRATOR,
        to: [AgentType.ORCHESTRATOR],
        type: 'request',
        payload: {
          query,
          context: { userId, traceId: 'trace2' },
        },
        timestamp: new Date(),
      };

      const result = await orchestrator.execute(message);

      // Should still succeed despite RAG failure
      expect(result.success).toBe(true);

      // Verify fallback behavior
      expect(mockSemanticRetriever.retrieveContext).toHaveBeenCalled();
    });

    it('should personalize based on user preferences', async () => {
      const userId = 'user456';
      const query = 'Investment recommendations';

      // Mock user preferences with specific preferences
      mockAgentMemory.getUserPreferences.mockResolvedValue({
        riskTolerance: 'aggressive',
        investmentStyle: 'growth',
        preferredAgents: [AgentType.INVESTMENT_ADVISOR],
        communicationStyle: 'concise',
        financialGoals: [
          { type: 'wealth_creation', priority: 'high' },
        ],
      });

      mockAgentMemory.getRelevantConversations.mockResolvedValue([]);

      mockSemanticRetriever.retrieveContext.mockResolvedValue([
        {
          content: 'User prefers high-growth stocks',
          score: 0.9,
          metadata: { type: 'preference' },
        },
      ]);

      mockContextBuilder.buildContext.mockResolvedValue({
        userPreferences: 'Aggressive investor seeking growth',
      });

      mockAgentRegistry.routeMessage.mockResolvedValue([
        {
          success: true,
          result: { allocation: { equity: 80, debt: 20 } },
          confidence: 0.88,
          reasoning: ['High equity allocation for aggressive profile'],
        },
      ]);

      const message: AgentMessage = {
        id: 'msg3',
        from: AgentType.ORCHESTRATOR,
        to: [AgentType.ORCHESTRATOR],
        type: 'request',
        payload: {
          query,
          context: { userId, traceId: 'trace3' },
        },
        timestamp: new Date(),
      };

      const result = await orchestrator.execute(message);

      expect(result.success).toBe(true);

      // Verify user preferences were used
      expect(mockAgentMemory.getUserPreferences).toHaveBeenCalledWith(userId);
    });

    it('should use conversation history for context continuity', async () => {
      const userId = 'user789';
      const query = 'What if I increase my monthly SIP?';

      // Mock conversation history with previous SIP discussion
      mockAgentMemory.getRelevantConversations.mockResolvedValue([
        {
          conversationId: 'conv123',
          messages: [
            { content: 'How much should I invest monthly?' },
            { content: 'Based on your goal of ₹1Cr in 20 years, invest ₹15,000/month' },
          ],
          metadata: {
            topics: ['SIP', 'retirement_planning'],
          },
        },
      ]);

      mockAgentMemory.getUserPreferences.mockResolvedValue({
        riskTolerance: 'moderate',
        investmentStyle: 'balanced',
        preferredAgents: [],
        communicationStyle: 'detailed',
      });

      mockSemanticRetriever.retrieveContext.mockResolvedValue([
        {
          content: 'Previous goal: ₹1Cr retirement corpus',
          score: 0.95,
          metadata: { type: 'goal', context: 'from_history' },
        },
      ]);

      mockContextBuilder.buildContext.mockResolvedValue({
        conversationContext: 'User previously discussed ₹15K SIP for retirement',
      });

      mockAgentRegistry.routeMessage.mockResolvedValue([
        {
          success: true,
          result: {
            newProjection: '₹1.3Cr with ₹18K SIP',
            improvement: '30% increase',
          },
          confidence: 0.9,
          reasoning: ['Used previous discussion context for calculation'],
        },
      ]);

      const message: AgentMessage = {
        id: 'msg4',
        from: AgentType.ORCHESTRATOR,
        to: [AgentType.ORCHESTRATOR],
        type: 'request',
        payload: {
          query,
          context: { userId, traceId: 'trace4' },
        },
        timestamp: new Date(),
      };

      const result = await orchestrator.execute(message);

      expect(result.success).toBe(true);

      // Verify conversation history was retrieved
      expect(mockAgentMemory.getRelevantConversations).toHaveBeenCalledWith(
        userId,
        query,
        3,
      );

      // Verify context includes conversation history
      expect(mockContextBuilder.buildContext).toHaveBeenCalled();
    });

    it('should work without userId (guest mode)', async () => {
      const query = 'General investment advice';

      // No RAG retrieval for guest users
      const message: AgentMessage = {
        id: 'msg5',
        from: AgentType.ORCHESTRATOR,
        to: [AgentType.ORCHESTRATOR],
        type: 'request',
        payload: {
          query,
          context: { traceId: 'trace5' }, // No userId
        },
        timestamp: new Date(),
      };

      mockAgentRegistry.routeMessage.mockResolvedValue([
        {
          success: true,
          result: { advice: 'General investment guidance' },
          confidence: 0.7,
          reasoning: ['Generic advice without personalization'],
        },
      ]);

      const result = await orchestrator.execute(message);

      expect(result.success).toBe(true);

      // RAG should not be called for guest users
      expect(mockSemanticRetriever.retrieveContext).not.toHaveBeenCalled();
      expect(mockAgentMemory.getUserPreferences).not.toHaveBeenCalled();
    });

    it('should extract financial snapshot from RAG results', async () => {
      const userId = 'user999';
      const query = 'Financial health check';

      // Mock RAG results with diverse document types
      mockSemanticRetriever.retrieveContext.mockResolvedValue([
        {
          content: 'Amazon transaction ₹5,000',
          score: 0.9,
          metadata: {
            type: 'transaction',
            category: 'shopping',
            amount: 5000,
          },
        },
        {
          content: 'House purchase goal ₹50L',
          score: 0.88,
          metadata: {
            type: 'goal',
            targetAmount: 5000000,
            priority: 'high',
          },
        },
        {
          content: 'Portfolio value ₹2.5L',
          score: 0.85,
          metadata: {
            type: 'portfolio',
            totalValue: 250000,
            equity: 60,
            debt: 40,
          },
        },
        {
          content: 'Monthly budget ₹50K',
          score: 0.82,
          metadata: {
            type: 'budget',
            monthly: 50000,
            spent: 35000,
          },
        },
      ]);

      mockContextBuilder.buildContext.mockResolvedValue({
        financialSnapshot: 'Complete financial overview',
      });

      mockAgentMemory.getUserPreferences.mockResolvedValue({
        riskTolerance: 'moderate',
        investmentStyle: 'balanced',
        preferredAgents: [],
        communicationStyle: 'detailed',
      });

      mockAgentMemory.getRelevantConversations.mockResolvedValue([]);

      mockAgentRegistry.routeMessage.mockResolvedValue([
        {
          success: true,
          result: { healthScore: 75, analysis: 'Good financial health' },
          confidence: 0.87,
          reasoning: ['Analysis based on comprehensive snapshot'],
        },
      ]);

      const message: AgentMessage = {
        id: 'msg6',
        from: AgentType.ORCHESTRATOR,
        to: [AgentType.ORCHESTRATOR],
        type: 'request',
        payload: {
          query,
          context: { userId, traceId: 'trace6' },
        },
        timestamp: new Date(),
      };

      const result = await orchestrator.execute(message);

      expect(result.success).toBe(true);

      // Verify RAG retrieved diverse document types
      expect(mockSemanticRetriever.retrieveContext).toHaveBeenCalledWith(
        query,
        userId,
        expect.any(Object),
      );
    });
  });
});
