import { Injectable, Logger } from '@nestjs/common';
import { CypherQuery, GraphQueryResult, IKnowledgeGraphRepository } from '../../domain';
import { SpendingPattern, PatternType } from '../../domain/entities/spending-pattern.entity';

/**
 * Service for detecting spending patterns from the knowledge graph
 * Uses Cypher queries to analyze transaction relationships and identify patterns
 */
@Injectable()
export class SpendingPatternDetector {
  private readonly logger = new Logger(SpendingPatternDetector.name);

  constructor(
    // private readonly graphRepository: IKnowledgeGraphRepository,
  ) {}

  /**
   * Detect all patterns for a user
   */
  async detectPatternsForUser(userId: string): Promise<SpendingPattern[]> {
    this.logger.log(`Detecting patterns for user: ${userId}`);

    const patterns: SpendingPattern[] = [];

    // Detect different pattern types
    patterns.push(...(await this.detectRecurringPayments(userId)));
    patterns.push(...(await this.detectCategoryConcentration(userId)));
    patterns.push(...(await this.detectMerchantLoyalty(userId)));
    patterns.push(...(await this.detectTimeOfDayPatterns(userId)));
    patterns.push(...(await this.detectUnusualSpending(userId)));

    return patterns;
  }

  /**
   * Detect recurring payment patterns
   * Identifies merchants with regular transaction intervals
   */
  private async detectRecurringPayments(userId: string): Promise<SpendingPattern[]> {
    const query = CypherQuery.create(
      `
      MATCH (u:User {id: $userId})-[:OWNS]->(a:Account)
            -[:MADE_TRANSACTION]->(t:Transaction)-[:AT_MERCHANT]->(m:Merchant)
      WHERE t.date >= date() - duration('P90D')
      WITH m, COLLECT(t) as transactions, COLLECT(t.date) as dates, SUM(t.amount) as total
      WHERE SIZE(transactions) >= 3
      WITH m, transactions, dates, total,
           duration.between(dates[0], dates[-1]).days / SIZE(dates) as avgInterval,
           stdev([t IN transactions | t.amount]) as amountStdDev
      WHERE avgInterval >= 25 AND avgInterval <= 35
        AND amountStdDev < 50
      RETURN m.id, m.name, transactions, total, SIZE(transactions) as frequency, avgInterval
      `,
      { userId },
    );

    // Placeholder - will execute with graphRepository
    // const result = await this.graphRepository.executeReadQuery(query);
    return [];
  }

  /**
   * Detect category concentration patterns
   * High spending in specific categories
   */
  private async detectCategoryConcentration(userId: string): Promise<SpendingPattern[]> {
    const query = CypherQuery.create(
      `
      MATCH (u:User {id: $userId})-[:OWNS]->(a:Account)
            -[:MADE_TRANSACTION]->(t:Transaction)-[:BELONGS_TO_CATEGORY]->(c:Category)
      WHERE t.date >= date() - duration('P30D')
      WITH c, SUM(t.amount) as categoryTotal, COUNT(t) as transactionCount
      ORDER BY categoryTotal DESC
      LIMIT 5
      WITH COLLECT(categoryTotal) as totals, SUM(categoryTotal) as grandTotal
      UNWIND totals as catTotal
      WITH catTotal, grandTotal, (catTotal / grandTotal) as percentage
      WHERE percentage > 0.3
      RETURN percentage, catTotal
      `,
      { userId },
    );

    return [];
  }

  /**
   * Detect merchant loyalty patterns
   * Frequent purchases at specific merchants
   */
  private async detectMerchantLoyalty(userId: string): Promise<SpendingPattern[]> {
    const query = CypherQuery.create(
      `
      MATCH (u:User {id: $userId})-[:OWNS]->(a:Account)
            -[:MADE_TRANSACTION]->(t:Transaction)-[:AT_MERCHANT]->(m:Merchant)
      WHERE t.date >= date() - duration('P60D')
      WITH m, COUNT(t) as visitCount, SUM(t.amount) as totalSpent
      WHERE visitCount >= 5
      RETURN m.id, m.name, visitCount, totalSpent
      ORDER BY visitCount DESC
      LIMIT 10
      `,
      { userId },
    );

    return [];
  }

  /**
   * Detect time-of-day spending patterns
   */
  private async detectTimeOfDayPatterns(userId: string): Promise<SpendingPattern[]> {
    const query = CypherQuery.create(
      `
      MATCH (u:User {id: $userId})-[:OWNS]->(a:Account)-[:MADE_TRANSACTION]->(t:Transaction)
      WHERE t.date >= date() - duration('P30D')
      WITH t.date.hour as hour, COUNT(t) as count, SUM(t.amount) as total
      WHERE count >= 5
      RETURN hour, count, total
      ORDER BY count DESC
      `,
      { userId },
    );

    return [];
  }

  /**
   * Detect unusual spending patterns (anomalies)
   */
  private async detectUnusualSpending(userId: string): Promise<SpendingPattern[]> {
    const query = CypherQuery.create(
      `
      MATCH (u:User {id: $userId})-[:OWNS]->(a:Account)-[:MADE_TRANSACTION]->(t:Transaction)
      WHERE t.date >= date() - duration('P30D')
      WITH AVG(t.amount) as avgAmount, stdev(t.amount) as stdDev
      MATCH (u:User {id: $userId})-[:OWNS]->(a:Account)-[:MADE_TRANSACTION]->(t2:Transaction)
      WHERE t2.date >= date() - duration('P7D')
        AND t2.amount > (avgAmount + 2 * stdDev)
      RETURN t2, avgAmount, stdDev
      `,
      { userId },
    );

    return [];
  }
}
