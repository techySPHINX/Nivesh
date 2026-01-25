import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/database/postgres/prisma.service';
import { AgentMessage, AgentResponse, AgentType } from '../types/agent.types';

/**
 * Conversation Context Interface
 * Stores conversation state and history
 */
interface ConversationContext {
  userId: string;
  conversationId: string;
  messages: AgentMessage[];
  responses: AgentResponse[];
  createdAt: Date;
  lastUpdatedAt: Date;
  metadata: {
    messageCount: number;
    agentsUsed: AgentType[];
    topics: string[];
  };
}

/**
 * User Preferences Interface
 * Long-term user preferences and patterns
 */
interface UserPreferences {
  userId: string;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  investmentStyle: 'active' | 'passive';
  preferredAgents: AgentType[];
  communicationStyle: 'detailed' | 'concise';
  notificationPreferences: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  financialGoals: Array<{
    type: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  lastUpdated: Date;
}

/**
 * AgentMemoryService
 * Manages short-term conversation memory and long-term user preferences.
 *
 * Capabilities:
 * - Short-term memory: Conversation context within session
 * - Long-term memory: User preferences across sessions
 * - Context retrieval: Get relevant past conversations
 * - Preference learning: Adapt to user patterns over time
 * - Memory cleanup: Auto-expire old conversations
 *
 * Short-Term Memory (Session):
 * - Stores last 10 messages in conversation
 * - Maintains agent execution history
 * - Tracks conversation topics
 * - Expires after 24 hours
 *
 * Long-Term Memory (Persistent):
 * - User risk profile and preferences
 * - Favorite agents and workflows
 * - Communication style preferences
 * - Financial goal priorities
 *
 * Example Flow:
 * User: "I want to invest ₹50K/month"
 * Memory: Recalls user is risk-averse (from preferences)
 * Agent: Suggests conservative 30% equity allocation
 * Memory: Stores conversation for future reference
 *
 * @Injectable
 */
@Injectable()
export class AgentMemoryService {
  private readonly logger = new Logger(AgentMemoryService.name);

  // In-memory cache for active conversations
  private activeConversations: Map<string, ConversationContext> = new Map();

  // User preferences cache
  private userPreferences: Map<string, UserPreferences> = new Map();

  private readonly MAX_MESSAGES_PER_CONVERSATION = 10;
  private readonly CONVERSATION_EXPIRY_HOURS = 24;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Store message in conversation memory
   */
  async storeMessage(
    conversationId: string,
    userId: string,
    message: AgentMessage,
  ): Promise<void> {
    this.logger.log(`Storing message for conversation: ${conversationId}`);

    let conversation = this.activeConversations.get(conversationId);

    if (!conversation) {
      conversation = {
        userId,
        conversationId,
        messages: [],
        responses: [],
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
        metadata: {
          messageCount: 0,
          agentsUsed: [],
          topics: [],
        },
      };
    }

    // Add message
    conversation.messages.push(message);
    conversation.lastUpdatedAt = new Date();
    conversation.metadata.messageCount++;

    // Keep only last N messages
    if (conversation.messages.length > this.MAX_MESSAGES_PER_CONVERSATION) {
      conversation.messages.shift();
    }

    this.activeConversations.set(conversationId, conversation);

    // Persist to database (async, don't await)
    this.persistConversation(conversation).catch((error) =>
      this.logger.error('Failed to persist conversation', error.stack),
    );
  }

  /**
   * Store agent response in conversation memory
   */
  async storeResponse(
    conversationId: string,
    response: AgentResponse,
  ): Promise<void> {
    const conversation = this.activeConversations.get(conversationId);

    if (!conversation) {
      this.logger.warn(`Conversation not found: ${conversationId}`);
      return;
    }

    conversation.responses.push(response);
    conversation.lastUpdatedAt = new Date();

    // Track agents used
    const agentType = response.result?.agentType;
    if (agentType && !conversation.metadata.agentsUsed.includes(agentType)) {
      conversation.metadata.agentsUsed.push(agentType);
    }

    this.activeConversations.set(conversationId, conversation);
  }

  /**
   * Get conversation context
   */
  async getConversationContext(
    conversationId: string,
  ): Promise<ConversationContext | null> {
    // Check memory first
    const cached = this.activeConversations.get(conversationId);
    if (cached) {
      return cached;
    }

    // Check database
    try {
      const stored = await this.prisma.conversationMemory.findUnique({
        where: { conversationId },
      });

      if (stored) {
        const context: ConversationContext = {
          userId: stored.userId,
          conversationId: stored.conversationId,
          messages: stored.messages as AgentMessage[],
          responses: stored.responses as AgentResponse[],
          createdAt: stored.createdAt,
          lastUpdatedAt: stored.lastUpdatedAt,
          metadata: stored.metadata as any,
        };

        // Cache it
        this.activeConversations.set(conversationId, context);
        return context;
      }
    } catch (error) {
      this.logger.error('Failed to retrieve conversation', error.stack);
    }

    return null;
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    // Check cache first
    const cached = this.userPreferences.get(userId);
    if (cached) {
      return cached;
    }

    // Load from database
    try {
      const stored = await this.prisma.userPreferences.findUnique({
        where: { userId },
      });

      if (stored) {
        const preferences: UserPreferences = {
          userId: stored.userId,
          riskTolerance: stored.riskTolerance as any,
          investmentStyle: stored.investmentStyle as any,
          preferredAgents: stored.preferredAgents as AgentType[],
          communicationStyle: stored.communicationStyle as any,
          notificationPreferences: stored.notificationPreferences as any,
          financialGoals: stored.financialGoals as any,
          lastUpdated: stored.lastUpdated,
        };

        // Cache it
        this.userPreferences.set(userId, preferences);
        return preferences;
      }
    } catch (error) {
      this.logger.error('Failed to retrieve preferences', error.stack);
    }

    return null;
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    userId: string,
    updates: Partial<UserPreferences>,
  ): Promise<void> {
    this.logger.log(`Updating preferences for user: ${userId}`);

    const current = await this.getUserPreferences(userId);

    const updated: UserPreferences = {
      ...current,
      ...updates,
      userId,
      lastUpdated: new Date(),
    } as UserPreferences;

    // Update cache
    this.userPreferences.set(userId, updated);

    // Persist to database
    try {
      await this.prisma.userPreferences.upsert({
        where: { userId },
        create: {
          userId,
          riskTolerance: updated.riskTolerance,
          investmentStyle: updated.investmentStyle,
          preferredAgents: updated.preferredAgents,
          communicationStyle: updated.communicationStyle,
          notificationPreferences: updated.notificationPreferences,
          financialGoals: updated.financialGoals,
          lastUpdated: updated.lastUpdated,
        },
        update: {
          riskTolerance: updated.riskTolerance,
          investmentStyle: updated.investmentStyle,
          preferredAgents: updated.preferredAgents,
          communicationStyle: updated.communicationStyle,
          notificationPreferences: updated.notificationPreferences,
          financialGoals: updated.financialGoals,
          lastUpdated: updated.lastUpdated,
        },
      });
    } catch (error) {
      this.logger.error('Failed to update preferences', error.stack);
      throw error;
    }
  }

  /**
   * Get relevant past conversations
   */
  async getRelevantConversations(
    userId: string,
    topic: string,
    limit: number = 5,
  ): Promise<ConversationContext[]> {
    try {
      const conversations = await this.prisma.conversationMemory.findMany({
        where: {
          userId,
          metadata: {
            path: ['topics'],
            array_contains: topic,
          },
        },
        orderBy: {
          lastUpdatedAt: 'desc',
        },
        take: limit,
      });

      return conversations.map((conv) => ({
        userId: conv.userId,
        conversationId: conv.conversationId,
        messages: conv.messages as AgentMessage[],
        responses: conv.responses as AgentResponse[],
        createdAt: conv.createdAt,
        lastUpdatedAt: conv.lastUpdatedAt,
        metadata: conv.metadata as any,
      }));
    } catch (error) {
      this.logger.error('Failed to retrieve relevant conversations', error.stack);
      return [];
    }
  }

  /**
   * Clear conversation from memory
   */
  async clearConversation(conversationId: string): Promise<void> {
    this.activeConversations.delete(conversationId);
    this.logger.log(`Cleared conversation: ${conversationId}`);
  }

  /**
   * Cleanup expired conversations
   */
  async cleanupExpiredConversations(): Promise<number> {
    const expiryTime = new Date();
    expiryTime.setHours(expiryTime.getHours() - this.CONVERSATION_EXPIRY_HOURS);

    // Cleanup memory
    let memoryCleanedCount = 0;
    for (const [id, conv] of this.activeConversations.entries()) {
      if (conv.lastUpdatedAt < expiryTime) {
        this.activeConversations.delete(id);
        memoryCleanedCount++;
      }
    }

    // Cleanup database
    try {
      const result = await this.prisma.conversationMemory.deleteMany({
        where: {
          lastUpdatedAt: {
            lt: expiryTime,
          },
        },
      });

      this.logger.log(
        `Cleaned up ${memoryCleanedCount} from memory, ${result.count} from database`,
      );

      return memoryCleanedCount + result.count;
    } catch (error) {
      this.logger.error('Cleanup failed', error.stack);
      return memoryCleanedCount;
    }
  }

  /**
   * Persist conversation to database
   */
  private async persistConversation(
    conversation: ConversationContext,
  ): Promise<void> {
    await this.prisma.conversationMemory.upsert({
      where: {
        conversationId: conversation.conversationId,
      },
      create: {
        conversationId: conversation.conversationId,
        userId: conversation.userId,
        messages: conversation.messages,
        responses: conversation.responses,
        metadata: conversation.metadata,
        createdAt: conversation.createdAt,
        lastUpdatedAt: conversation.lastUpdatedAt,
      },
      update: {
        messages: conversation.messages,
        responses: conversation.responses,
        metadata: conversation.metadata,
        lastUpdatedAt: conversation.lastUpdatedAt,
      },
    });
  }

  /**
   * Get conversation statistics
   */
  async getConversationStats(userId: string): Promise<{
    totalConversations: number;
    averageMessagesPerConversation: number;
    mostUsedAgents: AgentType[];
    topTopics: string[];
  }> {
    try {
      const conversations = await this.prisma.conversationMemory.findMany({
        where: { userId },
      });

      const agentCounts = new Map<AgentType, number>();
      const topicCounts = new Map<string, number>();
      let totalMessages = 0;

      conversations.forEach((conv) => {
        const metadata = conv.metadata as any;
        totalMessages += metadata.messageCount || 0;

        metadata.agentsUsed?.forEach((agent: AgentType) => {
          agentCounts.set(agent, (agentCounts.get(agent) || 0) + 1);
        });

        metadata.topics?.forEach((topic: string) => {
          topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
        });
      });

      const mostUsedAgents = Array.from(agentCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map((e) => e[0]);

      const topTopics = Array.from(topicCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map((e) => e[0]);

      return {
        totalConversations: conversations.length,
        averageMessagesPerConversation:
          conversations.length > 0 ? totalMessages / conversations.length : 0,
        mostUsedAgents,
        topTopics,
      };
    } catch (error) {
      this.logger.error('Failed to get conversation stats', error.stack);
      return {
        totalConversations: 0,
        averageMessagesPerConversation: 0,
        mostUsedAgents: [],
        topTopics: [],
      };
    }
  }
}
