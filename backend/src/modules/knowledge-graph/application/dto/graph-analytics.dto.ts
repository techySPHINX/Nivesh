/**
 * Response DTOs for Knowledge Graph API
 */

/**
 * Spending Pattern DTO
 */
export class SpendingPatternDto {
  id: string;
  patternType: string;
  confidence: number;
  frequency: number;
  totalAmount: number;
  description: string;
  recommendations: RecommendationDto[];
  metadata: {
    categories?: string[];
    merchants?: string[];
    timeframe?: string;
    averageAmount?: number;
  };
}

/**
 * Category Insight DTO
 */
export class CategoryInsightDto {
  categoryId: string;
  categoryName: string;
  totalSpent: number;
  transactionCount: number;
  averageTransaction: number;
  percentageOfTotal: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  topMerchants: MerchantDto[];
}

/**
 * Merchant DTO
 */
export class MerchantDto {
  id: string;
  name: string;
  category?: string;
  visitCount?: number;
  totalSpent?: number;
  similarity?: number;
}

/**
 * Similar User DTO
 */
export class SimilarUserDto {
  userId: string;
  similarity: number;
  confidence: number;
  sharedCategories: string[];
  sharedMerchants: string[];
  sharedGoals?: string[];
}

/**
 * Recommendation DTO
 */
export class RecommendationDto {
  type: 'AUTOMATION' | 'ALERT' | 'BUDGET' | 'GOAL' | 'OPTIMIZATION';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  actionable: boolean;
  confidence: number;
}

/**
 * Anomaly DTO
 */
export class AnomalyDto {
  transactionId: string;
  amount: number;
  date: string;
  deviationScore: number;
  anomalyType: string;
  confidence: number;
  description: string;
}

/**
 * Graph Statistics DTO
 */
export class GraphStatisticsDto {
  totalNodes: number;
  totalRelationships: number;
  nodesByType: Record<string, number>;
  relationshipsByType: Record<string, number>;
  averageDegree: number;
  density: number;
  lastUpdated: string;
}

/**
 * Merchant Network DTO
 */
export class MerchantNetworkDto {
  merchantId: string;
  merchantName: string;
  similarMerchants: Array<{
    id: string;
    name: string;
    similarity: number;
    sharedCustomers: number;
  }>;
  chainAffiliations: string[];
}

/**
 * Path Finding DTO
 */
export class GraphPathDto {
  from: string;
  to: string;
  length: number;
  nodes: string[];
  relationships: string[];
  weight: number;
}
