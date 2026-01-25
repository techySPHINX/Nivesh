import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/qdrant-js';
import { v4 as uuidv4 } from 'uuid';
import { IVectorStore, VectorSearchOptions, VectorSearchResult, VectorSearchFilter } from '../../domain/interfaces/vector-store.interface';
import { VectorDocument } from '../../domain/entities/vector-document.entity';

/**
 * Qdrant Vector Store Implementation
 * 
 * Manages vector database operations using Qdrant
 * - Collection management
 * - Document indexing (single & batch)
 * - Semantic search with filters
 * - CRUD operations
 */
@Injectable()
export class QdrantService implements IVectorStore, OnModuleInit {
  private readonly logger = new Logger(QdrantService.name);
  private client: QdrantClient;

  constructor(private readonly configService: ConfigService) {
    const qdrantUrl = this.configService.get<string>('qdrant.url');
    const apiKey = this.configService.get<string>('qdrant.apiKey');

    this.client = new QdrantClient({
      url: qdrantUrl,
      apiKey,
    });

    this.logger.log(`Qdrant client initialized: ${qdrantUrl}`);
  }

  /**
   * Initialize collections on module startup
   */
  async onModuleInit() {
    const collections = this.configService.get('qdrant.collections');
    
    try {
      await this.ensureCollection(
        collections.userContext.name,
        collections.userContext.vectorSize,
        collections.userContext.distance,
      );

      await this.ensureCollection(
        collections.knowledgeBase.name,
        collections.knowledgeBase.vectorSize,
        collections.knowledgeBase.distance,
      );

      await this.ensureCollection(
        collections.conversations.name,
        collections.conversations.vectorSize,
        collections.conversations.distance,
      );

      this.logger.log('All Qdrant collections initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Qdrant collections:', error);
      throw error;
    }
  }

  /**
   * Ensure collection exists, create if not
   */
  async ensureCollection(
    name: string,
    vectorSize: number,
    distance: 'Cosine' | 'Euclid' | 'Dot',
  ): Promise<void> {
    try {
      const exists = await this.client.collectionExists(name);

      if (exists) {
        this.logger.debug(`Collection '${name}' already exists`);
        return;
      }

      this.logger.log(`Creating collection: ${name} (size: ${vectorSize}, distance: ${distance})`);

      await this.client.createCollection(name, {
        vectors: {
          size: vectorSize,
          distance,
        },
      });

      // Create payload indices for common filters
      await this.createPayloadIndices(name);

      this.logger.log(`Collection '${name}' created successfully`);
    } catch (error) {
      this.logger.error(`Failed to ensure collection '${name}':`, error);
      throw error;
    }
  }

  /**
   * Create indices for efficient filtering
   */
  private async createPayloadIndices(collection: string): Promise<void> {
    const commonIndices = [
      { field: 'userId', type: 'keyword' },
      { field: 'contextType', type: 'keyword' },
      { field: 'category', type: 'keyword' },
      { field: 'date', type: 'datetime' },
      { field: 'amount', type: 'float' },
      { field: 'knowledgeType', type: 'keyword' },
      { field: 'tags', type: 'keyword' },
    ];

    for (const index of commonIndices) {
      try {
        await this.client.createPayloadIndex(collection, {
          field_name: index.field,
          field_schema: index.type as any,
        });
        this.logger.debug(`Created index on ${collection}.${index.field}`);
      } catch (error) {
        // Index might already exist, ignore
        this.logger.debug(`Index ${index.field} may already exist`);
      }
    }
  }

  /**
   * Index a single document
   */
  async indexDocument(
    collection: string,
    document: VectorDocument,
  ): Promise<string> {
    const id = document.id || uuidv4();

    try {
      await this.client.upsert(collection, {
        points: [
          {
            id,
            vector: document.vector,
            payload: {
              text: document.text,
              ...document.sanitizeMetadata(),
              createdAt: document.createdAt.toISOString(),
              updatedAt: document.updatedAt?.toISOString(),
            },
          },
        ],
      });

      this.logger.debug(`Indexed document ${id} in collection '${collection}'`);
      return id;
    } catch (error) {
      this.logger.error(`Failed to index document in '${collection}':`, error);
      throw error;
    }
  }

  /**
   * Index multiple documents in batch
   */
  async indexBatch(
    collection: string,
    documents: VectorDocument[],
  ): Promise<string[]> {
    if (documents.length === 0) return [];

    const ids = documents.map(doc => doc.id || uuidv4());
    const points = documents.map((doc, i) => ({
      id: ids[i],
      vector: doc.vector,
      payload: {
        text: doc.text,
        ...doc.sanitizeMetadata(),
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt?.toISOString(),
      },
    }));

    try {
      await this.client.upsert(collection, {
        points,
      });

      this.logger.log(`Batch indexed ${documents.length} documents in collection '${collection}'`);
      return ids;
    } catch (error) {
      this.logger.error(`Failed to batch index in '${collection}':`, error);
      throw error;
    }
  }

  /**
   * Search for similar vectors
   */
  async search(options: VectorSearchOptions): Promise<VectorSearchResult[]> {
    const {
      collection,
      vector,
      limit = 10,
      offset = 0,
      filter,
      scoreThreshold = 0.0,
    } = options;

    try {
      const qdrantFilter = this.buildQdrantFilter(filter);

      const results = await this.client.search(collection, {
        vector,
        limit,
        offset,
        filter: qdrantFilter,
        score_threshold: scoreThreshold,
        with_payload: true,
      });

      return results.map(result => ({
        id: result.id.toString(),
        score: result.score,
        payload: result.payload as Record<string, any>,
      }));
    } catch (error) {
      this.logger.error(`Search failed in collection '${collection}':`, error);
      throw error;
    }
  }

  /**
   * Build Qdrant filter from search filter
   */
  private buildQdrantFilter(filter?: VectorSearchFilter): any {
    if (!filter) return undefined;

    const must: any[] = [];

    if (filter.userId) {
      must.push({
        key: 'userId',
        match: { value: filter.userId },
      });
    }

    if (filter.contextType) {
      must.push({
        key: 'contextType',
        match: { value: filter.contextType },
      });
    }

    if (filter.categories && filter.categories.length > 0) {
      must.push({
        key: 'category',
        match: { any: filter.categories },
      });
    }

    if (filter.tags && filter.tags.length > 0) {
      must.push({
        key: 'tags',
        match: { any: filter.tags },
      });
    }

    if (filter.dateRange) {
      must.push({
        key: 'date',
        range: {
          gte: filter.dateRange.from.toISOString(),
          lte: filter.dateRange.to.toISOString(),
        },
      });
    }

    if (filter.minAmount !== undefined || filter.maxAmount !== undefined) {
      const range: any = {};
      if (filter.minAmount !== undefined) range.gte = filter.minAmount;
      if (filter.maxAmount !== undefined) range.lte = filter.maxAmount;
      
      must.push({
        key: 'amount',
        range,
      });
    }

    // Add custom filters
    if (filter.customFilters) {
      Object.entries(filter.customFilters).forEach(([key, value]) => {
        must.push({
          key,
          match: { value },
        });
      });
    }

    return must.length > 0 ? { must } : undefined;
  }

  /**
   * Get document by ID
   */
  async getDocument(collection: string, id: string): Promise<VectorDocument | null> {
    try {
      const results = await this.client.retrieve(collection, {
        ids: [id],
        with_payload: true,
        with_vector: true,
      });

      if (results.length === 0) return null;

      const point = results[0];
      return new VectorDocument({
        id: point.id.toString(),
        text: (point.payload as any).text,
        vector: point.vector as number[],
        metadata: point.payload as Record<string, any>,
        createdAt: new Date((point.payload as any).createdAt),
        updatedAt: (point.payload as any).updatedAt ? new Date((point.payload as any).updatedAt) : undefined,
      });
    } catch (error) {
      this.logger.error(`Failed to get document ${id} from '${collection}':`, error);
      return null;
    }
  }

  /**
   * Update document
   */
  async updateDocument(
    collection: string,
    id: string,
    updates: Partial<VectorDocument>,
  ): Promise<void> {
    try {
      const existing = await this.getDocument(collection, id);
      if (!existing) {
        throw new Error(`Document ${id} not found in collection '${collection}'`);
      }

      const updated = new VectorDocument({
        ...existing,
        ...updates,
        id,
        updatedAt: new Date(),
      });

      await this.client.upsert(collection, {
        points: [
          {
            id,
            vector: updated.vector,
            payload: {
              text: updated.text,
              ...updated.sanitizeMetadata(),
              updatedAt: updated.updatedAt!.toISOString(),
            },
          },
        ],
      });

      this.logger.debug(`Updated document ${id} in collection '${collection}'`);
    } catch (error) {
      this.logger.error(`Failed to update document ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(collection: string, id: string): Promise<void> {
    try {
      await this.client.delete(collection, {
        points: [id],
      });
      this.logger.debug(`Deleted document ${id} from collection '${collection}'`);
    } catch (error) {
      this.logger.error(`Failed to delete document ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete multiple documents matching filter
   */
  async deleteBatch(collection: string, filter: VectorSearchFilter): Promise<number> {
    try {
      const qdrantFilter = this.buildQdrantFilter(filter);
      const result = await this.client.delete(collection, {
        filter: qdrantFilter,
      });

      this.logger.log(`Deleted documents from collection '${collection}'`);
      return result.status === 'acknowledged' ? 1 : 0;
    } catch (error) {
      this.logger.error(`Failed to delete batch in '${collection}':`, error);
      throw error;
    }
  }

  /**
   * Count documents in collection
   */
  async count(collection: string, filter?: VectorSearchFilter): Promise<number> {
    try {
      const qdrantFilter = this.buildQdrantFilter(filter);
      const result = await this.client.count(collection, {
        filter: qdrantFilter,
      });
      return result.count;
    } catch (error) {
      this.logger.error(`Failed to count documents in '${collection}':`, error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.getCollections();
      return true;
    } catch (error) {
      this.logger.error('Qdrant health check failed:', error);
      return false;
    }
  }
}
