import { RetrievalResult } from '../entities/retrieval-result.entity';
import { VectorSearchFilter } from './vector-store.interface';

/**
 * Retrieval strategy configuration
 */
export interface RetrievalConfig {
  topK: number;
  scoreThreshold: number;
  diversityWeight: number; // 0-1, balance between relevance and diversity
  recencyWeight: number; // 0-1, how much to favor recent documents
}

/**
 * Retriever Interface
 * 
 * High-level abstraction for semantic retrieval
 */
export interface IRetriever {
  /**
   * Retrieve relevant context for a query
   */
  retrieveContext(
    query: string,
    userId?: string,
    config?: Partial<RetrievalConfig>,
  ): Promise<RetrievalResult[]>;

  /**
   * Search specific collection
   */
  searchCollection(
    collection: string,
    query: string,
    filter?: VectorSearchFilter,
    limit?: number,
  ): Promise<RetrievalResult[]>;

  /**
   * Hybrid search across multiple collections
   */
  hybridSearch(
    query: string,
    collections: string[],
    userId?: string,
    topK?: number,
  ): Promise<RetrievalResult[]>;

  /**
   * Re-rank results using advanced scoring
   */
  reRank(
    results: RetrievalResult[],
    config?: Partial<RetrievalConfig>,
  ): Promise<RetrievalResult[]>;
}
