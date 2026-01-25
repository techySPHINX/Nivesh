import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IRetriever, RetrievalConfig } from '../../domain/interfaces/retriever.interface';
import { RetrievalResult, AggregatedRetrievalResults } from '../../domain/entities/retrieval-result.entity';
import { IVectorStore, VectorSearchFilter } from '../../domain/interfaces/vector-store.interface';
import { IEmbeddingService } from '../../domain/interfaces/embedding-service.interface';
import { QdrantService } from '../../infrastructure/qdrant/qdrant.service';
import { LocalEmbeddingService } from './local-embedding.service';

/**
 * Semantic Retriever Service
 * 
 * Implements hybrid search and re-ranking for RAG pipeline
 * - Searches multiple collections
 * - Re-ranks by relevance, recency, and user feedback
 * - Applies diversity boosting
 * - Performance tracking
 */
@Injectable()
export class SemanticRetrieverService implements IRetriever {
  private readonly logger = new Logger(SemanticRetrieverService.name);
  
  private readonly defaultConfig: RetrievalConfig = {
    topK: 10,
    scoreThreshold: 0.7,
    diversityWeight: 0.2,
    recencyWeight: 0.2,
  };

  constructor(
    private readonly vectorStore: QdrantService,
    private readonly embeddingService: LocalEmbeddingService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Retrieve relevant context for a query
   * Main entry point for RAG pipeline
   */
  async retrieveContext(
    query: string,
    userId?: string,
    config?: Partial<RetrievalConfig>,
  ): Promise<RetrievalResult[]> {
    const startTime = Date.now();
    const finalConfig = { ...this.defaultConfig, ...config };

    try {
      // 1. Generate query embedding
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);
      
      // 2. Search user's financial context (if userId provided)
      const userContext = userId
        ? await this.searchUserContext(queryEmbedding.vector, userId, 5)
        : [];

      // 3. Search knowledge base
      const knowledge = await this.searchKnowledgeBase(queryEmbedding.vector, 3);

      // 4. Search conversation history (if userId provided)
      const conversations = userId
        ? await this.searchConversations(queryEmbedding.vector, userId, 2)
        : [];

      // 5. Combine results
      const allResults = [...userContext, ...knowledge, ...conversations];

      // 6. Re-rank by composite score
      const reRanked = await this.reRank(allResults, finalConfig);

      // 7. Take top K
      const topResults = reRanked.slice(0, finalConfig.topK);

      const duration = Date.now() - startTime;
      this.logger.debug(
        `Retrieved ${topResults.length} results in ${duration}ms (user: ${userContext.length}, knowledge: ${knowledge.length}, history: ${conversations.length})`,
      );

      return topResults;
    } catch (error) {
      this.logger.error('Context retrieval failed:', error);
      throw error;
    }
  }

  /**
   * Search user's financial context
   */
  private async searchUserContext(
    vector: number[],
    userId: string,
    limit: number,
  ): Promise<RetrievalResult[]> {
    const collectionName = this.configService.get('qdrant.collections.userContext.name');
    
    const results = await this.vectorStore.search({
      collection: collectionName,
      vector,
      limit,
      filter: { userId },
      scoreThreshold: 0.6,
    });

    return results.map(r => new RetrievalResult({
      id: r.id,
      text: r.payload.text,
      score: r.score,
      metadata: r.payload,
      collection: 'user_context',
    }));
  }

  /**
   * Search financial knowledge base
   */
  private async searchKnowledgeBase(
    vector: number[],
    limit: number,
  ): Promise<RetrievalResult[]> {
    const collectionName = this.configService.get('qdrant.collections.knowledgeBase.name');
    
    const results = await this.vectorStore.search({
      collection: collectionName,
      vector,
      limit,
      scoreThreshold: 0.7,
    });

    return results.map(r => new RetrievalResult({
      id: r.id,
      text: r.payload.answer || r.payload.text,
      score: r.score,
      metadata: r.payload,
      collection: 'knowledge',
    }));
  }

  /**
   * Search conversation history
   */
  private async searchConversations(
    vector: number[],
    userId: string,
    limit: number,
  ): Promise<RetrievalResult[]> {
    const collectionName = this.configService.get('qdrant.collections.conversations.name');
    
    const results = await this.vectorStore.search({
      collection: collectionName,
      vector,
      limit,
      filter: { userId },
      scoreThreshold: 0.65,
    });

    return results.map(r => new RetrievalResult({
      id: r.id,
      text: `Q: ${r.payload.query}\nA: ${r.payload.response}`,
      score: r.score,
      metadata: r.payload,
      collection: 'conversation',
    }));
  }

  /**
   * Search specific collection
   */
  async searchCollection(
    collection: string,
    query: string,
    filter?: VectorSearchFilter,
    limit: number = 10,
  ): Promise<RetrievalResult[]> {
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);
    
    const results = await this.vectorStore.search({
      collection,
      vector: queryEmbedding.vector,
      limit,
      filter,
      scoreThreshold: 0.6,
    });

    return results.map(r => new RetrievalResult({
      id: r.id,
      text: r.payload.text,
      score: r.score,
      metadata: r.payload,
      collection,
    }));
  }

  /**
   * Hybrid search across multiple collections
   */
  async hybridSearch(
    query: string,
    collections: string[],
    userId?: string,
    topK: number = 10,
  ): Promise<RetrievalResult[]> {
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);
    
    const allResults: RetrievalResult[] = [];

    for (const collection of collections) {
      const filter = userId ? { userId } : undefined;
      
      const results = await this.vectorStore.search({
        collection,
        vector: queryEmbedding.vector,
        limit: Math.ceil(topK / collections.length) + 2, // Over-fetch for re-ranking
        filter,
        scoreThreshold: 0.6,
      });

      allResults.push(...results.map(r => new RetrievalResult({
        id: r.id,
        text: r.payload.text,
        score: r.score,
        metadata: r.payload,
        collection,
      })));
    }

    // Re-rank and take top K
    const reRanked = await this.reRank(allResults);
    return reRanked.slice(0, topK);
  }

  /**
   * Re-rank results using composite scoring
   * 
   * Score = vector_similarity * (1 - diversityWeight - recencyWeight)
   *       + recency_score * recencyWeight
   *       + diversity_bonus * diversityWeight
   *       + feedback_score * 0.1
   */
  async reRank(
    results: RetrievalResult[],
    config?: Partial<RetrievalConfig>,
  ): Promise<RetrievalResult[]> {
    if (results.length === 0) return [];

    const finalConfig = { ...this.defaultConfig, ...config };
    
    // Calculate min/max scores for normalization
    const scores = results.map(r => r.score);
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);

    // Track collection diversity
    const collectionCounts = new Map<string, number>();

    // Calculate composite scores
    const scoredResults = results.map(result => {
      // Normalize vector similarity
      const normalizedSimilarity = result.normalizeScore(minScore, maxScore);

      // Recency score
      const recencyScore = result.calculateRecencyScore(30); // 30-day half-life

      // Diversity bonus (penalize over-represented collections)
      const collectionCount = collectionCounts.get(result.collection) || 0;
      collectionCounts.set(result.collection, collectionCount + 1);
      const diversityBonus = 1 / (1 + collectionCount * 0.5);

      // Feedback score (if available)
      const feedbackScore = result.metadata.feedbackScore
        ? (result.metadata.feedbackScore + 1) / 2 // Normalize -1,0,1 to 0,0.5,1
        : 0.5;

      // Composite score
      const compositeScore =
        normalizedSimilarity * (1 - finalConfig.diversityWeight - finalConfig.recencyWeight) +
        recencyScore * finalConfig.recencyWeight +
        diversityBonus * finalConfig.diversityWeight +
        feedbackScore * 0.1;

      return {
        ...result,
        score: compositeScore,
      };
    });

    // Sort by composite score
    scoredResults.sort((a, b) => b.score - a.score);

    // Add rank
    scoredResults.forEach((result, index) => {
      result.rank = index + 1;
    });

    return scoredResults;
  }

  /**
   * Get retrieval statistics
   */
  async getStats(): Promise<{
    cacheHitRate: number;
    avgRetrievalTime: number;
    totalSearches: number;
  }> {
    // Would implement proper metrics tracking here
    return {
      cacheHitRate: 0.8,
      avgRetrievalTime: 120,
      totalSearches: 0,
    };
  }
}
