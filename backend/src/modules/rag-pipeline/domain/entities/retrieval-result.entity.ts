/**
 * Retrieval Result Entity
 * 
 * Represents a single search result with relevance scoring
 */
export class RetrievalResult {
  id: string;
  text: string;
  score: number; // Similarity score (0-1, higher is better)
  metadata: Record<string, any>;
  collection: string;
  rank?: number; // Position after re-ranking

  constructor(partial: Partial<RetrievalResult>) {
    Object.assign(this, partial);
  }

  /**
   * Determine if result meets minimum relevance threshold
   */
  isRelevant(threshold: number = 0.7): boolean {
    return this.score >= threshold;
  }

  /**
   * Calculate recency score based on timestamp in metadata
   * More recent = higher score (exponential decay)
   */
  calculateRecencyScore(halfLifeDays: number = 30): number {
    if (!this.metadata.date && !this.metadata.timestamp) {
      return 0.5; // Neutral score if no date available
    }

    const date = new Date(this.metadata.date || this.metadata.timestamp);
    const now = new Date();
    const daysSince = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    
    // Exponential decay: score = 0.5^(days / halfLife)
    return Math.pow(0.5, daysSince / halfLifeDays);
  }

  /**
   * Normalize score to 0-1 range
   */
  normalizeScore(min: number, max: number): number {
    if (max === min) return 1;
    return (this.score - min) / (max - min);
  }
}

/**
 * Aggregated retrieval results from multiple collections
 */
export class AggregatedRetrievalResults {
  results: RetrievalResult[];
  totalResults: number;
  averageScore: number;
  collections: string[];
  query: string;
  retrievalTimeMs: number;
  cacheHit: boolean;

  constructor(partial: Partial<AggregatedRetrievalResults>) {
    Object.assign(this, partial);
  }

  /**
   * Filter results by minimum relevance threshold
   */
  filterByThreshold(threshold: number): RetrievalResult[] {
    return this.results.filter(r => r.isRelevant(threshold));
  }

  /**
   * Get top K results
   */
  topK(k: number): RetrievalResult[] {
    return this.results.slice(0, k);
  }

  /**
   * Group results by collection
   */
  groupByCollection(): Map<string, RetrievalResult[]> {
    return this.results.reduce((acc, result) => {
      if (!acc.has(result.collection)) {
        acc.set(result.collection, []);
      }
      acc.get(result.collection)!.push(result);
      return acc;
    }, new Map<string, RetrievalResult[]>());
  }

  /**
   * Calculate diversity score (how many different collections represented)
   */
  calculateDiversity(): number {
    const uniqueCollections = new Set(this.results.map(r => r.collection));
    return uniqueCollections.size / this.collections.length;
  }
}
