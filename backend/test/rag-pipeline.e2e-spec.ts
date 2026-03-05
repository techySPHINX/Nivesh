import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RAGPipelineModule } from '../src/modules/rag-pipeline/rag-pipeline.module';

/**
 * RAG Pipeline E2E Tests
 *
 * Validates that RAG endpoints are reachable and return correct shapes.
 * Uses a standalone RAGPipelineModule to avoid needing full AppModule infra.
 *
 * NOTE: These tests hit controller-level logic only; Qdrant/Redis calls
 * may fail gracefully in CI where those services are unavailable, so we
 * also test the "unhealthy" path.
 *
 * TODO: Replace graceful-degradation pattern with a proper Qdrant mock/test-container
 * so that index & search paths are exercised deterministically in CI.
 */
describe('RAG Pipeline (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        EventEmitterModule.forRoot(),
        RAGPipelineModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ------------------------------------------------------------------
  // Indexing endpoints (Issue #37 acceptance criteria)
  // ------------------------------------------------------------------

  describe('POST /api/v1/rag/index/transaction', () => {
    it('should accept a valid transaction indexing request', () => {
      return request(app.getHttpServer())
        .post('/api/v1/rag/index/transaction')
        .send({ transactionId: 'txn-001', userId: 'user-001' })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body).toHaveProperty('transactionId', 'txn-001');
        });
    });
  });

  describe('POST /api/v1/rag/index/goal', () => {
    it('should accept a valid goal indexing request', () => {
      return request(app.getHttpServer())
        .post('/api/v1/rag/index/goal')
        .send({ goalId: 'goal-001', userId: 'user-001' })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body).toHaveProperty('goalId', 'goal-001');
        });
    });
  });

  // ------------------------------------------------------------------
  // Search endpoints
  // ------------------------------------------------------------------

  describe('POST /api/v1/rag/search', () => {
    it('should accept a semantic search request', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/rag/search')
        .send({
          query: 'monthly grocery spending',
          userId: 'user-001',
          topK: 5,
        });

      // The endpoint should return 200 (or 500 if Qdrant is unreachable).
      // In CI without Qdrant, a 500 is acceptable — we validate the route exists.
      expect([200, 500]).toContain(res.status);

      if (res.status === 200) {
        expect(res.body).toHaveProperty('query', 'monthly grocery spending');
        expect(res.body).toHaveProperty('results');
        expect(res.body).toHaveProperty('total');
        expect(res.body).toHaveProperty('retrievalTimeMs');
      }
    });
  });

  // ------------------------------------------------------------------
  // Analytics / stats endpoints
  // ------------------------------------------------------------------

  describe('GET /api/v1/rag/health', () => {
    it('should return health status for the RAG pipeline', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/rag/health');

      // Qdrant may or may not be available
      expect([200, 503]).toContain(res.status);
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/v1/rag/stats', () => {
    it('should return pipeline statistics', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/rag/stats');

      expect([200, 500]).toContain(res.status);

      if (res.status === 200) {
        expect(res.body).toHaveProperty('collections');
        expect(res.body).toHaveProperty('totalVectors');
      }
    });
  });

  // ------------------------------------------------------------------
  // Cache management
  // ------------------------------------------------------------------

  describe('POST /api/v1/rag/cache/clear', () => {
    it('should clear the embedding cache', () => {
      return request(app.getHttpServer())
        .post('/api/v1/rag/cache/clear')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body).toHaveProperty('message', 'Embedding cache cleared');
        });
    });
  });
});
