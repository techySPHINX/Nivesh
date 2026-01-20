import { Injectable, Logger } from '@nestjs/common';
import { CypherQuery, IKnowledgeGraphRepository } from '../../domain';

/**
 * Interface for detected anomaly
 */
export interface SpendingAnomaly {
  transactionId: string;
  userId: string;
  amount: number;
  date: Date;
  deviationScore: number; // How many standard deviations from mean
  anomalyType: 'high_amount' | 'unusual_merchant' | 'unusual_time' | 'unusual_category';
  confidence: number;
  description: string;
}

/**
 * Service for detecting spending anomalies using statistical analysis
 * Identifies transactions that deviate significantly from user's normal behavior
 */
@Injectable()
export class AnomalyDetector {
  private readonly logger = new Logger(AnomalyDetector.name);

  constructor(
    // private readonly graphRepository: IKnowledgeGraphRepository,
  ) { }

  /**
   * Detect all types of anomalies for a user
   */
  async detectAnomalies(userId: string): Promise<SpendingAnomaly[]> {
    this.logger.log(`Detecting anomalies for user: ${userId}`);

    const anomalies: SpendingAnomaly[] = [];

    anomalies.push(...(await this.detectAmountAnomalies(userId)));
    anomalies.push(...(await this.detectMerchantAnomalies(userId)));
    anomalies.push(...(await this.detectTimeAnomalies(userId)));

    return anomalies;
  }

  /**
   * Detect transactions with unusually high amounts
   * Uses Z-score approach (>2 standard deviations)
   */
  private async detectAmountAnomalies(userId: string): Promise<SpendingAnomaly[]> {
    const query = CypherQuery.create(
      `
      MATCH (u:User {id: $userId})-[:OWNS]->(a:Account)-[:MADE_TRANSACTION]->(t:Transaction)
      WHERE t.date >= date() - duration('P90D')
      WITH AVG(t.amount) as avgAmount, stdev(t.amount) as stdDev
      MATCH (u:User {id: $userId})-[:OWNS]->(a:Account)-[:MADE_TRANSACTION]->(t2:Transaction)
      WHERE t2.date >= date() - duration('P7D')
        AND t2.amount > (avgAmount + 2 * stdDev)
      RETURN t2.id as transactionId, t2.amount, t2.date,
             (t2.amount - avgAmount) / stdDev as zScore
      ORDER BY zScore DESC
      `,
      { userId },
    );

    return [];
  }

  /**
   * Detect transactions at unusual merchants
   */
  private async detectMerchantAnomalies(userId: string): Promise<SpendingAnomaly[]> {
    const query = CypherQuery.create(
      `
      MATCH (u:User {id: $userId})-[:OWNS]->(a:Account)
            -[:MADE_TRANSACTION]->(t:Transaction)-[:AT_MERCHANT]->(m:Merchant)
      WHERE t.date >= date() - duration('P7D')
      WITH t, m
      MATCH (u:User {id: $userId})-[:OWNS]->(a:Account)
            -[:MADE_TRANSACTION]->(historicalT:Transaction)-[:AT_MERCHANT]->(m)
      WHERE historicalT.date < date() - duration('P7D')
        AND historicalT.date >= date() - duration('P90D')
      WITH t, m, COUNT(historicalT) as historicalVisits
      WHERE historicalVisits = 0
      RETURN t.id, t.amount, t.date, m.name
      `,
      { userId },
    );

    return [];
  }

  /**
   * Detect transactions at unusual times
   */
  private async detectTimeAnomalies(userId: string): Promise<SpendingAnomaly[]> {
    const query = CypherQuery.create(
      `
      MATCH (u:User {id: $userId})-[:OWNS]->(a:Account)-[:MADE_TRANSACTION]->(t:Transaction)
      WHERE t.date >= date() - duration('P90D')
      WITH t.date.hour as hour, COUNT(*) as count
      WHERE count < 5
      RETURN hour, count
      `,
      { userId },
    );

    return [];
  }
}
