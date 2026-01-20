import { Injectable, Logger } from '@nestjs/common';
import { CypherQuery, IKnowledgeGraphRepository } from '../../domain';

/**
 * Category insights interface
 */
export interface CategoryInsight {
  categoryId: string;
  categoryName: string;
  totalSpent: number;
  transactionCount: number;
  averageTransaction: number;
  percentageOfTotal: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  topMerchants: string[];
}

/**
 * Service for analyzing spending by category
 */
@Injectable()
export class CategoryInsightsService {
  private readonly logger = new Logger(CategoryInsightsService.name);

  constructor(
    // private readonly graphRepository: IKnowledgeGraphRepository,
  ) {}

  /**
   * Get category insights for a user
   */
  async getCategoryInsights(userId: string, period = 30): Promise<CategoryInsight[]> {
    const query = CypherQuery.create(
      `
      MATCH (u:User {id: $userId})-[:OWNS]->(a:Account)
            -[:MADE_TRANSACTION]->(t:Transaction)-[:BELONGS_TO_CATEGORY]->(c:Category)
      WHERE t.date >= date() - duration({days: $period})
      WITH c, SUM(t.amount) as total, COUNT(t) as count
      RETURN c.id, c.name, total, count, total/count as avgTransaction
      ORDER BY total DESC
      `,
      { userId, period },
    );

    return [];
  }

  /**
   * Find similar users based on spending categories
   */
  async findSimilarUsers(userId: string, limit = 10): Promise<string[]> {
    const query = CypherQuery.create(
      `
      MATCH (u1:User {id: $userId})-[r:SIMILAR_SPENDING]->(u2:User)
      WHERE r.confidence > 0.7
      RETURN u2.id, r.similarity, r.sharedCategories
      ORDER BY r.similarity DESC
      LIMIT $limit
      `,
      { userId, limit },
    );

    return [];
  }
}
