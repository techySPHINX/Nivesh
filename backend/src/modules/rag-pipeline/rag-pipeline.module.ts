import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Infrastructure
import { QdrantService } from './infrastructure/qdrant/qdrant.service';

// Application Services
import { LocalEmbeddingService } from './application/services/local-embedding.service';
import { SemanticRetrieverService } from './application/services/semantic-retriever.service';
import { ContextBuilderService } from './application/services/context-builder.service';
import { VectorIndexerService } from './application/services/vector-indexer.service';

// Presentation (Controllers will be added later)

/**
 * RAG Pipeline Module
 * 
 * Provides vector database and semantic retrieval capabilities
 * 
 * Architecture:
 * - Domain Layer: Entities, interfaces, value objects
 * - Application Layer: Services, business logic
 * - Infrastructure Layer: Qdrant, embeddings, caching
 * - Presentation Layer: Controllers, DTOs
 * 
 * Collections:
 * - user_financial_context: Transactions, goals, budgets
 * - financial_knowledge: FAQs, regulations, products
 * - conversation_history: Past conversations
 * 
 * Usage:
 * 1. SemanticRetrieverService.retrieveContext() - Get relevant context
 * 2. ContextBuilderService.buildPromptWithContext() - Build LLM prompt
 * 3. VectorIndexerService.indexTransaction() - Auto-index entities
 * 
 * @module RAGPipelineModule
 */
@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot(),
  ],
  providers: [
    // Infrastructure
    QdrantService,

    // Application Services
    LocalEmbeddingService,
    SemanticRetrieverService,
    ContextBuilderService,
    VectorIndexerService,
  ],
  exports: [
    SemanticRetrieverService,
    ContextBuilderService,
    VectorIndexerService,
    QdrantService,
    LocalEmbeddingService,
  ],
})
export class RAGPipelineModule {}
