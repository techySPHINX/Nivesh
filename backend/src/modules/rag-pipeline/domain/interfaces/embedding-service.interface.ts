import { EmbeddingVector } from '../entities/embedding-vector.entity';

/**
 * Embedding Service Interface
 * 
 * Abstraction for generating embeddings from text
 * Implementations: local (sentence-transformers), remote (OpenAI)
 */
export interface IEmbeddingService {
  /**
   * Generate embedding for a single text
   */
  generateEmbedding(text: string): Promise<EmbeddingVector>;

  /**
   * Generate embeddings for multiple texts (batched)
   */
  generateBatchEmbeddings(texts: string[]): Promise<EmbeddingVector[]>;

  /**
   * Get the model name being used
   */
  getModelName(): string;

  /**
   * Get the vector dimension produced by this model
   */
  getVectorDimension(): number;
}
