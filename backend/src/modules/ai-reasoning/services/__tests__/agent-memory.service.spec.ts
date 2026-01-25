import { Test, TestingModule } from '@nestjs/testing';
import { AgentMemoryService } from '../agent-memory.service';
import { PrismaService } from '../../../core/database/prisma.service';

describe('AgentMemoryService', () => {
  let service: AgentMemoryService;
  let prisma: PrismaService;

  const mockPrisma = {
    conversationMemory: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    userPreferences: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentMemoryService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AgentMemoryService>(AgentMemoryService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('storeMessage', () => {
    it('should store user message in conversation', async () => {
      const conversationId = 'conv123';
      const userId = 'user123';
      const message = 'How much should I save for retirement?';

      await service.storeMessage(conversationId, userId, message);

      const context = await service.getConversationContext(conversationId);
      expect(context?.messages).toContainEqual(
        expect.objectContaining({ content: message }),
      );
    });

    it('should limit conversation to MAX_MESSAGES', async () => {
      const conversationId = 'conv123';
      const userId = 'user123';

      // Store 15 messages (max is 10)
      for (let i = 0; i < 15; i++) {
        await service.storeMessage(conversationId, userId, `Message ${i}`);
      }

      const context = await service.getConversationContext(conversationId);
      expect(context?.messages.length).toBeLessThanOrEqual(10);
      // Should keep the most recent 10
      expect(context?.messages[context.messages.length - 1].content).toBe(
        'Message 14',
      );
    });
  });

  describe('storeResponse', () => {
    it('should store agent response in conversation', async () => {
      const conversationId = 'conv123';
      const response = {
        agentType: 'financial_planning',
        result: { monthlySavings: 50000 },
        confidence: 0.85,
        timestamp: new Date(),
      };

      await service.storeResponse(conversationId, response);

      const context = await service.getConversationContext(conversationId);
      expect(context?.responses).toContainEqual(
        expect.objectContaining({ agentType: 'financial_planning' }),
      );
    });
  });

  describe('getUserPreferences', () => {
    it('should return cached preferences', async () => {
      const userId = 'user123';
      const preferences = {
        riskTolerance: 'moderate',
        investmentStyle: 'balanced',
      };

      // First call - cache miss, database lookup
      mockPrisma.userPreferences.findUnique.mockResolvedValue({
        userId,
        ...preferences,
        preferredAgents: [],
        lastUpdated: new Date(),
      });

      const result1 = await service.getUserPreferences(userId);
      expect(mockPrisma.userPreferences.findUnique).toHaveBeenCalledTimes(1);

      // Second call - cache hit, no database lookup
      const result2 = await service.getUserPreferences(userId);
      expect(mockPrisma.userPreferences.findUnique).toHaveBeenCalledTimes(1);

      expect(result1).toEqual(result2);
    });

    it('should return default preferences for new user', async () => {
      mockPrisma.userPreferences.findUnique.mockResolvedValue(null);

      const result = await service.getUserPreferences('newUser');

      expect(result).toEqual({
        riskTolerance: 'moderate',
        investmentStyle: 'balanced',
        preferredAgents: [],
        communicationStyle: 'detailed',
        notificationPreferences: {},
        financialGoals: [],
      });
    });
  });

  describe('updateUserPreferences', () => {
    it('should update user preferences', async () => {
      const userId = 'user123';
      const updates = {
        riskTolerance: 'aggressive',
        investmentStyle: 'growth',
      };

      mockPrisma.userPreferences.upsert.mockResolvedValue({
        userId,
        ...updates,
        preferredAgents: [],
        lastUpdated: new Date(),
      });

      await service.updateUserPreferences(userId, updates);

      expect(mockPrisma.userPreferences.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
          update: expect.objectContaining(updates),
          create: expect.objectContaining({ userId, ...updates }),
        }),
      );

      // Verify cache is updated
      const prefs = await service.getUserPreferences(userId);
      expect(prefs.riskTolerance).toBe('aggressive');
    });
  });

  describe('cleanupExpiredConversations', () => {
    it('should remove conversations older than 24 hours', async () => {
      const conversationId = 'conv123';
      const userId = 'user123';

      // Store a conversation
      await service.storeMessage(conversationId, userId, 'Test message');

      // Mock time to 25 hours later
      const originalDate = Date.now;
      global.Date.now = jest.fn(() => originalDate() + 25 * 60 * 60 * 1000);

      mockPrisma.conversationMemory.deleteMany.mockResolvedValue({ count: 1 });

      const cleaned = await service.cleanupExpiredConversations();

      expect(cleaned).toBeGreaterThan(0);

      global.Date.now = originalDate;
    });
  });

  describe('getConversationStats', () => {
    it('should return conversation statistics', async () => {
      const userId = 'user123';

      // Create test conversations
      await service.storeMessage('conv1', userId, 'Message 1');
      await service.storeResponse('conv1', {
        agentType: 'financial_planning',
        result: {},
        confidence: 0.85,
        timestamp: new Date(),
      });

      await service.storeMessage('conv2', userId, 'Message 2');
      await service.storeResponse('conv2', {
        agentType: 'risk_assessment',
        result: {},
        confidence: 0.9,
        timestamp: new Date(),
      });

      const stats = await service.getConversationStats(userId);

      expect(stats.totalConversations).toBe(2);
      expect(stats.averageMessagesPerConversation).toBeGreaterThan(0);
      expect(stats.mostUsedAgents.length).toBeGreaterThan(0);
    });
  });
});
