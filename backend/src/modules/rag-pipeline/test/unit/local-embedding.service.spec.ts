import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LocalEmbeddingService } from '../../../application/services/local-embedding.service';
import Redis from 'ioredis';

// Mock Redis
jest.mock('ioredis');

describe('LocalEmbeddingService', () => {
  let service: LocalEmbeddingService;
  let configService: ConfigService;
  let redisMock: jest.Mocked<Redis>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalEmbeddingService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, any> = {
                'redis.host': 'localhost',
                'redis.port': 6379,
                'redis.password': 'test',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<LocalEmbeddingService>(LocalEmbeddingService);
    configService = module.get<ConfigService>(ConfigService);
    redisMock = new Redis() as jest.Mocked<Redis>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateEmbedding', () => {
    it('should generate 384-dimensional vector', async () => {
      const text = 'Test financial transaction';
      const result = await service.generateEmbedding(text);

      expect(result).toBeDefined();
      expect(result.vector).toHaveLength(384);
      expect(result.dimension).toBe(384);
      expect(result.model).toBe('Xenova/all-MiniLM-L6-v2');
    });

    it('should throw error for empty text', async () => {
      await expect(service.generateEmbedding('')).rejects.toThrow(
        'Text cannot be empty',
      );
    });

    it('should return cached embedding on second call', async () => {
      const text = 'Cached transaction';
      
      // First call - generates embedding
      const first = await service.generateEmbedding(text);
      
      // Second call - should hit cache
      const second = await service.generateEmbedding(text);
      
      expect(first.vector).toEqual(second.vector);
    });
  });

  describe('generateBatchEmbeddings', () => {
    it('should generate embeddings for multiple texts', async () => {
      const texts = [
        'Transaction 1',
        'Transaction 2',
        'Transaction 3',
      ];

      const results = await service.generateBatchEmbeddings(texts);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.vector).toHaveLength(384);
      });
    });

    it('should return empty array for empty input', async () => {
      const results = await service.generateBatchEmbeddings([]);
      expect(results).toEqual([]);
    });

    it('should be faster than individual calls', async () => {
      const texts = ['Text 1', 'Text 2', 'Text 3', 'Text 4', 'Text 5'];

      // Batch generation
      const batchStart = Date.now();
      await service.generateBatchEmbeddings(texts);
      const batchDuration = Date.now() - batchStart;

      // Individual generation
      const individualStart = Date.now();
      for (const text of texts) {
        await service.generateEmbedding(text);
      }
      const individualDuration = Date.now() - individualStart;

      // Batch should be faster (allowing some variance)
      expect(batchDuration).toBeLessThan(individualDuration * 0.8);
    });
  });

  describe('getModelName', () => {
    it('should return correct model name', () => {
      expect(service.getModelName()).toBe('Xenova/all-MiniLM-L6-v2');
    });
  });

  describe('getVectorDimension', () => {
    it('should return correct dimension', () => {
      expect(service.getVectorDimension()).toBe(384);
    });
  });

  describe('cache operations', () => {
    it('should retrieve cache statistics', async () => {
      const stats = await service.getCacheStats();
      
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('size');
    });

    it('should clear cache', async () => {
      await service.clearCache();
      
      // Verify cache was cleared
      // In real implementation, would verify Redis flush
    });
  });
});
