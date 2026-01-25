import { Injectable, Logger } from '@nestjs/common';
import { BaseAgent } from './base.agent';
import { AgentMessage, AgentResponse, AgentType } from '../types/agent.types';
import { ToolRegistry } from '../services/tool-registry.service';
import { DecisionTraceService } from '../services/decision-trace.service';

/**
 * Financial Goal Interface
 * Represents a user's financial goal
 */
interface FinancialGoal {
  name: string;
  targetAmount: number;
  deadline: number; // years
  currentSavings: number;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Subgoal Interface
 * Represents a decomposed subgoal
 */
interface Subgoal {
  name: string;
  targetAmount: number;
  deadline: number; // years
  description: string;
}

/**
 * Savings Plan Interface
 * Represents a complete savings plan
 */
interface SavingsPlan {
  monthlySavingsRequired: number;
  totalInvestmentNeeded: number;
  expectedReturns: number;
  projectedFinalAmount: number;
  timeline: Array<{
    year: number;
    targetAmount: number;
    milestone: string;
  }>;
  subgoals: Subgoal[];
}

/**
 * FinancialPlanningAgent
 * Specialized agent for creating long-term financial plans and goal-based strategies.
 *
 * Capabilities:
 * - Goal decomposition (break large goals into manageable subgoals)
 * - Timeline-based planning
 * - Resource allocation
 * - Constraint satisfaction (budget limits, risk tolerance)
 * - Feasibility analysis
 *
 * Example Use Case:
 * User: "Help me save ₹50L for house down payment in 5 years"
 * Agent:
 * 1. Decomposes into subgoals (emergency fund, initial investment, regular savings)
 * 2. Calculates monthly savings required: ₹83,333/month
 * 3. Checks feasibility: Is this <50% of monthly income?
 * 4. Creates timeline with yearly milestones
 * 5. Delegates to Risk Agent and Investment Agent for further refinement
 *
 * @Injectable
 */
@Injectable()
export class FinancialPlanningAgent extends BaseAgent {
  protected readonly logger = new Logger(FinancialPlanningAgent.name);

  // Configuration constants
  private readonly MAX_INCOME_ALLOCATION = 0.5; // Max 50% of income for savings
  private readonly DEFAULT_EXPECTED_RETURNS = 0.12; // 12% annual returns
  private readonly EMERGENCY_FUND_MONTHS = 6;

  constructor(
    toolRegistry: ToolRegistry,
    decisionTraceService: DecisionTraceService,
  ) {
    super(AgentType.FINANCIAL_PLANNING, toolRegistry, decisionTraceService);
  }

  /**
   * Execute financial planning task
   * Main entry point for the agent
   *
   * Expected message.payload structure:
   * {
   *   task: 'create_plan' | 'analyze_goal' | 'optimize_timeline',
   *   context: {
   *     goal: FinancialGoal,
   *     userId: string,
   *     monthlyIncome: number,
   *     currentExpenses: number
   *   }
   * }
   */
  async execute(message: AgentMessage): Promise<AgentResponse> {
    const { task, context } = message.payload;
    const traceId = context.traceId;

    this.logger.log(`Executing FinancialPlanningAgent: ${task}`);

    try {
      await this.recordReasoning(
        `Starting financial planning task: ${task}`,
        traceId,
      );

      // Validate required context
      this.validateContext(context);

      // Route to appropriate handler based on task
      let result;
      switch (task) {
        case 'create_plan':
          result = await this.createSavingsPlan(context, traceId);
          break;
        case 'analyze_goal':
          result = await this.analyzeGoalFeasibility(context, traceId);
          break;
        case 'optimize_timeline':
          result = await this.optimizeTimeline(context, traceId);
          break;
        default:
          throw new Error(`Unknown task: ${task}`);
      }

      return result;
    } catch (error) {
      this.logger.error(
        `FinancialPlanningAgent execution failed: ${error.message}`,
        error.stack,
      );
      return this.handleError(error, context);
    }
  }

  /**
   * Create a comprehensive savings plan for a financial goal
   *
   * Process:
   * 1. Decompose goal into subgoals
   * 2. Calculate monthly savings required
   * 3. Check feasibility against income
   * 4. Create timeline with milestones
   * 5. Determine next actions
   */
  private async createSavingsPlan(
    context: any,
    traceId?: string,
  ): Promise<AgentResponse> {
    const goal: FinancialGoal = context.goal;
    const monthlyIncome: number = context.monthlyIncome;

    const reasoning: string[] = [];
    const toolsUsed: string[] = [];

    // Step 1: Decompose goal into subgoals
    await this.recordReasoning(
      `Decomposing goal: ${goal.name} (₹${goal.targetAmount.toLocaleString()})`,
      traceId,
    );

    const subgoals = this.decomposeGoal(goal);
    reasoning.push(
      `Decomposed goal into ${subgoals.length} subgoals: ${subgoals.map((s) => s.name).join(', ')}`,
    );

    // Step 2: Calculate monthly savings required
    await this.recordReasoning('Calculating required savings rate', traceId);

    const savingsCalculation = await this.callTool(
      'calculate_savings_rate',
      {
        targetAmount: goal.targetAmount,
        currentSavings: goal.currentSavings,
        timelineYears: goal.deadline,
        expectedReturns: this.DEFAULT_EXPECTED_RETURNS,
      },
      traceId,
    );

    toolsUsed.push('calculate_savings_rate');

    const monthlySavingsRequired =
      savingsCalculation.monthlySavingsRequired;
    reasoning.push(
      `Calculated monthly savings required: ₹${monthlySavingsRequired.toLocaleString()}`,
    );

    // Step 3: Check feasibility
    const savingsRatio = monthlySavingsRequired / monthlyIncome;
    const isFeasible = savingsRatio <= this.MAX_INCOME_ALLOCATION;

    reasoning.push(
      `Savings rate: ${(savingsRatio * 100).toFixed(1)}% of income`,
    );
    reasoning.push(
      isFeasible
        ? `✓ Plan is feasible (within ${this.MAX_INCOME_ALLOCATION * 100}% limit)`
        : `✗ Plan exceeds ${this.MAX_INCOME_ALLOCATION * 100}% income allocation limit`,
    );

    await this.recordReasoning(
      `Feasibility check: ${isFeasible ? 'PASS' : 'FAIL'}`,
      traceId,
    );

    // Step 4: Create timeline with milestones
    const timeline = this.createTimeline(
      goal.targetAmount,
      goal.deadline,
      monthlySavingsRequired,
      this.DEFAULT_EXPECTED_RETURNS,
    );

    reasoning.push(`Created ${timeline.length}-year timeline with milestones`);

    // Step 5: Build savings plan
    const plan: SavingsPlan = {
      monthlySavingsRequired,
      totalInvestmentNeeded:
        goal.targetAmount - goal.currentSavings,
      expectedReturns: this.DEFAULT_EXPECTED_RETURNS,
      projectedFinalAmount: savingsCalculation.projectedAmount,
      timeline,
      subgoals,
    };

    // Step 6: Determine next actions
    const nextActions = this.determineNextActions(isFeasible, goal, context);

    const confidence = isFeasible ? 0.85 : 0.4;

    return this.createSuccessResponse(
      plan,
      reasoning,
      toolsUsed,
      confidence,
      nextActions,
    );
  }

  /**
   * Decompose a large goal into manageable subgoals
   */
  private decomposeGoal(goal: FinancialGoal): Subgoal[] {
    const subgoals: Subgoal[] = [];

    // Subgoal 1: Emergency fund (always first)
    const monthlyExpenseEstimate = goal.targetAmount * 0.02; // Rough estimate
    const emergencyFundAmount =
      monthlyExpenseEstimate * this.EMERGENCY_FUND_MONTHS;

    subgoals.push({
      name: 'Build Emergency Fund',
      targetAmount: emergencyFundAmount,
      deadline: 1, // First year
      description: `Save ${this.EMERGENCY_FUND_MONTHS} months of expenses for financial security`,
    });

    // Subgoal 2: Initial capital accumulation (20% of target)
    const initialCapital = goal.targetAmount * 0.2;
    subgoals.push({
      name: 'Initial Capital Accumulation',
      targetAmount: initialCapital,
      deadline: Math.ceil(goal.deadline * 0.3), // First 30% of timeline
      description: 'Build initial investment corpus for compounding',
    });

    // Subgoal 3: Main goal achievement
    subgoals.push({
      name: goal.name,
      targetAmount: goal.targetAmount,
      deadline: goal.deadline,
      description: 'Achieve primary financial goal',
    });

    return subgoals;
  }

  /**
   * Create a year-by-year timeline with milestones
   */
  private createTimeline(
    targetAmount: number,
    years: number,
    monthlySavings: number,
    annualReturns: number,
  ): Array<{ year: number; targetAmount: number; milestone: string }> {
    const timeline = [];

    for (let year = 1; year <= years; year++) {
      // Calculate expected corpus at end of this year
      const months = year * 12;
      const monthlyRate = annualReturns / 12;
      const futureValue =
        monthlySavings *
        ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);

      const percentComplete = (futureValue / targetAmount) * 100;

      let milestone = '';
      if (percentComplete >= 90) {
        milestone = 'Final push - goal in sight!';
      } else if (percentComplete >= 50) {
        milestone = 'Halfway there - maintain momentum';
      } else if (percentComplete >= 25) {
        milestone = 'Quarter complete - compounding taking effect';
      } else {
        milestone = 'Building foundation';
      }

      timeline.push({
        year,
        targetAmount: Math.round(futureValue),
        milestone,
      });
    }

    return timeline;
  }

  /**
   * Determine next actions based on feasibility
   */
  private determineNextActions(
    isFeasible: boolean,
    goal: FinancialGoal,
    context: any,
  ): string[] {
    if (isFeasible) {
      return [
        'Consult Investment Advisor Agent for asset allocation',
        'Run Simulation Agent to assess downside risk',
        'Create automated savings setup',
      ];
    } else {
      return [
        `Extend deadline from ${goal.deadline} to ${Math.ceil(goal.deadline * 1.5)} years`,
        'Explore additional income sources',
        'Reassess goal amount and prioritize essentials',
        'Consider partial goal achievement strategy',
      ];
    }
  }

  /**
   * Analyze goal feasibility without creating full plan
   */
  private async analyzeGoalFeasibility(
    context: any,
    traceId?: string,
  ): Promise<AgentResponse> {
    const goal: FinancialGoal = context.goal;
    const monthlyIncome: number = context.monthlyIncome;

    const reasoning: string[] = [];

    // Quick feasibility check
    const requiredMonthlyRate = goal.targetAmount / (goal.deadline * 12);
    const feasible = requiredMonthlyRate / monthlyIncome <= this.MAX_INCOME_ALLOCATION;

    reasoning.push(`Goal: ${goal.name}`);
    reasoning.push(`Target: ₹${goal.targetAmount.toLocaleString()}`);
    reasoning.push(`Timeline: ${goal.deadline} years`);
    reasoning.push(
      `Simple monthly requirement: ₹${requiredMonthlyRate.toLocaleString()}`,
    );
    reasoning.push(`Feasible: ${feasible ? 'Yes' : 'No'}`);

    return this.createSuccessResponse(
      {
        feasible,
        requiredMonthlyRate,
        recommendedTimeline: feasible ? goal.deadline : Math.ceil(goal.deadline * 1.5),
      },
      reasoning,
      [],
      feasible ? 0.9 : 0.5,
    );
  }

  /**
   * Optimize timeline for better feasibility
   */
  private async optimizeTimeline(
    context: any,
    traceId?: string,
  ): Promise<AgentResponse> {
    const goal: FinancialGoal = context.goal;
    const monthlyIncome: number = context.monthlyIncome;
    const maxMonthlyAllocation = monthlyIncome * this.MAX_INCOME_ALLOCATION;

    const reasoning: string[] = [];

    // Binary search for optimal timeline
    let minYears = 1;
    let maxYears = 30;
    let optimalYears = goal.deadline;

    while (minYears <= maxYears) {
      const testYears = Math.floor((minYears + maxYears) / 2);

      const calculation = await this.callTool('calculate_savings_rate', {
        targetAmount: goal.targetAmount,
        currentSavings: goal.currentSavings,
        timelineYears: testYears,
        expectedReturns: this.DEFAULT_EXPECTED_RETURNS,
      });

      if (calculation.monthlySavingsRequired <= maxMonthlyAllocation) {
        optimalYears = testYears;
        maxYears = testYears - 1;
      } else {
        minYears = testYears + 1;
      }
    }

    reasoning.push(`Original timeline: ${goal.deadline} years`);
    reasoning.push(`Optimized timeline: ${optimalYears} years`);
    reasoning.push(
      `Optimization saved: ${goal.deadline - optimalYears} years (if positive) or added ${optimalYears - goal.deadline} years for feasibility`,
    );

    return this.createSuccessResponse(
      {
        originalTimeline: goal.deadline,
        optimizedTimeline: optimalYears,
        timelineDifference: optimalYears - goal.deadline,
      },
      reasoning,
      ['calculate_savings_rate'],
      0.88,
    );
  }

  /**
   * Validate that required context is present
   */
  private validateContext(context: any): void {
    if (!context.goal) {
      throw new Error('Missing required context: goal');
    }

    if (!context.monthlyIncome) {
      throw new Error('Missing required context: monthlyIncome');
    }

    const goal = context.goal;
    if (!goal.targetAmount || !goal.deadline) {
      throw new Error(
        'Invalid goal: must have targetAmount and deadline',
      );
    }
  }
}
