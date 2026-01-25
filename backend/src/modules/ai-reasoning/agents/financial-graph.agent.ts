import { Injectable, Logger } from '@nestjs/common';
import { BaseAgent } from './base.agent';
import { AgentMessage, AgentResponse, AgentType } from '../types/agent.types';
import { ToolRegistry } from '../services/tool-registry.service';
import { DecisionTraceService } from '../services/decision-trace.service';

/**
 * Graph Query Result Interface
 * Results from Neo4j graph queries
 */
interface GraphQueryResult {
  nodes: any[];
  relationships: any[];
  insights: string[];
  metadata: {
    queryType: string;
    executionTime: number;
    resultCount: number;
  };
}

/**
 * Spending Pattern Interface
 * Detected spending patterns from transaction graph
 */
interface SpendingPattern {
  category: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'occasional';
  averageAmount: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  merchants: string[];
  percentageOfIncome: number;
  anomalies: Array<{
    date: string;
    amount: number;
    reason: string;
  }>;
}

/**
 * Merchant Loyalty Analysis
 * Loyalty and spending patterns at specific merchants
 */
interface MerchantLoyalty {
  merchantName: string;
  totalSpent: number;
  transactionCount: number;
  averageTicketSize: number;
  frequency: number; // transactions per month
  loyaltyScore: number; // 0-100
  recommendations: string[];
}

/**
 * FinancialGraphAgent
 * Specialized agent for querying Neo4j knowledge graph for relationship-based insights.
 *
 * Capabilities:
 * - Spending pattern detection across categories
 * - Merchant loyalty analysis
 * - Category concentration alerts
 * - Goal impact analysis
 * - Transaction relationship mapping
 * - Anomaly detection in spending
 * - Income source diversification analysis
 *
 * Example Use Case:
 * User asks: "Where am I spending most of my money?"
 * Agent:
 * 1. Queries transaction graph for all categories
 * 2. Detects top 3 categories: Food (35%), Transport (25%), Entertainment (15%)
 * 3. Finds concentration risk: 75% in 3 categories
 * 4. Identifies frequent merchants: Swiggy (₹15K/month), Ola (₹8K/month)
 * 5. Detects anomaly: Entertainment spending increased 40% in last month
 * 6. Recommends: Set budget caps for top categories
 *
 * Graph Queries:
 * - risk_indicators: DTI, emergency fund, investment portfolio
 * - spending_patterns: Category-wise analysis
 * - merchant_loyalty: Specific merchant analysis
 * - goal_impact: How transactions affect goals
 * - transaction_flow: Money flow visualization
 *
 * @Injectable
 */
@Injectable()
export class FinancialGraphAgent extends BaseAgent {
  protected readonly logger = new Logger(FinancialGraphAgent.name);

  // Concentration risk thresholds
  private readonly HIGH_CONCENTRATION_THRESHOLD = 0.5; // 50% in one category
  private readonly LOYALTY_SCORE_THRESHOLD = 70; // 70/100 for high loyalty

  constructor(
    toolRegistry: ToolRegistry,
    decisionTraceService: DecisionTraceService,
  ) {
    super(AgentType.FINANCIAL_GRAPH, toolRegistry, decisionTraceService);
  }

  /**
   * Execute graph query task
   *
   * Expected message.payload structure:
   * {
   *   task: 'analyze_spending' | 'find_merchant_loyalty' | 'detect_anomalies' | 'goal_impact',
   *   context: {
   *     userId: string,
   *     timeframe?: string, // 'month', 'quarter', 'year'
   *     category?: string,
   *     merchantName?: string,
   *     traceId?: string
   *   }
   * }
   */
  async execute(message: AgentMessage): Promise<AgentResponse> {
    const { task, context } = message.payload;
    const traceId = context.traceId;

    this.logger.log(`Executing FinancialGraphAgent: ${task}`);

    try {
      await this.recordReasoning(
        `Starting graph query task: ${task}`,
        traceId,
      );

      if (!context.userId) {
        throw new Error('Missing required context: userId');
      }

      // Route to appropriate handler
      let result;
      switch (task) {
        case 'analyze_spending':
          result = await this.analyzeSpendingPatterns(context, traceId);
          break;
        case 'find_merchant_loyalty':
          result = await this.analyzeMerchantLoyalty(context, traceId);
          break;
        case 'detect_anomalies':
          result = await this.detectSpendingAnomalies(context, traceId);
          break;
        case 'goal_impact':
          result = await this.analyzeGoalImpact(context, traceId);
          break;
        default:
          throw new Error(`Unknown task: ${task}`);
      }

      return result;
    } catch (error) {
      this.logger.error(
        `FinancialGraphAgent execution failed: ${error.message}`,
        error.stack,
      );
      return this.handleError(error, context);
    }
  }

  /**
   * Analyze spending patterns across categories
   */
  private async analyzeSpendingPatterns(
    context: any,
    traceId?: string,
  ): Promise<AgentResponse> {
    const userId = context.userId;
    const timeframe = context.timeframe || 'month';

    const reasoning: string[] = [];
    const toolsUsed: string[] = [];

    reasoning.push(`Analyzing spending patterns for timeframe: ${timeframe}`);

    await this.recordReasoning(
      'Querying transaction graph for spending patterns',
      traceId,
    );

    // Query graph for spending data
    const graphData = await this.callTool(
      'query_financial_graph',
      {
        userId,
        queryType: 'spending_patterns',
        timeframe,
      },
      traceId,
    );

    toolsUsed.push('query_financial_graph');

    // Analyze patterns
    const patterns: SpendingPattern[] = this.extractSpendingPatterns(graphData);

    reasoning.push(`Identified ${patterns.length} spending categories`);

    // Calculate concentration
    const totalSpending = patterns.reduce((sum, p) => sum + p.averageAmount, 0);
    const topCategories = patterns.slice(0, 3);

    const topThreePercentage =
      topCategories.reduce((sum, p) => sum + p.averageAmount, 0) / totalSpending;

    reasoning.push(
      `Total spending: ₹${totalSpending.toLocaleString()}/${timeframe}`,
    );
    reasoning.push(
      `Top 3 categories account for ${(topThreePercentage * 100).toFixed(1)}% of spending`,
    );

    topCategories.forEach((pattern, index) => {
      reasoning.push(
        `${index + 1}. ${pattern.category}: ₹${pattern.averageAmount.toLocaleString()} (${pattern.percentageOfIncome.toFixed(1)}% of income) - ${pattern.trend}`,
      );
    });

    // Check for concentration risk
    const concentrationRisk = topThreePercentage > this.HIGH_CONCENTRATION_THRESHOLD;
    if (concentrationRisk) {
      reasoning.push(
        `⚠️ High concentration risk: ${(topThreePercentage * 100).toFixed(1)}% in top 3 categories`,
      );
    }

    await this.recordReasoning(
      `Analyzed ${patterns.length} spending patterns`,
      traceId,
    );

    return this.createSuccessResponse(
      {
        patterns,
        totalSpending,
        concentrationRisk,
        topCategories: topCategories.map((p) => p.category),
      },
      reasoning,
      toolsUsed,
      0.87,
      concentrationRisk
        ? ['Set budget limits for top categories', 'Diversify spending']
        : ['Spending distribution is healthy', 'Monitor monthly trends'],
    );
  }

  /**
   * Analyze merchant loyalty and spending
   */
  private async analyzeMerchantLoyalty(
    context: any,
    traceId?: string,
  ): Promise<AgentResponse> {
    const userId = context.userId;
    const merchantName = context.merchantName;

    const reasoning: string[] = [];
    const toolsUsed: string[] = [];

    await this.recordReasoning(
      `Analyzing merchant loyalty${merchantName ? ` for ${merchantName}` : ''}`,
      traceId,
    );

    // Query graph for merchant data
    const graphData = await this.callTool(
      'query_financial_graph',
      {
        userId,
        queryType: 'merchant_loyalty',
        merchantName,
      },
      traceId,
    );

    toolsUsed.push('query_financial_graph');

    // Analyze loyalty
    const loyaltyAnalysis: MerchantLoyalty[] =
      this.analyzeMerchantData(graphData);

    reasoning.push(`Analyzed ${loyaltyAnalysis.length} merchants`);

    // Find high-loyalty merchants
    const highLoyaltyMerchants = loyaltyAnalysis.filter(
      (m) => m.loyaltyScore >= this.LOYALTY_SCORE_THRESHOLD,
    );

    if (highLoyaltyMerchants.length > 0) {
      reasoning.push(
        `High loyalty merchants (${highLoyaltyMerchants.length}):`,
      );
      highLoyaltyMerchants.forEach((merchant) => {
        reasoning.push(
          `  ${merchant.merchantName}: ₹${merchant.totalSpent.toLocaleString()} (${merchant.transactionCount} transactions, loyalty: ${merchant.loyaltyScore}/100)`,
        );
      });
    }

    await this.recordReasoning(
      `Found ${highLoyaltyMerchants.length} high-loyalty merchants`,
      traceId,
    );

    return this.createSuccessResponse(
      {
        merchantAnalysis: loyaltyAnalysis,
        highLoyaltyMerchants,
      },
      reasoning,
      toolsUsed,
      0.85,
      [
        'Explore loyalty programs and cashback offers',
        'Consider consolidating to fewer merchants for better deals',
      ],
    );
  }

  /**
   * Detect spending anomalies
   */
  private async detectSpendingAnomalies(
    context: any,
    traceId?: string,
  ): Promise<AgentResponse> {
    const userId = context.userId;

    const reasoning: string[] = [];
    const toolsUsed: string[] = [];

    await this.recordReasoning('Detecting spending anomalies', traceId);

    // Query graph for anomalies
    const graphData = await this.callTool(
      'query_financial_graph',
      {
        userId,
        queryType: 'anomaly_detection',
      },
      traceId,
    );

    toolsUsed.push('query_financial_graph');

    const anomalies = graphData.anomalies || [];

    reasoning.push(`Detected ${anomalies.length} spending anomalies`);

    if (anomalies.length > 0) {
      anomalies.forEach((anomaly: any, index: number) => {
        reasoning.push(
          `${index + 1}. ${anomaly.category}: ₹${anomaly.amount.toLocaleString()} on ${anomaly.date} (${anomaly.deviation}% above average) - ${anomaly.reason}`,
        );
      });
    } else {
      reasoning.push('No significant anomalies detected');
    }

    await this.recordReasoning(
      `Found ${anomalies.length} anomalies`,
      traceId,
    );

    return this.createSuccessResponse(
      {
        anomalies,
        anomalyCount: anomalies.length,
        severityLevel: anomalies.length > 5 ? 'high' : anomalies.length > 2 ? 'medium' : 'low',
      },
      reasoning,
      toolsUsed,
      0.82,
      anomalies.length > 0
        ? ['Review unusual transactions', 'Set alerts for future anomalies']
        : ['Spending patterns are normal', 'Continue monitoring'],
    );
  }

  /**
   * Analyze goal impact from transactions
   */
  private async analyzeGoalImpact(
    context: any,
    traceId?: string,
  ): Promise<AgentResponse> {
    const userId = context.userId;
    const goalId = context.goalId;

    const reasoning: string[] = [];
    const toolsUsed: string[] = [];

    await this.recordReasoning('Analyzing goal impact', traceId);

    // Query graph for goal relationships
    const graphData = await this.callTool(
      'query_financial_graph',
      {
        userId,
        queryType: 'goal_impact',
        goalId,
      },
      traceId,
    );

    toolsUsed.push('query_financial_graph');

    const goalData = graphData.goal || {};
    const savingsRate = goalData.monthlySavings || 0;
    const actualSavings = goalData.actualMonthlySavings || 0;
    const deficit = savingsRate - actualSavings;

    reasoning.push(`Goal: ${goalData.name}`);
    reasoning.push(
      `Required monthly savings: ₹${savingsRate.toLocaleString()}`,
    );
    reasoning.push(
      `Actual monthly savings: ₹${actualSavings.toLocaleString()}`,
    );

    if (deficit > 0) {
      reasoning.push(
        `⚠️ Deficit: ₹${deficit.toLocaleString()}/month`,
      );

      // Identify categories to reduce
      const categoriesImpactingGoal = graphData.impactingCategories || [];
      if (categoriesImpactingGoal.length > 0) {
        reasoning.push('Categories that can be reduced:');
        categoriesImpactingGoal.forEach((cat: any) => {
          reasoning.push(
            `  ${cat.name}: ₹${cat.amount.toLocaleString()} (reduce by ₹${cat.suggestedReduction.toLocaleString()})`,
          );
        });
      }
    } else {
      reasoning.push(
        `✓ On track: Saving ₹${Math.abs(deficit).toLocaleString()} more than required`,
      );
    }

    await this.recordReasoning(
      deficit > 0 ? `Goal deficit: ₹${deficit.toLocaleString()}` : 'Goal on track',
      traceId,
    );

    return this.createSuccessResponse(
      {
        goal: goalData,
        onTrack: deficit <= 0,
        deficit,
        impactingCategories: graphData.impactingCategories || [],
      },
      reasoning,
      toolsUsed,
      0.88,
      deficit > 0
        ? [
            'Reduce discretionary spending',
            'Set category budgets',
            'Review goal timeline',
          ]
        : ['Maintain current savings rate', 'Consider increasing goal amount'],
    );
  }

  /**
   * Extract spending patterns from graph data
   */
  private extractSpendingPatterns(graphData: any): SpendingPattern[] {
    const categories = graphData.categories || [];
    const totalIncome = graphData.monthlyIncome || 100000;

    return categories.map((cat: any) => ({
      category: cat.name,
      frequency: this.determineFrequency(cat.transactionCount, cat.timeframe),
      averageAmount: cat.averageAmount,
      trend: cat.trend || 'stable',
      merchants: cat.topMerchants || [],
      percentageOfIncome: (cat.averageAmount / totalIncome) * 100,
      anomalies: cat.anomalies || [],
    })).sort((a, b) => b.averageAmount - a.averageAmount); // Sort by amount desc
  }

  /**
   * Determine transaction frequency
   */
  private determineFrequency(
    transactionCount: number,
    timeframe: string,
  ): 'daily' | 'weekly' | 'monthly' | 'occasional' {
    const daysInTimeframe = timeframe === 'year' ? 365 : timeframe === 'quarter' ? 90 : 30;
    const avgPerDay = transactionCount / daysInTimeframe;

    if (avgPerDay >= 0.8) return 'daily';
    if (avgPerDay >= 0.2) return 'weekly';
    if (transactionCount >= 4) return 'monthly';
    return 'occasional';
  }

  /**
   * Analyze merchant data for loyalty
   */
  private analyzeMerchantData(graphData: any): MerchantLoyalty[] {
    const merchants = graphData.merchants || [];

    return merchants.map((merchant: any) => {
      const loyaltyScore = this.calculateLoyaltyScore(
        merchant.transactionCount,
        merchant.frequency,
        merchant.totalSpent,
      );

      return {
        merchantName: merchant.name,
        totalSpent: merchant.totalSpent,
        transactionCount: merchant.transactionCount,
        averageTicketSize: merchant.totalSpent / merchant.transactionCount,
        frequency: merchant.frequency,
        loyaltyScore,
        recommendations: this.generateMerchantRecommendations(
          loyaltyScore,
          merchant,
        ),
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent);
  }

  /**
   * Calculate loyalty score (0-100)
   */
  private calculateLoyaltyScore(
    transactionCount: number,
    frequency: number,
    totalSpent: number,
  ): number {
    // Higher transaction count = higher loyalty
    const countScore = Math.min(transactionCount / 20, 1) * 40;

    // Regular frequency = higher loyalty
    const frequencyScore = Math.min(frequency / 10, 1) * 30;

    // Higher spending = higher loyalty
    const spendingScore = Math.min(totalSpent / 50000, 1) * 30;

    return Math.round(countScore + frequencyScore + spendingScore);
  }

  /**
   * Generate merchant-specific recommendations
   */
  private generateMerchantRecommendations(
    loyaltyScore: number,
    merchant: any,
  ): string[] {
    const recommendations: string[] = [];

    if (loyaltyScore >= 70) {
      recommendations.push('Explore loyalty programs and premium benefits');
      recommendations.push('Check for subscription savings');
    }

    if (merchant.averageTicketSize > 5000) {
      recommendations.push('Consider credit card rewards for large purchases');
    }

    if (merchant.category === 'groceries' && merchant.frequency > 10) {
      recommendations.push('Look for bulk purchase discounts');
    }

    return recommendations;
  }
}
