import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import { QdrantService } from '../../infrastructure/qdrant/qdrant.service';
import { LocalEmbeddingService } from './local-embedding.service';
import { VectorDocument } from '../../domain/entities/vector-document.entity';
import {
  UserFinancialContextVector,
  FinancialKnowledgeVector,
  ConversationVector,
} from '../../domain/entities/vector-document.entity';

/**
 * Vector Indexer Service
 * 
 * Handles automatic indexing of various entities into vector collections
 * - Listens to domain events (transaction.created, goal.updated, etc.)
 * - Generates embeddings
 * - Indexes to appropriate collections
 * - Supports batch indexing
 * - Tracks indexing jobs
 */
@Injectable()
export class VectorIndexerService {
  private readonly logger = new Logger(VectorIndexerService.name);

  constructor(
    private readonly vectorStore: QdrantService,
    private readonly embeddingService: LocalEmbeddingService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Index a transaction
   * Triggered by: transaction.created, transaction.updated events
   */
  @OnEvent('transaction.created')
  @OnEvent('transaction.updated')
  async indexTransaction(payload: {
    id: string;
    userId: string;
    amount: number;
    category: string;
    merchant?: string;
    date: Date;
    description?: string;
  }): Promise<string> {
    try {
      // Build natural language description
      const text = this.buildTransactionText(payload);

      // Generate embedding
      const embedding = await this.embeddingService.generateEmbedding(text);

      // Create vector document
      const document = new VectorDocument({
        id: uuidv4(),
        text,
        vector: embedding.vector,
        metadata: {
          userId: payload.userId,
          contextType: 'transaction',
          entityId: payload.id,
          amount: payload.amount,
          category: payload.category,
          merchant: payload.merchant,
          date: payload.date.toISOString(),
          source: 'transaction_system',
        },
        createdAt: new Date(),
      });

      // Index to Qdrant
      const collectionName = this.configService.get('qdrant.collections.userContext.name');
      const vectorId = await this.vectorStore.indexDocument(collectionName, document);

      this.logger.log(`Indexed transaction ${payload.id} as vector ${vectorId}`);

      // Emit indexing completed event
      this.eventEmitter.emit('vector.indexed', {
        entityType: 'transaction',
        entityId: payload.id,
        vectorId,
        collection: collectionName,
      });

      return vectorId;
    } catch (error) {
      this.logger.error(`Failed to index transaction ${payload.id}:`, error);
      throw error;
    }
  }

  /**
   * Build natural language text for transaction
   */
  private buildTransactionText(transaction: {
    amount: number;
    category: string;
    merchant?: string;
    date: Date;
    description?: string;
  }): string {
    const parts: string[] = [];

    parts.push(`₹${transaction.amount.toLocaleString('en-IN')} spent`);
    
    if (transaction.category) {
      parts.push(`on ${transaction.category}`);
    }

    if (transaction.merchant) {
      parts.push(`at ${transaction.merchant}`);
    }

    parts.push(`on ${transaction.date.toLocaleDateString('en-IN')}`);

    if (transaction.description) {
      parts.push(`(${transaction.description})`);
    }

    return parts.join(' ');
  }

  /**
   * Index a goal
   */
  @OnEvent('goal.created')
  @OnEvent('goal.updated')
  async indexGoal(payload: {
    id: string;
    userId: string;
    title: string;
    description?: string;
    targetAmount: number;
    currentAmount: number;
    targetDate: Date;
    category: string;
  }): Promise<string> {
    try {
      const text = `Financial goal: ${payload.title}. ${payload.description || ''}. Target: ₹${payload.targetAmount.toLocaleString('en-IN')} by ${payload.targetDate.toLocaleDateString('en-IN')}. Current progress: ₹${payload.currentAmount.toLocaleString('en-IN')} (${((payload.currentAmount / payload.targetAmount) * 100).toFixed(0)}%). Category: ${payload.category}`;

      const embedding = await this.embeddingService.generateEmbedding(text);

      const document = new VectorDocument({
        id: uuidv4(),
        text,
        vector: embedding.vector,
        metadata: {
          userId: payload.userId,
          contextType: 'goal',
          entityId: payload.id,
          amount: payload.targetAmount,
          category: payload.category,
          date: payload.targetDate.toISOString(),
          progress: payload.currentAmount / payload.targetAmount,
          source: 'goal_system',
        },
        createdAt: new Date(),
      });

      const collectionName = this.configService.get('qdrant.collections.userContext.name');
      const vectorId = await this.vectorStore.indexDocument(collectionName, document);

      this.logger.log(`Indexed goal ${payload.id} as vector ${vectorId}`);
      return vectorId;
    } catch (error) {
      this.logger.error(`Failed to index goal ${payload.id}:`, error);
      throw error;
    }
  }

  /**
   * Index budget information
   */
  @OnEvent('budget.created')
  @OnEvent('budget.updated')
  async indexBudget(payload: {
    id: string;
    userId: string;
    category: string;
    limit: number;
    spent: number;
    period: string;
  }): Promise<string> {
    try {
      const remaining = payload.limit - payload.spent;
      const percentUsed = (payload.spent / payload.limit) * 100;

      const text = `Budget for ${payload.category}: ₹${payload.limit.toLocaleString('en-IN')} ${payload.period}. Spent: ₹${payload.spent.toLocaleString('en-IN')} (${percentUsed.toFixed(0)}%). Remaining: ₹${remaining.toLocaleString('en-IN')}`;

      const embedding = await this.embeddingService.generateEmbedding(text);

      const document = new VectorDocument({
        id: uuidv4(),
        text,
        vector: embedding.vector,
        metadata: {
          userId: payload.userId,
          contextType: 'budget',
          entityId: payload.id,
          category: payload.category,
          amount: payload.limit,
          spent: payload.spent,
          percentUsed,
          source: 'budget_system',
        },
        createdAt: new Date(),
      });

      const collectionName = this.configService.get('qdrant.collections.userContext.name');
      const vectorId = await this.vectorStore.indexDocument(collectionName, document);

      this.logger.log(`Indexed budget ${payload.id} as vector ${vectorId}`);
      return vectorId;
    } catch (error) {
      this.logger.error(`Failed to index budget ${payload.id}:`, error);
      throw error;
    }
  }

  /**
   * Index conversation for history
   */
  async indexConversation(payload: {
    userId: string;
    query: string;
    response: string;
    intent: string;
    sessionId?: string;
    contextUsed?: string[];
  }): Promise<string> {
    try {
      // Embed the query (user's question)
      const embedding = await this.embeddingService.generateEmbedding(payload.query);

      const document = new VectorDocument({
        id: uuidv4(),
        text: payload.query, // Index query, not response
        vector: embedding.vector,
        metadata: {
          userId: payload.userId,
          query: payload.query,
          response: payload.response,
          intent: payload.intent,
          sessionId: payload.sessionId,
          contextUsed: payload.contextUsed,
          timestamp: new Date().toISOString(),
          source: 'conversation_system',
        },
        createdAt: new Date(),
      });

      const collectionName = this.configService.get('qdrant.collections.conversations.name');
      const vectorId = await this.vectorStore.indexDocument(collectionName, document);

      this.logger.log(`Indexed conversation as vector ${vectorId}`);
      return vectorId;
    } catch (error) {
      this.logger.error('Failed to index conversation:', error);
      throw error;
    }
  }

  /**
   * Index knowledge base article
   */
  async indexKnowledge(payload: {
    question: string;
    answer: string;
    knowledgeType: 'faq' | 'regulation' | 'product' | 'strategy' | 'guideline';
    tags: string[];
    source: string;
    authority?: string;
  }): Promise<string> {
    try {
      // Embed both question and answer together
      const text = `Q: ${payload.question}\nA: ${payload.answer}`;
      const embedding = await this.embeddingService.generateEmbedding(text);

      const document = new VectorDocument({
        id: uuidv4(),
        text: payload.answer, // Store answer as main text
        vector: embedding.vector,
        metadata: {
          question: payload.question,
          answer: payload.answer,
          knowledgeType: payload.knowledgeType,
          tags: payload.tags,
          source: payload.source,
          authority: payload.authority,
          lastVerified: new Date().toISOString(),
        },
        createdAt: new Date(),
      });

      const collectionName = this.configService.get('qdrant.collections.knowledgeBase.name');
      const vectorId = await this.vectorStore.indexDocument(collectionName, document);

      this.logger.log(`Indexed knowledge article as vector ${vectorId}`);
      return vectorId;
    } catch (error) {
      this.logger.error('Failed to index knowledge:', error);
      throw error;
    }
  }

  /**
   * Batch index user's financial data
   * Used for initial indexing or re-indexing
   */
  async batchIndexUserData(
    userId: string,
    data: {
      transactions?: any[];
      goals?: any[];
      budgets?: any[];
    },
  ): Promise<{ indexed: number; failed: number }> {
    let indexed = 0;
    let failed = 0;

    this.logger.log(`Starting batch indexing for user ${userId}`);

    // Index transactions
    if (data.transactions && data.transactions.length > 0) {
      for (const transaction of data.transactions) {
        try {
          await this.indexTransaction({ ...transaction, userId });
          indexed++;
        } catch (error) {
          this.logger.error(`Failed to index transaction ${transaction.id}:`, error);
          failed++;
        }
      }
    }

    // Index goals
    if (data.goals && data.goals.length > 0) {
      for (const goal of data.goals) {
        try {
          await this.indexGoal({ ...goal, userId });
          indexed++;
        } catch (error) {
          this.logger.error(`Failed to index goal ${goal.id}:`, error);
          failed++;
        }
      }
    }

    // Index budgets
    if (data.budgets && data.budgets.length > 0) {
      for (const budget of data.budgets) {
        try {
          await this.indexBudget({ ...budget, userId });
          indexed++;
        } catch (error) {
          this.logger.error(`Failed to index budget ${budget.id}:`, error);
          failed++;
        }
      }
    }

    this.logger.log(
      `Batch indexing completed for user ${userId}: ${indexed} indexed, ${failed} failed`,
    );

    return { indexed, failed };
  }

  /**
   * Delete all vectors for a user
   */
  async deleteUserVectors(userId: string): Promise<number> {
    try {
      const collectionName = this.configService.get('qdrant.collections.userContext.name');
      const deleted = await this.vectorStore.deleteBatch(collectionName, { userId });

      this.logger.log(`Deleted ${deleted} vectors for user ${userId}`);
      return deleted;
    } catch (error) {
      this.logger.error(`Failed to delete vectors for user ${userId}:`, error);
      throw error;
    }
  }
}
