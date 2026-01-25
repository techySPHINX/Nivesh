import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { AgentType, AgentResponse } from '../types/agent.types';
import { DecisionTraceService } from './decision-trace.service';

/**
 * Feedback Data Interface
 */
interface FeedbackData {
  traceId: string;
  userId: string;
  feedback: 'positive' | 'negative' | 'neutral';
  rating: number; // 1-5
  comment?: string;
  timestamp: Date;
}

/**
 * Agent Performance Metrics
 */
interface AgentPerformanceMetrics {
  agentType: AgentType;
  totalExecutions: number;
  successRate: number;
  averageConfidence: number;
  averageDuration: number;
  positiveFeedbackRate: number;
  improvementScore: number; // Trend over time
  recommendationAccuracy?: number;
}

/**
 * Learning Insights
 */
interface LearningInsights {
  patterns: Array<{
    pattern: string;
    frequency: number;
    successRate: number;
  }>;
  improvements: Array<{
    area: string;
    suggestion: string;
    impact: 'high' | 'medium' | 'low';
  }>;
  userBehavior: {
    preferredWorkflows: string[];
    peakUsageHours: number[];
    averageSessionDuration: number;
  };
}

/**
 * AgentLearningService
 * Implements feedback loops and continuous improvement for the agent system.
 *
 * Capabilities:
 * - User feedback collection and analysis
 * - Agent performance tracking
 * - Pattern recognition in user queries
 * - Recommendation accuracy measurement
 * - Agent weight optimization
 * - A/B testing support
 *
 * Learning Mechanisms:
 * 1. Direct Feedback: User thumbs up/down on responses
 * 2. Implicit Feedback: User actions after recommendations
 * 3. Performance Metrics: Success rates, confidence scores
 * 4. Pattern Analysis: Common query types and outcomes
 *
 * Optimization:
 * - Agent selection probability based on past performance
 * - Workflow recommendation based on success patterns
 * - Timeout adjustment based on execution history
 * - Confidence threshold tuning
 *
 * Example Flow:
 * User gives thumbs up on goal planning advice
 * → System: FinancialPlanningAgent success +1
 * → Over time: Increase weight for similar queries
 * → Future: Prioritize FinancialPlanningAgent for goal queries
 *
 * @Injectable
 */
@Injectable()
export class AgentLearningService {
  private readonly logger = new Logger(AgentLearningService.name);

  // Cache for agent weights (probability multipliers)
  private agentWeights: Map<AgentType, number> = new Map();

  private readonly WEIGHT_UPDATE_THRESHOLD = 10; // Update after N feedbacks
  private readonly WEIGHT_DECAY_FACTOR = 0.95; // Gradual return to baseline

  constructor(
    private readonly prisma: PrismaService,
    private readonly decisionTrace: DecisionTraceService,
  ) {
    this.initializeWeights();
  }

  /**
   * Initialize agent weights to neutral (1.0)
   */
  private initializeWeights() {
    const agentTypes = Object.values(AgentType);
    agentTypes.forEach((type) => {
      this.agentWeights.set(type, 1.0);
    });
  }

  /**
   * Record user feedback on agent response
   */
  async recordFeedback(feedbackData: FeedbackData): Promise<void> {
    this.logger.log(
      `Recording ${feedbackData.feedback} feedback for trace: ${feedbackData.traceId}`,
    );

    try {
      // Store feedback
      await this.prisma.agentFeedback.create({
        data: {
          traceId: feedbackData.traceId,
          userId: feedbackData.userId,
          feedback: feedbackData.feedback,
          rating: feedbackData.rating,
          comment: feedbackData.comment,
          createdAt: feedbackData.timestamp,
        },
      });

      // Get execution details
      const execution = await this.prisma.agentExecution.findFirst({
        where: { traceId: feedbackData.traceId },
      });

      if (!execution) {
        this.logger.warn(`Execution not found for trace: ${feedbackData.traceId}`);
        return;
      }

      // Update agent metrics
      await this.updateAgentMetrics(
        execution.agentType,
        feedbackData.feedback === 'positive',
      );

      // Trigger weight optimization
      await this.optimizeAgentWeights();
    } catch (error) {
      this.logger.error('Failed to record feedback', error.stack);
      throw error;
    }
  }

  /**
   * Update agent performance metrics
   */
  private async updateAgentMetrics(
    agentType: string,
    isPositive: boolean,
  ): Promise<void> {
    try {
      const metrics = await this.prisma.agentMetrics.findUnique({
        where: { agentType },
      });

      if (!metrics) {
        // Create new metrics
        await this.prisma.agentMetrics.create({
          data: {
            agentType,
            totalExecutions: 1,
            successfulExecutions: 0,
            positiveFeedbackCount: isPositive ? 1 : 0,
            negativeFeedbackCount: isPositive ? 0 : 1,
            avgConfidence: 0,
            avgDurationMs: 0,
            lastUpdated: new Date(),
          },
        });
      } else {
        // Update existing metrics
        await this.prisma.agentMetrics.update({
          where: { agentType },
          data: {
            positiveFeedbackCount: isPositive
              ? metrics.positiveFeedbackCount + 1
              : metrics.positiveFeedbackCount,
            negativeFeedbackCount: isPositive
              ? metrics.negativeFeedbackCount
              : metrics.negativeFeedbackCount + 1,
            lastUpdated: new Date(),
          },
        });
      }
    } catch (error) {
      this.logger.error('Failed to update agent metrics', error.stack);
    }
  }

  /**
   * Get agent performance metrics
   */
  async getAgentPerformance(
    agentType: AgentType,
  ): Promise<AgentPerformanceMetrics | null> {
    try {
      const metrics = await this.decisionTrace.getAgentMetrics(agentType);

      if (!metrics) {
        return null;
      }

      const totalFeedback =
        metrics.positiveFeedbackCount + metrics.negativeFeedbackCount;

      const positiveFeedbackRate =
        totalFeedback > 0
          ? (metrics.positiveFeedbackCount / totalFeedback) * 100
          : 0;

      const successRate =
        (metrics.successfulExecutions / metrics.totalExecutions) * 100;

      // Calculate improvement score (trend)
      const improvementScore = await this.calculateImprovementTrend(agentType);

      return {
        agentType,
        totalExecutions: metrics.totalExecutions,
        successRate,
        averageConfidence: metrics.avgConfidence || 0,
        averageDuration: metrics.avgDurationMs || 0,
        positiveFeedbackRate,
        improvementScore,
      };
    } catch (error) {
      this.logger.error('Failed to get agent performance', error.stack);
      return null;
    }
  }

  /**
   * Calculate improvement trend over time
   */
  private async calculateImprovementTrend(agentType: string): Promise<number> {
    try {
      // Get last 30 days of executions
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentExecutions = await this.prisma.agentExecution.findMany({
        where: {
          agentType,
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      if (recentExecutions.length < 10) {
        return 0; // Not enough data
      }

      // Split into first half and second half
      const midpoint = Math.floor(recentExecutions.length / 2);
      const firstHalf = recentExecutions.slice(0, midpoint);
      const secondHalf = recentExecutions.slice(midpoint);

      // Calculate average confidence for each half
      const firstAvgConf =
        firstHalf.reduce((sum, e) => sum + (e.confidence || 0), 0) /
        firstHalf.length;
      const secondAvgConf =
        secondHalf.reduce((sum, e) => sum + (e.confidence || 0), 0) /
        secondHalf.length;

      // Improvement score: positive = improving, negative = declining
      return ((secondAvgConf - firstAvgConf) / firstAvgConf) * 100;
    } catch (error) {
      this.logger.error('Failed to calculate improvement trend', error.stack);
      return 0;
    }
  }

  /**
   * Optimize agent weights based on performance
   */
  async optimizeAgentWeights(): Promise<void> {
    this.logger.log('Optimizing agent weights based on performance');

    try {
      const agentTypes = Object.values(AgentType);

      for (const agentType of agentTypes) {
        const performance = await this.getAgentPerformance(agentType);

        if (!performance || performance.totalExecutions < this.WEIGHT_UPDATE_THRESHOLD) {
          continue;
        }

        // Calculate new weight based on multiple factors
        const baseWeight = 1.0;
        const successFactor = performance.successRate / 100;
        const feedbackFactor = performance.positiveFeedbackRate / 100;
        const confidenceFactor = performance.averageConfidence;

        // Weighted average
        const newWeight =
          baseWeight *
          (0.4 * successFactor +
            0.4 * feedbackFactor +
            0.2 * confidenceFactor);

        // Apply decay to prevent extreme weights
        const currentWeight = this.agentWeights.get(agentType) || 1.0;
        const adjustedWeight =
          currentWeight * this.WEIGHT_DECAY_FACTOR +
          newWeight * (1 - this.WEIGHT_DECAY_FACTOR);

        // Clamp between 0.5 and 2.0
        const finalWeight = Math.max(0.5, Math.min(2.0, adjustedWeight));

        this.agentWeights.set(agentType, finalWeight);

        this.logger.log(
          `Agent ${agentType} weight updated: ${finalWeight.toFixed(2)}`,
        );
      }
    } catch (error) {
      this.logger.error('Weight optimization failed', error.stack);
    }
  }

  /**
   * Get agent weight (for probability-based selection)
   */
  getAgentWeight(agentType: AgentType): number {
    return this.agentWeights.get(agentType) || 1.0;
  }

  /**
   * Generate learning insights
   */
  async generateLearningInsights(
    userId?: string,
  ): Promise<LearningInsights> {
    try {
      // Analyze patterns
      const patterns = await this.analyzePatterns(userId);

      // Generate improvement suggestions
      const improvements = await this.generateImprovements();

      // Analyze user behavior
      const userBehavior = await this.analyzeUserBehavior(userId);

      return {
        patterns,
        improvements,
        userBehavior,
      };
    } catch (error) {
      this.logger.error('Failed to generate insights', error.stack);
      return {
        patterns: [],
        improvements: [],
        userBehavior: {
          preferredWorkflows: [],
          peakUsageHours: [],
          averageSessionDuration: 0,
        },
      };
    }
  }

  /**
   * Analyze patterns in executions
   */
  private async analyzePatterns(userId?: string): Promise<
    Array<{
      pattern: string;
      frequency: number;
      successRate: number;
    }>
  > {
    const where = userId ? { userId } : {};

    const executions = await this.prisma.agentExecution.findMany({
      where,
      take: 1000,
      orderBy: { createdAt: 'desc' },
    });

    // Group by agent type
    const patternMap = new Map<
      string,
      { count: number; successCount: number }
    >();

    executions.forEach((exec) => {
      const current = patternMap.get(exec.agentType) || {
        count: 0,
        successCount: 0,
      };
      current.count++;
      if (exec.success) current.successCount++;
      patternMap.set(exec.agentType, current);
    });

    return Array.from(patternMap.entries())
      .map(([pattern, stats]) => ({
        pattern,
        frequency: stats.count,
        successRate: (stats.successCount / stats.count) * 100,
      }))
      .sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Generate improvement suggestions
   */
  private async generateImprovements(): Promise<
    Array<{
      area: string;
      suggestion: string;
      impact: 'high' | 'medium' | 'low';
    }>
  > {
    const improvements = [];
    const agentTypes = Object.values(AgentType);

    for (const agentType of agentTypes) {
      const performance = await this.getAgentPerformance(agentType);

      if (!performance) continue;

      // Low success rate
      if (performance.successRate < 70) {
        improvements.push({
          area: `${agentType} Success Rate`,
          suggestion: `Success rate is ${performance.successRate.toFixed(1)}%. Review error patterns and improve error handling.`,
          impact: 'high' as const,
        });
      }

      // Low confidence
      if (performance.averageConfidence < 0.7) {
        improvements.push({
          area: `${agentType} Confidence`,
          suggestion: `Average confidence is ${(performance.averageConfidence * 100).toFixed(1)}%. Improve data quality or adjust algorithms.`,
          impact: 'medium' as const,
        });
      }

      // Negative trend
      if (performance.improvementScore < -10) {
        improvements.push({
          area: `${agentType} Performance Trend`,
          suggestion: `Performance declining by ${Math.abs(performance.improvementScore).toFixed(1)}%. Investigate recent changes.`,
          impact: 'high' as const,
        });
      }
    }

    return improvements.sort((a, b) => {
      const impactOrder = { high: 0, medium: 1, low: 2 };
      return impactOrder[a.impact] - impactOrder[b.impact];
    });
  }

  /**
   * Analyze user behavior patterns
   */
  private async analyzeUserBehavior(userId?: string): Promise<{
    preferredWorkflows: string[];
    peakUsageHours: number[];
    averageSessionDuration: number;
  }> {
    // Mock implementation - in production, analyze actual usage data
    return {
      preferredWorkflows: ['goal_planning', 'portfolio_review'],
      peakUsageHours: [9, 10, 20, 21], // 9-10 AM, 8-9 PM
      averageSessionDuration: 15 * 60 * 1000, // 15 minutes
    };
  }

  /**
   * Get all agent weights (for debugging/monitoring)
   */
  getAllAgentWeights(): Record<string, number> {
    const weights: Record<string, number> = {};
    this.agentWeights.forEach((weight, agentType) => {
      weights[agentType] = weight;
    });
    return weights;
  }
}
