/**
 * Embedding Vector Value Object
 * 
 * Represents a single embedding vector with metadata
 */
export class EmbeddingVector {
  readonly vector: number[];
  readonly dimension: number;
  readonly model: string;
  readonly createdAt: Date;

  constructor(
    vector: number[],
    model: string,
    createdAt: Date = new Date(),
  ) {
    this.vector = vector;
    this.dimension = vector.length;
    this.model = model;
    this.createdAt = createdAt;
  }

  /**
   * Validate vector has expected dimension
   */
  validateDimension(expected: number): boolean {
    return this.dimension === expected;
  }

  /**
   * Calculate L2 norm (magnitude) of vector
   */
  magnitude(): number {
    return Math.sqrt(this.vector.reduce((sum, val) => sum + val * val, 0));
  }

  /**
   * Normalize vector to unit length
   */
  normalize(): number[] {
    const mag = this.magnitude();
    if (mag === 0) return this.vector;
    return this.vector.map(val => val / mag);
  }

  /**
   * Calculate cosine similarity with another vector
   */
  cosineSimilarity(other: number[]): number {
    if (this.vector.length !== other.length) {
      throw new Error('Vector dimensions must match for cosine similarity');
    }

    const dotProduct = this.vector.reduce((sum, val, i) => sum + val * other[i], 0);
    const thisMag = this.magnitude();
    const otherMag = Math.sqrt(other.reduce((sum, val) => sum + val * val, 0));

    if (thisMag === 0 || otherMag === 0) return 0;
    return dotProduct / (thisMag * otherMag);
  }

  /**
   * Serialize for storage/transmission
   */
  toJSON() {
    return {
      vector: this.vector,
      dimension: this.dimension,
      model: this.model,
      createdAt: this.createdAt.toISOString(),
    };
  }
}
