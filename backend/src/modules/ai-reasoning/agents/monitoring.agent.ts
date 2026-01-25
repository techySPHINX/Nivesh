import { Injectable, Logger } from '@nestjs/common';
import { BaseAgent } from './base.agent';
import { AgentMessage, AgentResponse, AgentType } from '../types/agent.types';
import { ToolRegistry } from '../services/tool-registry.service';
import { DecisionTraceService } from '../services/decision-trace.service';

/**
 * Alert Interface
 */
interface Alert {
  id: string;
  type: 'budget_overrun' | 'goal_deviation' | 'anomaly' | 'opportunity' | 'risk';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  timestamp: Date;
  actionRequired: boolean;
  suggestedActions: string[];
}

/**
 * Goal Progress Interface
 */
interface GoalProgress {
  goalId: string;
  goalName: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date;
  percentComplete: number;
  onTrack: boolean;
  monthlyRequired: number;
  currentMonthlyRate: number;
  deviation: number;
  projectedCompletion: Date;
}

/**
 * Budget Monitoring Interface
 */
interface BudgetMonitoring {
  category: string;
  limit: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  daysRemaining: number;
  burnRate: number; // per day
  projectedOverrun: boolean;
}

/**
 * Monthly Report Interface
 */
interface MonthlyReport {
  month: string;
  year: number;
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number;
  topSpendingCategories: Array<{ category: string; amount: number }>;
  goalProgress: GoalProgress[];
  alerts: Alert[];
  recommendations: string[];
}

/**
 * MonitoringAgent
 * Specialized agent for continuous financial monitoring and alerting.
 *
 * Capabilities:
 * - Track goal progress in real-time
 * - Detect budget overruns early
 * - Identify spending anomalies
 * - Generate proactive alerts
 * - Automated monthly reports
 * - Investment performance tracking
 *
 * Example Use Cases:
 * 1. Budget Monitoring:
 *    - Alert: "Food budget 85% used with 10 days remaining"
 *    - Suggestion: "Daily limit: ₹500 to stay within budget"
 *
 * 2. Goal Tracking:
 *    - Alert: "House goal 12% behind schedule"
 *    - Suggestion: "Increase savings by ₹5K/month to get back on track"
 *
 * 3. Anomaly Detection:
 *    - Alert: "Unusual spending: ₹15K on electronics (300% above average)"
 *    - Question: "Was this planned?"
 *
 * 4. Opportunity Alerts:
 *    - Alert: "Emergency fund reached 6 months"
 *    - Suggestion: "Consider increasing equity allocation"
 *
 * @Injectable
 */
@Injectable()
export class MonitoringAgent extends BaseAgent {
  protected readonly logger = new Logger(MonitoringAgent.name);

  constructor(
    toolRegistry: ToolRegistry,
    decisionTraceService: DecisionTraceService,
  ) {
    super(AgentType.MONITORING_ALERTING, toolRegistry, decisionTraceService);
  }

  /**
   * Execute monitoring task
   */
  async execute(message: AgentMessage): Promise<AgentResponse> {
    const { task, context } = message.payload;
    const traceId = context.traceId;

    this.logger.log(`Executing MonitoringAgent: ${task}`);

    try {
      await this.recordReasoning(
        `Starting monitoring task: ${task}`,
        traceId,
      );

      let result;
      switch (task) {
        case 'track_goals':
          result = await this.trackGoalProgress(context, traceId);
          break;
        case 'monitor_budgets':
          result = await this.monitorBudgets(context, traceId);
          break;
        case 'detect_anomalies':
          result = await this.detectAnomalies(context, traceId);
          break;
        case 'generate_monthly_report':
          result = await this.generateMonthlyReport(context, traceId);
          break;
        case 'check_alerts':
          result = await this.checkAlerts(context, traceId);
          break;
        default:
          throw new Error(`Unknown task: ${task}`);
      }

      return result;
    } catch (error) {
      this.logger.error(
        `MonitoringAgent execution failed: ${error.message}`,
        error.stack,
      );
      return this.handleError(error, context);
    }
  }

  /**
   * Track progress towards financial goals
   */
  private async trackGoalProgress(
    context: any,
    traceId?: string,
  ): Promise<AgentResponse> {
    const goals = context.goals || [];
    const currentDate = new Date();

    const reasoning: string[] = [];
    const progressReports: GoalProgress[] = [];
    const alerts: Alert[] = [];

    reasoning.push(`Tracking ${goals.length} financial goals`);

    await this.recordReasoning('Analyzing goal progress', traceId);

    for (const goal of goals) {
      const progress = this.calculateGoalProgress(goal, currentDate);
      progressReports.push(progress);

      reasoning.push(
        `${goal.name}: ${progress.percentComplete.toFixed(1)}% complete, ${progress.onTrack ? 'ON TRACK' : 'BEHIND SCHEDULE'}`,
      );

      // Generate alerts for goals that are off-track
      if (!progress.onTrack) {
        const shortfall = progress.monthlyRequired - progress.currentMonthlyRate;
        alerts.push({
          id: `alert-goal-${goal.id}`,
          type: 'goal_deviation',
          severity: progress.deviation > 0.2 ? 'critical' : 'warning',
          title: `Goal Behind Schedule: ${goal.name}`,
          description: `Currently ${(progress.deviation * 100).toFixed(1)}% behind. Need to increase monthly savings by ₹${shortfall.toLocaleString()}.`,
          timestamp: currentDate,
          actionRequired: true,
          suggestedActions: [
            `Increase monthly savings by ₹${shortfall.toLocaleString()}`,
            'Review and cut discretionary spending',
            'Consider extending goal timeline',
          ],
        });
      }

      // Generate alerts for goals nearing completion
      if (progress.percentComplete > 90 && progress.percentComplete < 100) {
        alerts.push({
          id: `alert-goal-near-${goal.id}`,
          type: 'opportunity',
          severity: 'info',
          title: `Goal Almost Complete: ${goal.name}`,
          description: `You're ${progress.percentComplete.toFixed(1)}% of the way there! Just ₹${(goal.targetAmount - goal.currentAmount).toLocaleString()} to go.`,
          timestamp: currentDate,
          actionRequired: false,
          suggestedActions: [
            'Maintain current savings rate',
            'Plan celebration for achievement',
          ],
        });
      }
    }

    await this.recordReasoning(
      `Generated ${alerts.length} alerts from goal tracking`,
      traceId,
    );

    return this.createSuccessResponse(
      { progressReports, alerts },
      reasoning,
      [],
      0.9,
      ['Review off-track goals weekly', 'Adjust budgets if needed'],
    );
  }

  /**
   * Monitor budget usage across categories
   */
  private async monitorBudgets(
    context: any,
    traceId?: string,
  ): Promise<AgentResponse> {
    const budgets = context.budgets || [];
    const currentDate = new Date();
    const daysInMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0,
    ).getDate();
    const dayOfMonth = currentDate.getDate();
    const daysRemaining = daysInMonth - dayOfMonth;

    const reasoning: string[] = [];
    const budgetStatus: BudgetMonitoring[] = [];
    const alerts: Alert[] = [];

    reasoning.push(`Monitoring ${budgets.length} category budgets`);
    reasoning.push(`Days remaining in month: ${daysRemaining}`);

    await this.recordReasoning('Analyzing budget consumption', traceId);

    for (const budget of budgets) {
      const spent = budget.currentSpending || 0;
      const limit = budget.monthlyLimit;
      const remaining = limit - spent;
      const percentUsed = (spent / limit) * 100;
      const burnRate = spent / dayOfMonth;
      const projectedSpend = burnRate * daysInMonth;
      const projectedOverrun = projectedSpend > limit;

      const status: BudgetMonitoring = {
        category: budget.category,
        limit,
        spent,
        remaining,
        percentUsed,
        daysRemaining,
        burnRate,
        projectedOverrun,
      };

      budgetStatus.push(status);

      reasoning.push(
        `${budget.category}: ${percentUsed.toFixed(1)}% used, ${projectedOverrun ? 'PROJECTED OVERRUN' : 'on track'}`,
      );

      // Alert if budget is projected to overrun
      if (projectedOverrun) {
        const dailyLimit = remaining / daysRemaining;
        alerts.push({
          id: `alert-budget-overrun-${budget.category}`,
          type: 'budget_overrun',
          severity: percentUsed > 100 ? 'critical' : 'warning',
          title: `Budget Overrun Projected: ${budget.category}`,
          description: `Currently at ${percentUsed.toFixed(1)}% with ${daysRemaining} days left. Projected to exceed by ₹${(projectedSpend - limit).toLocaleString()}.`,
          timestamp: currentDate,
          actionRequired: true,
          suggestedActions: [
            `Limit daily spending to ₹${dailyLimit.toFixed(0)}`,
            `Cut non-essential ${budget.category} expenses`,
            'Transfer funds from other categories if needed',
          ],
        });
      }

      // Alert if budget threshold exceeded (80%)
      if (percentUsed > 80 && !projectedOverrun) {
        alerts.push({
          id: `alert-budget-threshold-${budget.category}`,
          type: 'budget_overrun',
          severity: 'warning',
          title: `Budget Alert: ${budget.category}`,
          description: `You've used ${percentUsed.toFixed(1)}% of your budget with ${daysRemaining} days remaining.`,
          timestamp: currentDate,
          actionRequired: false,
          suggestedActions: [
            `Remaining budget: ₹${remaining.toLocaleString()}`,
            `Daily limit: ₹${(remaining / daysRemaining).toFixed(0)}`,
          ],
        });
      }
    }

    await this.recordReasoning(
      `Generated ${alerts.length} budget alerts`,
      traceId,
    );

    return this.createSuccessResponse(
      { budgetStatus, alerts },
      reasoning,
      [],
      0.88,
      ['Review high-burn categories', 'Adjust spending patterns'],
    );
  }

  /**
   * Detect spending anomalies
   */
  private async detectAnomalies(
    context: any,
    traceId?: string,
  ): Promise<AgentResponse> {
    const transactions = context.recentTransactions || [];
    const spendingPatterns = context.spendingPatterns || [];

    const reasoning: string[] = [];
    const alerts: Alert[] = [];

    reasoning.push(`Analyzing ${transactions.length} recent transactions`);

    await this.recordReasoning('Detecting anomalies', traceId);

    for (const transaction of transactions) {
      const pattern = spendingPatterns.find(
        (p: any) => p.category === transaction.category,
      );

      if (!pattern) continue;

      const deviation =
        (transaction.amount - pattern.averageAmount) / pattern.averageAmount;

      // Alert if transaction is 2x or more above average
      if (deviation > 1.0) {
        alerts.push({
          id: `alert-anomaly-${transaction.id}`,
          type: 'anomaly',
          severity: deviation > 2.0 ? 'critical' : 'warning',
          title: `Unusual Spending Detected: ${transaction.category}`,
          description: `₹${transaction.amount.toLocaleString()} spent at ${transaction.merchant} - ${((deviation + 1) * 100).toFixed(0)}% above average (₹${pattern.averageAmount.toLocaleString()}).`,
          timestamp: new Date(transaction.date),
          actionRequired: true,
          suggestedActions: [
            'Verify if this was a planned purchase',
            'Check for unauthorized transactions',
            'Update budget if this is a new recurring expense',
          ],
        });

        reasoning.push(
          `Anomaly: ${transaction.category} ₹${transaction.amount.toLocaleString()} (${((deviation + 1) * 100).toFixed(0)}% of average)`,
        );
      }
    }

    await this.recordReasoning(
      `Detected ${alerts.length} anomalies`,
      traceId,
    );

    return this.createSuccessResponse(
      { alerts, anomalyCount: alerts.length },
      reasoning,
      [],
      0.85,
      ['Review flagged transactions', 'Update fraud alerts if needed'],
    );
  }

  /**
   * Generate comprehensive monthly report
   */
  private async generateMonthlyReport(
    context: any,
    traceId?: string,
  ): Promise<AgentResponse> {
    const now = new Date();
    const month = now.toLocaleString('default', { month: 'long' });
    const year = now.getFullYear();

    const income = context.monthlyIncome || 0;
    const expenses = context.totalExpenses || 0;
    const savings = income - expenses;
    const savingsRate = (savings / income) * 100;

    const reasoning: string[] = [];

    reasoning.push(`Generating report for ${month} ${year}`);
    reasoning.push(`Income: ₹${income.toLocaleString()}`);
    reasoning.push(`Expenses: ₹${expenses.toLocaleString()}`);
    reasoning.push(`Savings: ₹${savings.toLocaleString()} (${savingsRate.toFixed(1)}%)`);

    await this.recordReasoning('Compiling monthly report', traceId);

    // Get top spending categories
    const topSpendingCategories = (context.spendingPatterns || [])
      .sort((a: any, b: any) => b.totalAmount - a.totalAmount)
      .slice(0, 5)
      .map((p: any) => ({
        category: p.category,
        amount: p.totalAmount,
      }));

    // Get goal progress
    const goalProgress = await this.trackGoalProgress(context, traceId);

    // Generate recommendations
    const recommendations: string[] = [];

    if (savingsRate < 20) {
      recommendations.push(
        `Low savings rate (${savingsRate.toFixed(1)}%). Target: 20-30%`,
      );
    }

    if (savingsRate > 30) {
      recommendations.push(
        `Excellent savings rate (${savingsRate.toFixed(1)}%)! Consider increasing investments.`,
      );
    }

    topSpendingCategories.forEach((cat) => {
      const percentOfIncome = (cat.amount / income) * 100;
      if (percentOfIncome > 30) {
        recommendations.push(
          `${cat.category} is ${percentOfIncome.toFixed(1)}% of income - consider reducing`,
        );
      }
    });

    const report: MonthlyReport = {
      month,
      year,
      income,
      expenses,
      savings,
      savingsRate,
      topSpendingCategories,
      goalProgress: goalProgress.result.progressReports || [],
      alerts: goalProgress.result.alerts || [],
      recommendations,
    };

    await this.recordReasoning('Monthly report generated', traceId);

    return this.createSuccessResponse(
      { report },
      reasoning,
      [],
      0.92,
      ['Review report with family', 'Adjust next month's plan'],
    );
  }

  /**
   * Check for active alerts across all monitoring areas
   */
  private async checkAlerts(
    context: any,
    traceId?: string,
  ): Promise<AgentResponse> {
    const reasoning: string[] = [];
    const allAlerts: Alert[] = [];

    // Collect alerts from all monitoring tasks
    const goalTracking = await this.trackGoalProgress(context, traceId);
    allAlerts.push(...(goalTracking.result.alerts || []));

    const budgetMonitoring = await this.monitorBudgets(context, traceId);
    allAlerts.push(...(budgetMonitoring.result.alerts || []));

    const anomalyDetection = await this.detectAnomalies(context, traceId);
    allAlerts.push(...(anomalyDetection.result.alerts || []));

    // Group by severity
    const critical = allAlerts.filter((a) => a.severity === 'critical');
    const warnings = allAlerts.filter((a) => a.severity === 'warning');
    const info = allAlerts.filter((a) => a.severity === 'info');

    reasoning.push(`Total alerts: ${allAlerts.length}`);
    reasoning.push(`Critical: ${critical.length}`);
    reasoning.push(`Warnings: ${warnings.length}`);
    reasoning.push(`Info: ${info.length}`);

    return this.createSuccessResponse(
      {
        alerts: allAlerts,
        summary: { critical: critical.length, warnings: warnings.length, info: info.length },
      },
      reasoning,
      [],
      0.9,
      ['Address critical alerts immediately', 'Review warnings weekly'],
    );
  }

  /**
   * Calculate goal progress metrics
   */
  private calculateGoalProgress(goal: any, currentDate: Date): GoalProgress {
    const targetDate = new Date(goal.targetDate);
    const startDate = new Date(goal.createdAt || currentDate);

    const totalDays = Math.floor(
      (targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const daysElapsed = Math.floor(
      (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const daysRemaining = totalDays - daysElapsed;

    const currentAmount = goal.currentAmount || 0;
    const targetAmount = goal.targetAmount;

    const percentComplete = (currentAmount / targetAmount) * 100;
    const percentTimeElapsed = (daysElapsed / totalDays) * 100;

    // Goal is on track if progress >= time elapsed
    const onTrack = percentComplete >= percentTimeElapsed;
    const deviation = (percentTimeElapsed - percentComplete) / 100;

    const monthlyRequired = (targetAmount - currentAmount) / (daysRemaining / 30);
    const currentMonthlyRate =
      daysElapsed > 0 ? (currentAmount / daysElapsed) * 30 : 0;

    const projectedCompletion = new Date(
      currentDate.getTime() +
        ((targetAmount - currentAmount) / currentMonthlyRate) *
          30 *
          24 *
          60 *
          60 *
          1000,
    );

    return {
      goalId: goal.id,
      goalName: goal.name,
      targetAmount,
      currentAmount,
      targetDate,
      percentComplete,
      onTrack,
      monthlyRequired,
      currentMonthlyRate,
      deviation,
      projectedCompletion,
    };
  }
}
