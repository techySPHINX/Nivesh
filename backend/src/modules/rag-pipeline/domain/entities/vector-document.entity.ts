/**
 * Vector Document Entity
 * 
 * Represents a document stored in the vector database
 * Used across all three collections (userContext, knowledgeBase, conversations)
 */
export class VectorDocument {
  id: string;
  text: string;
  vector: number[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt?: Date;

  constructor(partial: Partial<VectorDocument>) {
    Object.assign(this, partial);
  }

  /**
   * Validate vector dimension matches expected size
   */
  validateDimension(expectedDim: number): boolean {
    return this.vector.length === expectedDim;
  }

  /**
   * Sanitize metadata for storage (remove nulls, undefined)
   */
  sanitizeMetadata(): Record<string, any> {
    return Object.entries(this.metadata).reduce((acc, [key, value]) => {
      if (value !== null && value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);
  }
}

/**
 * User Financial Context Vector Document
 * Specialized for transaction, goal, budget, and insight indexing
 */
export interface UserFinancialContextVector {
  id: string;
  userId: string;
  contextType: 'transaction' | 'goal' | 'budget' | 'insight';
  text: string;
  metadata: {
    entityId: string; // Original transaction/goal/budget ID
    amount?: number;
    category?: string;
    date?: string;
    confidence?: number;
    source?: string;
  };
  vector: number[];
  createdAt: Date;
}

/**
 * Financial Knowledge Base Vector Document
 * For FAQs, regulations, product information, strategies
 */
export interface FinancialKnowledgeVector {
  id: string;
  knowledgeType: 'faq' | 'regulation' | 'product' | 'strategy' | 'guideline';
  question: string;
  answer: string;
  tags: string[];
  metadata: {
    source: string;
    authority?: string; // e.g., "RBI", "SEBI", "Internal"
    version?: string;
    lastVerified?: string;
  };
  vector: number[];
  lastUpdated: Date;
}

/**
 * Conversation History Vector Document
 * For contextual continuity in user conversations
 */
export interface ConversationVector {
  id: string;
  userId: string;
  query: string;
  response: string;
  intent: string;
  metadata: {
    sessionId?: string;
    timestamp: Date;
    feedbackScore?: number; // -1, 0, 1
    contextUsed?: string[]; // IDs of documents used in retrieval
    modelVersion?: string;
  };
  vector: number[];
  timestamp: Date;
}
