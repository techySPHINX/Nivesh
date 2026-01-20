import { Injectable, Inject, Logger } from '@nestjs/common';
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
    @Inject('IKnowledgeGraphRepository')
    private readonly graphRepository: IKnowledgeGraphRepository,
  ) { }

  /**
   * Detect all patterns for a user
   */
  async detectPatternsForUser(userId: string): Promise<SpendingPattern[]> {
    this.logger.log(`Detecting patterns for user: ${userId}`);

    const patterns: SpendingPattern[] = [];

    // Detect different pattern types
    try {
      patterns.push(...(await this.detectRecurringPayments(userId)));
      patterns.push(...(await this.detectCategoryConcentration(userId)));
      patterns.push(...(await this.detectMerchantLoyalty(userId)));
      patterns.push(...(await this.detectTimeOfDayPatterns(userId)));
      patterns.push(...(await this.detectUnusualSpending(userId)));
    } catch (error) {
      this.logger.error(`Failed to detect patterns for user ${userId}`, error);
    }

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
      RETURN m.id as merchantId, m.name as merchantName, 
             total, SIZE(transactions) as frequency, avgInterval
      `,
      { userId },
    );

    try {
      const result = await this.graphRepository.executeReadQuery<any>(query);

      return result.records.map(record =>
        SpendingPattern.create({
          userId,
          patternType: PatternType.RECURRING_PAYMENT,
          nodes: [],
          relationships: [],
          frequency: record.frequency,
          confidence: record.amountStdDev < 10 ? 0.95 : 0.75,
          totalAmount: record.total,
          timeframe: {
            startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            endDate: new Date(),
            periodicity: 'monthly',
          },
          metadata: {
            avgInterval: record.avgInterval,
            categories: [],
            merchants: [record.merchantName],
            locations: [],
            tags: [],
            averageAmount: record.total / record.frequency,
            lastOccurrence: new Date(),
          } as any,
        })
      );
    } catch (error) {
      this.logger.debug('Could not detect recurring payments, graph may not be populated yet');
      return [];
    }
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
      WITH c, categoryTotal, transactionCount,
           SUM(categoryTotal) OVER() as grandTotal
      WITH c, categoryTotal, transactionCount, grandTotal,
           (categoryTotal / grandTotal) as percentage
      WHERE percentage > 0.3
      RETURN c.name as categoryName, percentage, categoryTotal, transactionCount
      `,
      { userId },
    );

    try {
      const result = await this.graphRepository.executeReadQuery<any>(query);

      return result.records.map(record =>
        SpendingPattern.create({
          userId,
          patternType: PatternType.CATEGORY_CONCENTRATION,
          nodes: [],
          relationships: [],
          frequency: record.transactionCount,
          confidence: 0.85,
          totalAmount: record.categoryTotal,
          timeframe: {
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            endDate: new Date(),
            periodicity: 'monthly',
          },
          metadata: {
            percentage: record.percentage * 100,
            categories: [record.categoryName],
            merchants: [],
            locations: [],
            tags: [],
            averageAmount: record.categoryTotal / record.transactionCount,
            lastOccurrence: new Date(),
          } as any,
        })
      );
    } catch (error) {
      this.logger.debug('Could not detect category concentration');
      return [];
    }
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
      RETURN m.id as merchantId, m.name as merchantName, visitCount, totalSpent
      ORDER BY visitCount DESC
      LIMIT 10
      `,
      { userId },
    );

    try {
      const result = await this.graphRepository.executeReadQuery<any>(query);

      return result.records.map(record =>
        SpendingPattern.create({
          userId,
          patternType: PatternType.MERCHANT_LOYALTY,
          nodes: [],
          relationships: [],
          frequency: record.visitCount,
          confidence: 0.80,
          totalAmount: record.totalSpent,
          timeframe: {
            startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
            endDate: new Date(),
            periodicity: 'monthly',
          },
          metadata: {
            categories: [],
            merchants: [record.merchantName],
            locations: [],
            tags: [],
            averageAmount: record.totalSpent / record.visitCount,
            lastOccurrence: new Date(),
          } as any,
        })
      );
    } catch (error) {
      this.logger.debug('Could not detect merchant loyalty');
      return [];
    }
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
      LIMIT 3
      `,
      { userId },
    );

    try {
      const result = await this.graphRepository.executeReadQuery<any>(query);

      return result.records.map(record =>
        SpendingPattern.create({
          userId,
          patternType: PatternType.TIME_OF_DAY,
          nodes: [],
          relationships: [],
          frequency: record.count,
          confidence: 0.70,
          totalAmount: record.total,
          timeframe: {
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            endDate: new Date(),
            periodicity: 'daily',
          },
          metadata: {
            categories: [],
            merchants: [],
            locations: [],
            tags: [],
            averageAmount: record.total / record.count,
            lastOccurrence: new Date(),
          } as any,
        })
      );
    } catch (error) {
      this.logger.debug('Could not detect time-of-day patterns');
      return [];
    }
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
      RETURN t2.id as transactionId, t2.amount as amount, 
             t2.description as description, avgAmount, stdDev
      LIMIT 5
      `,
      { userId },
    );

    try {
      const result = await this.graphRepository.executeReadQuery<any>(query);

      return result.records.map(record =>
        SpendingPattern.create({
          userId,
          patternType: PatternType.UNUSUAL_SPENDING,
          nodes: [],
          relationships: [],
          frequency: 1,
          confidence: 0.90,
          totalAmount: record.amount,
          timeframe: {
            startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            endDate: new Date(),
          },
          metadata: {
            categories: [],
            merchants: [],
            locations: [],
            tags: [],
            averageAmount: record.amount,
            lastOccurrence: new Date(),
          } as any,
        })
      );
    } catch (error) {
      this.logger.debug('Could not detect unusual spending');
      return [];
    }
  }
}
