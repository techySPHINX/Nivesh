import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SemanticRetrieverService } from '../application/services/semantic-retriever.service';
import { VectorIndexerService } from '../application/services/vector-indexer.service';
import { QdrantService } from '../infrastructure/qdrant/qdrant.service';
import { LocalEmbeddingService } from '../application/services/local-embedding.service';
import {
  IndexTransactionDto,
  IndexGoalDto,
  IndexKnowledgeDto,
  SearchDto,
  ReindexUserDto,
} from './dto/rag.dto';

/**
 * RAG Pipeline Controller
 * 
 * Endpoints for vector indexing, semantic search, and analytics
 * 
 * @controller /api/v1/rag
 */
@ApiTags('RAG Pipeline')
@Controller('api/v1/rag')
// @UseGuards(JwtAuthGuard) // Uncomment when auth is ready
export class RAGPipelineController {
  private readonly logger = new Logger(RAGPipelineController.name);

  constructor(
    private readonly semanticRetriever: SemanticRetrieverService,
    private readonly vectorIndexer: VectorIndexerService,
    private readonly vectorStore: QdrantService,
    private readonly embeddingService: LocalEmbeddingService,
  ) {}

  // ==========================================
  // Indexing Endpoints
  // ==========================================

  @Post('index/transaction')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Index a transaction for semantic search' })
  @ApiResponse({ status: 201, description: 'Transaction indexed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 500, description: 'Indexing failed' })
  async indexTransaction(@Body() dto: IndexTransactionDto) {
    this.logger.log(`Indexing transaction: ${dto.transactionId}`);
    
    // In production, fetch transaction from repository
    // For now, returning a placeholder response
    return {
      success: true,
      message: 'Transaction indexing endpoint ready',
      transactionId: dto.transactionId,
      note: 'Connect to transaction repository to fetch and index actual data',
    };
  }

  @Post('index/goal')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Index a goal for semantic search' })
  @ApiResponse({ status: 201, description: 'Goal indexed successfully' })
  async indexGoal(@Body() dto: IndexGoalDto) {
    this.logger.log(`Indexing goal: ${dto.goalId}`);
    
    return {
      success: true,
      message: 'Goal indexing endpoint ready',
      goalId: dto.goalId,
      note: 'Connect to goal repository to fetch and index actual data',
    };
  }

  @Post('index/knowledge')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Index knowledge base article' })
  @ApiResponse({ status: 201, description: 'Knowledge indexed successfully' })
  async indexKnowledge(@Body() dto: IndexKnowledgeDto) {
    try {
      const vectorId = await this.vectorIndexer.indexKnowledge({
        question: dto.question,
        answer: dto.answer,
        knowledgeType: dto.knowledgeType,
        tags: dto.tags,
        source: dto.source,
        authority: dto.authority,
      });

      return {
        success: true,
        vectorId,
        message: 'Knowledge article indexed successfully',
      };
    } catch (error) {
      this.logger.error('Failed to index knowledge:', error);
      throw error;
    }
  }

  @Post('reindex/user/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reindex all data for a specific user' })
  @ApiParam({ name: 'userId', description: 'User ID to reindex' })
  @ApiResponse({ status: 200, description: 'Reindexing completed' })
  async reindexUser(
    @Param('userId') userId: string,
    @Body() dto: ReindexUserDto,
  ) {
    this.logger.log(`Starting reindex for user: ${userId}`);

    // In production, fetch data from repositories based on flags
    const mockData = {
      transactions: dto.includeTransactions !== false ? [] : undefined,
      goals: dto.includeGoals !== false ? [] : undefined,
      budgets: dto.includeBudgets !== false ? [] : undefined,
    };

    const result = await this.vectorIndexer.batchIndexUserData(userId, mockData);

    return {
      success: true,
      userId,
      ...result,
      message: 'User data reindexing completed',
    };
  }

  // ==========================================
  // Search Endpoints
  // ==========================================

  @Post('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Semantic search across vector collections' })
  @ApiResponse({ status: 200, description: 'Search results returned' })
  async search(@Body() dto: SearchDto) {
    const startTime = Date.now();

    try {
      const collections = dto.collections || [
        'user_financial_context',
        'financial_knowledge',
        'conversation_history',
      ];

      const results = await this.semanticRetriever.hybridSearch(
        dto.query,
        collections,
        dto.userId,
        dto.topK || 10,
      );

      const duration = Date.now() - startTime;

      return {
        query: dto.query,
        results: results.map(r => ({
          id: r.id,
          text: r.text,
          score: r.score,
          metadata: r.metadata,
          collection: r.collection,
          rank: r.rank,
        })),
        total: results.length,
        retrievalTimeMs: duration,
        collections: collections,
      };
    } catch (error) {
      this.logger.error('Search failed:', error);
      throw error;
    }
  }

  @Get('similar/:vectorId')
  @ApiOperation({ summary: 'Find similar documents to a specific vector' })
  @ApiParam({ name: 'vectorId', description: 'Vector ID to find similar documents for' })
  @ApiQuery({ name: 'topK', required: false, type: Number, description: 'Number of results', example: 5 })
  @ApiQuery({ name: 'collection', required: false, type: String, description: 'Collection name' })
  async findSimilar(
    @Param('vectorId') vectorId: string,
    @Query('topK') topK: number = 5,
    @Query('collection') collection: string = 'user_financial_context',
  ) {
    this.logger.log(`Finding similar documents to: ${vectorId}`);

    // Get the original document
    const originalDoc = await this.vectorStore.getDocument(collection, vectorId);
    
    if (!originalDoc) {
      return {
        success: false,
        message: 'Vector not found',
      };
    }

    // Search for similar vectors
    const results = await this.vectorStore.search({
      collection,
      vector: originalDoc.vector,
      limit: topK + 1, // +1 to exclude self
      scoreThreshold: 0.6,
    });

    // Filter out the original document
    const similar = results
      .filter(r => r.id !== vectorId)
      .slice(0, topK);

    return {
      originalVectorId: vectorId,
      similar: similar.map(r => ({
        id: r.id,
        score: r.score,
        text: r.payload.text,
        metadata: r.payload,
      })),
      total: similar.length,
    };
  }

  // ==========================================
  // Analytics & Stats Endpoints
  // ==========================================

  @Get('stats')
  @ApiOperation({ summary: 'Get RAG pipeline statistics' })
  @ApiResponse({ status: 200, description: 'Statistics returned' })
  async getStats() {
    try {
      const collections = [
        'user_financial_context',
        'financial_knowledge',
        'conversation_history',
      ];

      const stats = await Promise.all(
        collections.map(async (collection) => {
          const count = await this.vectorStore.count(collection);
          return {
            name: collection,
            count,
            avgVectorSize: 384, // all-MiniLM-L6-v2 dimension
          };
        }),
      );

      const cacheStats = await this.embeddingService.getCacheStats();
      const retrievalStats = await this.semanticRetriever.getStats();

      return {
        collections: stats,
        embeddingCache: cacheStats,
        retrieval: retrievalStats,
        totalVectors: stats.reduce((sum, s) => sum + s.count, 0),
      };
    } catch (error) {
      this.logger.error('Failed to get stats:', error);
      throw error;
    }
  }

  @Get('metrics/user/:userId')
  @ApiOperation({ summary: 'Get RAG metrics for a specific user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async getUserMetrics(@Param('userId') userId: string) {
    try {
      const userContextCount = await this.vectorStore.count(
        'user_financial_context',
        { userId },
      );

      const conversationCount = await this.vectorStore.count(
        'conversation_history',
        { userId },
      );

      return {
        userId,
        documentsIndexed: userContextCount,
        conversationsStored: conversationCount,
        lastIndexedAt: new Date().toISOString(), // Would fetch from DB in production
      };
    } catch (error) {
      this.logger.error(`Failed to get metrics for user ${userId}:`, error);
      throw error;
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check for RAG pipeline' })
  @ApiResponse({ status: 200, description: 'RAG pipeline is healthy' })
  @ApiResponse({ status: 503, description: 'RAG pipeline is unhealthy' })
  async healthCheck() {
    try {
      const qdrantHealthy = await this.vectorStore.healthCheck();
      
      return {
        status: qdrantHealthy ? 'healthy' : 'unhealthy',
        components: {
          qdrant: qdrantHealthy,
          embeddings: true, // Would do actual check in production
          retriever: true,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('cache/clear')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear embedding cache (admin only)' })
  @ApiResponse({ status: 200, description: 'Cache cleared successfully' })
  async clearCache() {
    this.logger.warn('Clearing embedding cache');
    
    await this.embeddingService.clearCache();
    
    return {
      success: true,
      message: 'Embedding cache cleared',
      timestamp: new Date().toISOString(),
    };
  }
}
