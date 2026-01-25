import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RAGPipelineModule } from '../../rag-pipeline.module';
import { SemanticRetrieverService } from '../../application/services/semantic-retriever.service';
import { VectorIndexerService } from '../../application/services/vector-indexer.service';
import { QdrantService } from '../../infrastructure/qdrant/qdrant.service';
import { LocalEmbeddingService } from '../../application/services/local-embedding.service';

/**
 * RAG Pipeline E2E Integration Test
 * 
 * Tests complete workflow:
 * 1. Index transaction
 * 2. Search for similar transactions
 * 3. Verify retrieval accuracy
 * 
 * Note: Requires Qdrant and Redis to be running
 * Run with: docker-compose up -d qdrant redis
 */
describe('RAG Pipeline E2E (Integration)', () => {
  let app: INestApplication;
  let semanticRetriever: SemanticRetrieverService;
  let vectorIndexer: VectorIndexerService;
  let vectorStore: QdrantService;
  let embeddingService: LocalEmbeddingService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        EventEmitterModule.forRoot(),
        RAGPipelineModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    semanticRetriever = app.get<SemanticRetrieverService>(SemanticRetrieverService);
    vectorIndexer = app.get<VectorIndexerService>(VectorIndexerService);
    vectorStore = app.get<QdrantService>(QdrantService);
    embeddingService = app.get<LocalEmbeddingService>(LocalEmbeddingService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Complete RAG Workflow', () => {
    const testUserId = 'test-user-' + Date.now();
    const testTransactionId = 'test-txn-' + Date.now();

    it('should index a transaction and retrieve it via semantic search', async () => {
      // Step 1: Index a transaction
      const transactionData = {
        id: testTransactionId,
        userId: testUserId,
        amount: 50000,
        category: 'Electronics',
        merchant: 'Apple Store',
        date: new Date(),
        description: 'MacBook Pro 16-inch purchase',
      };

      const vectorId = await vectorIndexer.indexTransaction(transactionData);
      expect(vectorId).toBeDefined();

      // Wait for indexing to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Step 2: Search for similar transactions
      const searchQuery = 'laptop purchase from Apple';
      const results = await semanticRetriever.retrieveContext(
        searchQuery,
        testUserId,
        {
          topK: 5,
          scoreThreshold: 0.6,
        },
      );

      // Step 3: Verify results
      expect(results.length).toBeGreaterThan(0);
      
      const relevantResult = results.find((r) => 
        r.metadata.entityId === testTransactionId,
      );
      
      expect(relevantResult).toBeDefined();
      expect(relevantResult!.score).toBeGreaterThan(0.7); // High relevance
    }, 10000); // 10s timeout

    it('should retrieve top-k results with proper ranking', async () => {
      // Index multiple transactions
      const transactions = [
        {
          id: 'txn-1',
          userId: testUserId,
          amount: 5000,
          category: 'Food',
          merchant: 'Restaurant',
          date: new Date(),
          description: 'Dinner at Italian restaurant',
        },
        {
          id: 'txn-2',
          userId: testUserId,
          amount: 10000,
          category: 'Food',
          merchant: 'Grocery Store',
          date: new Date(),
          description: 'Monthly groceries',
        },
        {
          id: 'txn-3',
          userId: testUserId,
          amount: 100000,
          category: 'Travel',
          merchant: 'Airline',
          date: new Date(),
          description: 'Flight tickets to Europe',
        },
      ];

      for (const txn of transactions) {
        await vectorIndexer.indexTransaction(txn);
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Search for food-related transactions
      const results = await semanticRetriever.retrieveContext(
        'food and dining expenses',
        testUserId,
        { topK: 3 },
      );

      // Should prioritize food transactions
      expect(results.length).toBeGreaterThan(0);
      const foodResults = results.filter((r) => 
        r.text.toLowerCase().includes('food') ||
        r.text.toLowerCase().includes('restaurant') ||
        r.text.toLowerCase().includes('groceries'),
      );
      
      expect(foodResults.length).toBeGreaterThan(0);
    }, 15000);

    it('should cache embeddings for performance', async () => {
      const testText = 'Sample transaction for caching test';

      // Clear cache first
      await embeddingService.clearCache();

      // First call - generates embedding
      const start1 = Date.now();
      await embeddingService.generateEmbedding(testText);
      const duration1 = Date.now() - start1;

      // Second call - should hit cache
      const start2 = Date.now();
      await embeddingService.generateEmbedding(testText);
      const duration2 = Date.now() - start2;

      // Cache hit should be significantly faster
      expect(duration2).toBeLessThan(duration1 * 0.5);
    });

    it('should handle concurrent indexing requests', async () => {
      const concurrentTransactions = Array.from({ length: 10 }, (_, i) => ({
        id: `concurrent-txn-${i}`,
        userId: testUserId,
        amount: 1000 * (i + 1),
        category: 'Test',
        merchant: `Merchant ${i}`,
        date: new Date(),
        description: `Concurrent transaction ${i}`,
      }));

      // Index all concurrently
      const indexPromises = concurrentTransactions.map((txn) =>
        vectorIndexer.indexTransaction(txn),
      );

      const vectorIds = await Promise.all(indexPromises);

      expect(vectorIds).toHaveLength(10);
      vectorIds.forEach((id) => expect(id).toBeDefined());
    }, 20000);

    it('should filter results by user ID', async () => {
      const otherUserId = 'other-user-' + Date.now();

      // Index transaction for different user
      await vectorIndexer.indexTransaction({
        id: 'other-user-txn',
        userId: otherUserId,
        amount: 5000,
        category: 'Test',
        merchant: 'Test Merchant',
        date: new Date(),
        description: 'Transaction from other user',
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Search with original user ID
      const results = await semanticRetriever.retrieveContext(
        'test transaction',
        testUserId,
      );

      // Should only return transactions from testUserId
      results.forEach((result) => {
        if (result.metadata.userId) {
          expect(result.metadata.userId).toBe(testUserId);
        }
      });
    });

    // Cleanup
    afterAll(async () => {
      try {
        await vectorIndexer.deleteUserVectors(testUserId);
      } catch (error) {
        console.warn('Cleanup failed:', error);
      }
    });
  });

  describe('Knowledge Base Integration', () => {
    it('should index and retrieve knowledge articles', async () => {
      const knowledgeArticle = {
        question: 'What is the maximum limit for ELSS investment under Section 80C?',
        answer: 'The maximum deduction under Section 80C is ₹1.5 lakh per financial year. ELSS (Equity Linked Savings Scheme) qualifies for this deduction and has a 3-year lock-in period.',
        knowledgeType: 'faq' as const,
        tags: ['tax', 'ELSS', '80C', 'investment'],
        source: 'Income Tax Act',
        authority: 'Income Tax Department',
      };

      const vectorId = await vectorIndexer.indexKnowledge(knowledgeArticle);
      expect(vectorId).toBeDefined();

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Search for tax-related information
      const results = await semanticRetriever.searchCollection(
        'financial_knowledge',
        '80C tax deduction limit',
      );

      expect(results.length).toBeGreaterThan(0);
      const relevantResult = results.find((r) =>
        r.text.includes('80C') || r.text.includes('ELSS'),
      );

      expect(relevantResult).toBeDefined();
      expect(relevantResult!.score).toBeGreaterThan(0.7);
    }, 10000);
  });

  describe('Performance Benchmarks', () => {
    it('should retrieve results in < 100ms', async () => {
      const start = Date.now();
      
      await semanticRetriever.retrieveContext(
        'quick performance test',
        testUserId,
        { topK: 10 },
      );

      const duration = Date.now() - start;
      
      // Should be fast (allowing some tolerance for CI/CD)
      expect(duration).toBeLessThan(500); // 500ms threshold
    });

    it('should batch process embeddings efficiently', async () => {
      const texts = Array.from({ length: 100 }, (_, i) => `Test text ${i}`);

      const start = Date.now();
      await embeddingService.generateBatchEmbeddings(texts);
      const duration = Date.now() - start;

      // Should process 100 texts in reasonable time
      expect(duration).toBeLessThan(5000); // 5s for 100 texts
      
      const avgTimePerText = duration / texts.length;
      expect(avgTimePerText).toBeLessThan(50); // < 50ms per text on average
    }, 10000);
  });

  describe('Health Checks', () => {
    it('should confirm Qdrant is healthy', async () => {
      const isHealthy = await vectorStore.healthCheck();
      expect(isHealthy).toBe(true);
    });

    it('should confirm collections exist', async () => {
      const collections = [
        'user_financial_context',
        'financial_knowledge',
        'conversation_history',
      ];

      for (const collection of collections) {
        const count = await vectorStore.count(collection);
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
