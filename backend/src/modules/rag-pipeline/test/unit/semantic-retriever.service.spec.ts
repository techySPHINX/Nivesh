import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SemanticRetrieverService } from '../../../application/services/semantic-retriever.service';
import { QdrantService } from '../../../infrastructure/qdrant/qdrant.service';
import { LocalEmbeddingService } from '../../../application/services/local-embedding.service';
import { RetrievalResult } from '../../../domain/entities/retrieval-result.entity';

describe('SemanticRetrieverService', () => {
  let service: SemanticRetrieverService;
  let vectorStoreMock: jest.Mocked<QdrantService>;
  let embeddingServiceMock: jest.Mocked<LocalEmbeddingService>;

  beforeEach(async () => {
    const mockVectorStore = {
      search: jest.fn(),
    };

    const mockEmbeddingService = {
      generateEmbedding: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SemanticRetrieverService,
        {
          provide: QdrantService,
          useValue: mockVectorStore,
        },
        {
          provide: LocalEmbeddingService,
          useValue: mockEmbeddingService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, any> = {
                'qdrant.collections.userContext.name': 'user_financial_context',
                'qdrant.collections.knowledgeBase.name': 'financial_knowledge',
                'qdrant.collections.conversations.name': 'conversation_history',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<SemanticRetrieverService>(SemanticRetrieverService);
    vectorStoreMock = module.get(QdrantService);
    embeddingServiceMock = module.get(LocalEmbeddingService);
  });

  describe('retrieveContext', () => {
    it('should retrieve relevant context for query', async () => {
      const mockEmbedding = {
        vector: new Array(384).fill(0.5),
        dimension: 384,
        model: 'test-model',
      };

      embeddingServiceMock.generateEmbedding.mockResolvedValue(mockEmbedding as any);

      const mockResults = [
        {
          id: '1',
          score: 0.9,
          payload: {
            text: 'Relevant transaction',
            userId: 'user123',
            contextType: 'transaction',
          },
        },
        {
          id: '2',
          score: 0.85,
          payload: {
            text: 'Financial knowledge',
            source: 'knowledge_base',
          },
        },
      ];

      vectorStoreMock.search.mockResolvedValue(mockResults);

      const results = await service.retrieveContext('Can I afford a car loan?', 'user123');

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(embeddingServiceMock.generateEmbedding).toHaveBeenCalledWith(
        'Can I afford a car loan?',
      );
    });

    it('should handle queries without userId', async () => {
      const mockEmbedding = {
        vector: new Array(384).fill(0.5),
        dimension: 384,
        model: 'test-model',
      };

      embeddingServiceMock.generateEmbedding.mockResolvedValue(mockEmbedding as any);
      vectorStoreMock.search.mockResolvedValue([]);

      const results = await service.retrieveContext('General financial advice');

      expect(results).toBeDefined();
      expect(results.length).toBe(0);
    });

    it('should respect topK configuration', async () => {
      const mockEmbedding = {
        vector: new Array(384).fill(0.5),
        dimension: 384,
        model: 'test-model',
      };

      embeddingServiceMock.generateEmbedding.mockResolvedValue(mockEmbedding as any);

      const mockResults = Array.from({ length: 20 }, (_, i) => ({
        id: `${i}`,
        score: 0.9 - i * 0.01,
        payload: { text: `Result ${i}` },
      }));

      vectorStoreMock.search.mockResolvedValue(mockResults);

      const results = await service.retrieveContext('Query', 'user123', { topK: 5 });

      expect(results.length).toBeLessThanOrEqual(5);
    });
  });

  describe('hybridSearch', () => {
    it('should search across multiple collections', async () => {
      const mockEmbedding = {
        vector: new Array(384).fill(0.5),
        dimension: 384,
        model: 'test-model',
      };

      embeddingServiceMock.generateEmbedding.mockResolvedValue(mockEmbedding as any);

      vectorStoreMock.search.mockResolvedValue([
        {
          id: '1',
          score: 0.9,
          payload: { text: 'Result from collection 1' },
        },
      ]);

      const collections = ['user_financial_context', 'financial_knowledge'];
      const results = await service.hybridSearch('test query', collections, 'user123', 10);

      expect(vectorStoreMock.search).toHaveBeenCalledTimes(collections.length);
      expect(results).toBeDefined();
    });
  });

  describe('reRank', () => {
    it('should re-rank results by composite score', async () => {
      const mockResults = [
        new RetrievalResult({
          id: '1',
          text: 'Old result',
          score: 0.9,
          metadata: { date: new Date(2023, 0, 1).toISOString() },
          collection: 'user_context',
        }),
        new RetrievalResult({
          id: '2',
          text: 'Recent result',
          score: 0.85,
          metadata: { date: new Date().toISOString() },
          collection: 'user_context',
        }),
      ];

      const reRanked = await service.reRank(mockResults, {
        topK: 10,
        scoreThreshold: 0.7,
        diversityWeight: 0.2,
        recencyWeight: 0.3, // Higher weight for recency
      });

      // Recent result should rank higher due to recency weight
      expect(reRanked[0].id).toBe('2');
    });

    it('should apply diversity boosting', async () => {
      const mockResults = [
        new RetrievalResult({
          id: '1',
          text: 'User context 1',
          score: 0.9,
          metadata: {},
          collection: 'user_context',
        }),
        new RetrievalResult({
          id: '2',
          text: 'User context 2',
          score: 0.88,
          metadata: {},
          collection: 'user_context',
        }),
        new RetrievalResult({
          id: '3',
          text: 'Knowledge',
          score: 0.87,
          metadata: {},
          collection: 'knowledge',
        }),
      ];

      const reRanked = await service.reRank(mockResults, {
        topK: 10,
        scoreThreshold: 0.7,
        diversityWeight: 0.5, // High diversity weight
        recencyWeight: 0.1,
      });

      // Knowledge result should get diversity boost
      expect(reRanked.some((r) => r.collection === 'knowledge')).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return retrieval statistics', async () => {
      const stats = await service.getStats();

      expect(stats).toHaveProperty('cacheHitRate');
      expect(stats).toHaveProperty('avgRetrievalTime');
      expect(stats).toHaveProperty('totalSearches');
    });
  });
});
