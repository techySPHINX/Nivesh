import { VectorDocument } from '../entities/vector-document.entity';

/**
 * Filter options for vector search
 */
export interface VectorSearchFilter {
  userId?: string;
  contextType?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
  categories?: string[];
  minAmount?: number;
  maxAmount?: number;
  tags?: string[];
  customFilters?: Record<string, any>;
}

/**
 * Search options for vector queries
 */
export interface VectorSearchOptions {
  collection: string;
  vector: number[];
  limit?: number;
  offset?: number;
  filter?: VectorSearchFilter;
  scoreThreshold?: number;
}

/**
 * Search result from vector store
 */
export interface VectorSearchResult {
  id: string;
  score: number;
  payload: Record<string, any>;
}

/**
 * Vector Store Interface
 * 
 * Abstraction for vector database operations
 * Implementation: Qdrant, but designed to be swappable
 */
export interface IVectorStore {
  /**
   * Initialize/ensure collection exists with proper schema
   */
  ensureCollection(
    name: string,
    vectorSize: number,
    distance: 'Cosine' | 'Euclid' | 'Dot',
  ): Promise<void>;

  /**
   * Index a single document
   */
  indexDocument(
    collection: string,
    document: VectorDocument,
  ): Promise<string>;

  /**
   * Index multiple documents in batch
   */
  indexBatch(
    collection: string,
    documents: VectorDocument[],
  ): Promise<string[]>;

  /**
   * Search for similar vectors
   */
  search(options: VectorSearchOptions): Promise<VectorSearchResult[]>;

  /**
   * Get document by ID
   */
  getDocument(collection: string, id: string): Promise<VectorDocument | null>;

  /**
   * Update document
   */
  updateDocument(
    collection: string,
    id: string,
    updates: Partial<VectorDocument>,
  ): Promise<void>;

  /**
   * Delete document
   */
  deleteDocument(collection: string, id: string): Promise<void>;

  /**
   * Delete multiple documents matching filter
   */
  deleteBatch(collection: string, filter: VectorSearchFilter): Promise<number>;

  /**
   * Count documents in collection
   */
  count(collection: string, filter?: VectorSearchFilter): Promise<number>;

  /**
   * Health check
   */
  healthCheck(): Promise<boolean>;
}
