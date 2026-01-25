import { registerAs } from '@nestjs/config';

export interface QdrantCollectionConfig {
  name: string;
  vectorSize: number;
  distance: 'Cosine' | 'Euclid' | 'Dot';
}

export interface QdrantConfig {
  url: string;
  apiKey?: string;
  timeout: number;
  collections: {
    userContext: QdrantCollectionConfig;
    knowledgeBase: QdrantCollectionConfig;
    conversations: QdrantCollectionConfig;
  };
}

/**
 * Qdrant Vector Database Configuration
 * 
 * Collections:
 * - userContext: User's financial data (transactions, goals, budgets)
 * - knowledgeBase: Financial knowledge, FAQs, regulations, products
 * - conversations: Historical conversations for context continuity
 * 
 * Vector Dimension: 384 (sentence-transformers/all-MiniLM-L6-v2)
 * Distance Metric: Cosine (optimal for semantic similarity)
 */
export default registerAs(
  'qdrant',
  (): QdrantConfig => ({
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY,
    timeout: parseInt(process.env.QDRANT_TIMEOUT || '30000', 10),
    
    collections: {
      // User's financial context: transactions, goals, budgets, insights
      userContext: {
        name: 'user_financial_context',
        vectorSize: 384, // all-MiniLM-L6-v2 dimension
        distance: 'Cosine',
      },
      
      // Financial knowledge base: FAQs, regulations, product info
      knowledgeBase: {
        name: 'financial_knowledge',
        vectorSize: 384,
        distance: 'Cosine',
      },
      
      // Conversation history for context continuity
      conversations: {
        name: 'conversation_history',
        vectorSize: 384,
        distance: 'Cosine',
      },
    },
  }),
);
