import { Injectable, Logger } from '@nestjs/common';
import { BaseAgent } from './base.agent';
import { AgentMessage, AgentResponse, AgentType } from '../types/agent.types';
import { ToolRegistry } from '../services/tool-registry.service';
import { DecisionTraceService } from '../services/decision-trace.service';

/**
 * Action Interface
 * Represents a concrete actionable step
 */
interface Action {
  id: string;
  type: 'budget' | 'sip' | 'reminder' | 'alert' | 'transaction' | 'goal';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  dueDate?: Date;
  completed: boolean;
  parameters: Record<string, any>;
  estimatedImpact?: string;
}

/**
 * Budget Action Interface
 */
interface BudgetAction {
  category: string;
  monthlyLimit: number;
  currentSpending: number;
  alertThreshold: number; // % of limit
  actions: string[];
}

/**
 * SIP Setup Interface
 */
interface SIPSetup {
  fundName: string;
  amount: number;
  frequency: 'monthly' | 'weekly';
  startDate: Date;
  autoDebit: boolean;
  bankAccount: string;
}

/**
 * ActionExecutionAgent
 * Specialized agent for generating concrete, actionable next steps.
 *
 * Capabilities:
 * - Create budgets with category limits
 * - Setup automated SIP investments
 * - Generate reminders for financial tasks
 * - Create alerts for spending thresholds
 * - Schedule recurring transactions
 * - Track goal progress actions
 *
 * Example Use Case:
 * After financial planning analysis
 * Agent:
 * 1. Creates budget: Food ₹15K/month (alert at 80%)
 * 2. Sets up SIP: ₹30K/month in equity fund (1st of month)
 * 3. Adds reminder: Review portfolio (quarterly)
 * 4. Creates alert: Emergency fund below ₹3L
 * 5. Schedules: Loan prepayment ₹50K (annual)
 *
 * @Injectable
 */
@Injectable()
export class ActionExecutionAgent extends BaseAgent {
  protected readonly logger = new Logger(ActionExecutionAgent.name);

  constructor(
    toolRegistry: ToolRegistry,
    decisionTraceService: DecisionTraceService,
  ) {
    super(AgentType.ACTION_EXECUTION, toolRegistry, decisionTraceService);
  }

  /**
   * Execute action generation task
   */
  async execute(message: AgentMessage): Promise<AgentResponse> {
    const { task, context } = message.payload;
    const traceId = context.traceId;

    this.logger.log(`Executing ActionExecutionAgent: ${task}`);

    try {
      await this.recordReasoning(
        `Starting action execution task: ${task}`,
        traceId,
      );

      let result;
      switch (task) {
        case 'create_budget':
          result = await this.createBudget(context, traceId);
          break;
        case 'setup_sip':
          result = await this.setupSIP(context, traceId);
          break;
        case 'generate_actions':
          result = await this.generateActionPlan(context, traceId);
          break;
        case 'create_reminders':
          result = await this.createReminders(context, traceId);
          break;
        default:
          throw new Error(`Unknown task: ${task}`);
      }

      return result;
    } catch (error) {
      this.logger.error(
        `ActionExecutionAgent execution failed: ${error.message}`,
        error.stack,
      );
      return this.handleError(error, context);
    }
  }

  /**
   * Create budget with category limits
   */
  private async createBudget(
    context: any,
    traceId?: string,
  ): Promise<AgentResponse> {
    const spendingPatterns = context.spendingPatterns || [];
    const monthlyIncome = context.monthlyIncome;
    const savingsGoal = context.savingsGoal || monthlyIncome * 0.3;

    const reasoning: string[] = [];
    const budgets: BudgetAction[] = [];

    reasoning.push(`Monthly income: ₹${monthlyIncome.toLocaleString()}`);
    reasoning.push(
      `Savings goal: ₹${savingsGoal.toLocaleString()} (${((savingsGoal / monthlyIncome) * 100).toFixed(1)}%)`,
    );

    await this.recordReasoning('Creating category budgets', traceId);

    const remainingForExpenses = monthlyIncome - savingsGoal;

    spendingPatterns.forEach((pattern: any) => {
      const suggestedLimit = Math.min(
        pattern.averageAmount * 1.1, // 10% buffer
        remainingForExpenses * 0.3, // Max 30% of available funds per category
      );

      budgets.push({
        category: pattern.category,
        monthlyLimit: Math.round(suggestedLimit),
        currentSpending: pattern.averageAmount,
        alertThreshold: 80, // Alert at 80%
        actions: [
          `Set monthly limit: ₹${Math.round(suggestedLimit).toLocaleString()}`,
          `Current spending: ₹${pattern.averageAmount.toLocaleString()}`,
          `Buffer: ₹${Math.round(suggestedLimit - pattern.averageAmount).toLocaleString()}`,
        ],
      });

      reasoning.push(
        `${pattern.category}: Limit ₹${Math.round(suggestedLimit).toLocaleString()} (current: ₹${pattern.averageAmount.toLocaleString()})`,
      );
    });

    await this.recordReasoning(
      `Created ${budgets.length} category budgets`,
      traceId,
    );

    return this.createSuccessResponse(
      { budgets, totalBudgeted: remainingForExpenses },
      reasoning,
      [],
      0.85,
      [
        'Enable automatic alerts at 80% threshold',
        'Review and adjust budgets monthly',
      ],
    );
  }

  /**
   * Setup automated SIP investments
   */
  private async setupSIP(
    context: any,
    traceId?: string,
  ): Promise<AgentResponse> {
    const products = context.products || [];

    const reasoning: string[] = [];
    const sipSetups: SIPSetup[] = [];

    reasoning.push(`Setting up ${products.length} SIP investments`);

    await this.recordReasoning('Configuring SIP setups', traceId);

    products.forEach((product: any) => {
      const setup: SIPSetup = {
        fundName: product.name,
        amount: product.monthlyAmount,
        frequency: 'monthly',
        startDate: this.getNextMonthFirstDay(),
        autoDebit: true,
        bankAccount: context.bankAccount || 'Primary Savings',
      };

      sipSetups.push(setup);

      reasoning.push(
        `${product.name}: ₹${product.monthlyAmount.toLocaleString()}/month starting ${setup.startDate.toLocaleDateString()}`,
      );
    });

    const totalSIP = sipSetups.reduce((sum, sip) => sum + sip.amount, 0);
    reasoning.push(
      `Total monthly SIP: ₹${totalSIP.toLocaleString()}`,
    );

    await this.recordReasoning(
      `Configured ${sipSetups.length} SIP setups`,
      traceId,
    );

    return this.createSuccessResponse(
      { sipSetups, totalMonthly: totalSIP },
      reasoning,
      [],
      0.9,
      [
        'Complete KYC if not done',
        'Link bank account for auto-debit',
        'Set calendar reminder for SIP dates',
      ],
    );
  }

  /**
   * Generate comprehensive action plan
   */
  private async generateActionPlan(
    context: any,
    traceId?: string,
  ): Promise<AgentResponse> {
    const reasoning: string[] = [];
    const actions: Action[] = [];

    await this.recordReasoning('Generating comprehensive action plan', traceId);

    // Extract actions from all agent results
    if (context.financial_planning_result) {
      actions.push(...this.extractPlanningActions(context.financial_planning_result));
    }

    if (context.risk_assessment_result) {
      actions.push(...this.extractRiskActions(context.risk_assessment_result));
    }

    if (context.investment_advisor_result) {
      actions.push(...this.extractInvestmentActions(context.investment_advisor_result));
    }

    // Sort by priority
    actions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    reasoning.push(`Generated ${actions.length} actionable items`);
    reasoning.push(
      `High priority: ${actions.filter((a) => a.priority === 'high').length}`,
    );
    reasoning.push(
      `Medium priority: ${actions.filter((a) => a.priority === 'medium').length}`,
    );
    reasoning.push(
      `Low priority: ${actions.filter((a) => a.priority === 'low').length}`,
    );

    await this.recordReasoning(
      `Action plan with ${actions.length} items created`,
      traceId,
    );

    return this.createSuccessResponse(
      { actions, totalActions: actions.length },
      reasoning,
      [],
      0.88,
      [
        'Start with high-priority actions',
        'Set weekly review reminder',
        'Track completion progress',
      ],
    );
  }

  /**
   * Create financial reminders
   */
  private async createReminders(
    context: any,
    traceId?: string,
  ): Promise<AgentResponse> {
    const reminders = [
      {
        title: 'Review Monthly Budget',
        frequency: 'monthly',
        day: 1,
        description: 'Check spending vs budget for all categories',
      },
      {
        title: 'Portfolio Rebalancing',
        frequency: 'quarterly',
        description: 'Review and rebalance investment allocation',
      },
      {
        title: 'Goal Progress Check',
        frequency: 'monthly',
        day: 15,
        description: 'Track progress towards financial goals',
      },
      {
        title: 'Tax Planning Review',
        frequency: 'annually',
        month: 1,
        description: 'Review tax-saving investments (80C, 80D)',
      },
    ];

    const reasoning = [
      `Created ${reminders.length} recurring reminders`,
      'Monthly: Budget review, Goal check',
      'Quarterly: Portfolio rebalancing',
      'Annual: Tax planning',
    ];

    return this.createSuccessResponse(
      { reminders },
      reasoning,
      [],
      0.9,
      ['Enable notifications', 'Sync with calendar'],
    );
  }

  private extractPlanningActions(result: any): Action[] {
    return [
      {
        id: 'action-planning-1',
        type: 'goal',
        title: 'Start Monthly Savings Plan',
        description: `Save ₹${result.monthlySavingsRequired?.toLocaleString()}/month`,
        priority: 'high',
        completed: false,
        parameters: { amount: result.monthlySavingsRequired },
        estimatedImpact: 'Achieve goal on time',
      },
    ];
  }

  private extractRiskActions(result: any): Action[] {
    const actions: Action[] = [];
    result.mitigations?.forEach((mitigation: any, index: number) => {
      actions.push({
        id: `action-risk-${index}`,
        type: 'alert',
        title: mitigation.risk,
        description: mitigation.recommendation,
        priority: mitigation.severity === 'critical' || mitigation.severity === 'high' ? 'high' : 'medium',
        completed: false,
        parameters: { severity: mitigation.severity },
        estimatedImpact: mitigation.estimatedImpact,
      });
    });
    return actions;
  }

  private extractInvestmentActions(result: any): Action[] {
    return [
      {
        id: 'action-investment-1',
        type: 'sip',
        title: 'Setup Investment SIPs',
        description: `Configure ${result.products?.length || 0} SIP investments`,
        priority: 'high',
        completed: false,
        parameters: { products: result.products },
        estimatedImpact: 'Automated investing',
      },
    ];
  }

  private getNextMonthFirstDay(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }
}
