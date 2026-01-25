import { Injectable, Logger } from '@nestjs/common';
import { BaseAgent } from './base.agent';
import { AgentMessage, AgentResponse, AgentType } from '../types/agent.types';
import { ToolRegistry } from '../services/tool-registry.service';
import { DecisionTraceService } from '../services/decision-trace.service';

/**
 * Asset Allocation Interface
 * Percentage breakdown of investment types
 */
interface AssetAllocation {
  equity: number; // Stocks, mutual funds
  debt: number; // Bonds, FDs, debt funds
  gold: number; // Gold, gold ETFs
  cash: number; // Liquid funds, savings
  alternates?: number; // REITs, crypto (if applicable)
}

/**
 * Investment Product Interface
 * Specific product recommendation
 */
interface InvestmentProduct {
  name: string;
  type: 'equity_mutual_fund' | 'debt_mutual_fund' | 'etf' | 'fd' | 'ppf' | 'nps' | 'ulip' | 'bond';
  monthlyAmount: number;
  expectedReturn: number; // Annual %
  riskLevel: 'low' | 'medium' | 'high';
  taxBenefit?: string; // e.g., "80C deduction"
  lockInPeriod?: number; // Years
  liquidity: 'high' | 'medium' | 'low';
  rationale: string;
}

/**
 * Return Projection Interface
 * Expected returns over time
 */
interface ReturnProjection {
  annualizedReturn: number;
  finalValue: number;
  totalInvested: number;
  totalGains: number;
  yearWiseProjection: Array<{
    year: number;
    invested: number;
    value: number;
    gains: number;
  }>;
}

/**
 * InvestmentAdvisorAgent
 * Specialized agent for recommending specific investment products and asset allocation.
 *
 * Capabilities:
 * - Asset allocation based on risk profile and timeline
 * - Product recommendations (mutual funds, ETFs, FDs, etc.)
 * - Tax optimization (80C, 80D deductions)
 * - Rebalancing suggestions
 * - Return projections
 *
 * Example Use Case:
 * User with 5-year goal, moderate risk profile, ₹50,000/month to invest
 * Agent:
 * 1. Consults RiskAssessmentAgent for risk profile
 * 2. Determines asset allocation: 60% equity, 30% debt, 10% gold
 * 3. Recommends specific products:
 *    - ₹30,000/month in equity mutual funds
 *    - ₹15,000/month in debt mutual funds
 *    - ₹5,000/month in gold ETF
 * 4. Projects returns: 12% annualized, ₹41L final value
 * 5. Highlights tax benefits (80C deductions)
 *
 * Asset Allocation Strategy:
 * - Conservative: 20% equity, 60% debt, 20% gold/cash
 * - Moderate: 50% equity, 35% debt, 15% gold/cash
 * - Aggressive: 70% equity, 20% debt, 10% gold/cash
 *
 * Timeline adjustments:
 * - <3 years: Reduce equity by 20%
 * - 3-7 years: Balanced approach
 * - >7 years: Can increase equity by 10%
 *
 * @Injectable
 */
@Injectable()
export class InvestmentAdvisorAgent extends BaseAgent {
  protected readonly logger = new Logger(InvestmentAdvisorAgent.name);

  // Asset allocation templates
  private readonly ALLOCATIONS = {
    conservative: { equity: 20, debt: 60, gold: 15, cash: 5 },
    moderate: { equity: 50, debt: 35, gold: 10, cash: 5 },
    aggressive: { equity: 70, debt: 20, gold: 5, cash: 5 },
  };

  // Expected returns by asset class (annual %)
  private readonly EXPECTED_RETURNS = {
    equity: 0.14, // 14%
    debt: 0.08, // 8%
    gold: 0.06, // 6%
    cash: 0.04, // 4%
  };

  constructor(
    toolRegistry: ToolRegistry,
    decisionTraceService: DecisionTraceService,
  ) {
    super(AgentType.INVESTMENT_ADVISOR, toolRegistry, decisionTraceService);
  }

  /**
   * Execute investment advisory task
   *
   * Expected message.payload structure:
   * {
   *   task: 'recommend_allocation' | 'suggest_products' | 'project_returns' | 'rebalance_portfolio',
   *   context: {
   *     riskProfile: 'conservative' | 'moderate' | 'aggressive',
   *     goalTimeline: number, // years
   *     monthlyAmount: number,
   *     userId: string,
   *     currentPortfolio?: AssetAllocation,
   *     traceId?: string
   *   }
   * }
   */
  async execute(message: AgentMessage): Promise<AgentResponse> {
    const { task, context } = message.payload;
    const traceId = context.traceId;

    this.logger.log(`Executing InvestmentAdvisorAgent: ${task}`);

    try {
      await this.recordReasoning(
        `Starting investment advisory task: ${task}`,
        traceId,
      );

      // Validate required context
      this.validateContext(context, task);

      // Route to appropriate handler
      let result;
      switch (task) {
        case 'recommend_allocation':
          result = await this.recommendAllocation(context, traceId);
          break;
        case 'suggest_products':
          result = await this.suggestProducts(context, traceId);
          break;
        case 'project_returns':
          result = await this.projectReturns(context, traceId);
          break;
        case 'rebalance_portfolio':
          result = await this.rebalancePortfolio(context, traceId);
          break;
        default:
          throw new Error(`Unknown task: ${task}`);
      }

      return result;
    } catch (error) {
      this.logger.error(
        `InvestmentAdvisorAgent execution failed: ${error.message}`,
        error.stack,
      );
      return this.handleError(error, context);
    }
  }

  /**
   * Recommend asset allocation based on risk profile and timeline
   */
  private async recommendAllocation(
    context: any,
    traceId?: string,
  ): Promise<AgentResponse> {
    const riskProfile = context.riskProfile || 'moderate';
    const goalTimeline = context.goalTimeline || 5;
    const reasoning: string[] = [];
    const toolsUsed: string[] = [];

    // Step 1: Get risk assessment if available
    let actualRiskLevel = riskProfile;
    if (context.risk_assessment_result) {
      actualRiskLevel = context.risk_assessment_result.riskLevel;
      reasoning.push(
        `Using risk level from RiskAssessmentAgent: ${actualRiskLevel}`,
      );
    } else {
      reasoning.push(`Using provided risk profile: ${riskProfile}`);
    }

    await this.recordReasoning(
      `Determining allocation for ${actualRiskLevel} risk profile, ${goalTimeline}-year timeline`,
      traceId,
    );

    // Step 2: Get base allocation
    const baseAllocation = this.getBaseAllocation(actualRiskLevel);
    reasoning.push(
      `Base allocation: ${baseAllocation.equity}% equity, ${baseAllocation.debt}% debt, ${baseAllocation.gold}% gold`,
    );

    // Step 3: Adjust for timeline
    const adjustedAllocation = this.adjustForTimeline(
      baseAllocation,
      goalTimeline,
    );
    reasoning.push(
      `Adjusted for ${goalTimeline}-year timeline: ${adjustedAllocation.equity}% equity, ${adjustedAllocation.debt}% debt`,
    );

    await this.recordReasoning(
      `Final allocation: ${JSON.stringify(adjustedAllocation)}`,
      traceId,
    );

    // Step 4: Calculate expected returns
    const expectedReturn = this.calculateExpectedReturn(adjustedAllocation);
    reasoning.push(
      `Expected annualized return: ${(expectedReturn * 100).toFixed(1)}%`,
    );

    return this.createSuccessResponse(
      {
        allocation: adjustedAllocation,
        expectedReturn,
        riskProfile: actualRiskLevel,
        timeline: goalTimeline,
      },
      reasoning,
      toolsUsed,
      0.88,
      [
        'Suggest specific investment products',
        'Project returns over timeline',
        'Set up automated SIP',
      ],
    );
  }

  /**
   * Suggest specific investment products
   */
  private async suggestProducts(
    context: any,
    traceId?: string,
  ): Promise<AgentResponse> {
    const monthlyAmount = context.monthlyAmount;
    const allocation: AssetAllocation =
      context.allocation ||
      (await this.recommendAllocation(context, traceId)).result.allocation;

    const reasoning: string[] = [];
    const products: InvestmentProduct[] = [];

    reasoning.push(
      `Allocating ₹${monthlyAmount.toLocaleString()} across asset classes`,
    );

    await this.recordReasoning('Selecting investment products', traceId);

    // Equity products
    const equityAmount = (monthlyAmount * allocation.equity) / 100;
    if (equityAmount > 0) {
      products.push({
        name: 'Large Cap Equity Mutual Fund',
        type: 'equity_mutual_fund',
        monthlyAmount: equityAmount * 0.6,
        expectedReturn: 0.14,
        riskLevel: 'medium',
        taxBenefit: '80C deduction (ELSS)',
        lockInPeriod: 3,
        liquidity: 'high',
        rationale:
          'Diversified large-cap exposure with professional management',
      });

      products.push({
        name: 'Nifty 50 Index ETF',
        type: 'etf',
        monthlyAmount: equityAmount * 0.4,
        expectedReturn: 0.13,
        riskLevel: 'medium',
        liquidity: 'high',
        rationale: 'Low-cost passive exposure to top 50 companies',
      });

      reasoning.push(
        `Equity allocation (₹${equityAmount.toLocaleString()}): 60% large-cap MF, 40% index ETF`,
      );
    }

    // Debt products
    const debtAmount = (monthlyAmount * allocation.debt) / 100;
    if (debtAmount > 0) {
      products.push({
        name: 'Debt Mutual Fund (Short-term)',
        type: 'debt_mutual_fund',
        monthlyAmount: debtAmount * 0.5,
        expectedReturn: 0.08,
        riskLevel: 'low',
        liquidity: 'high',
        rationale: 'Better than FD with tax efficiency after 3 years',
      });

      products.push({
        name: 'Public Provident Fund (PPF)',
        type: 'ppf',
        monthlyAmount: Math.min(debtAmount * 0.5, 12500), // Max ₹1.5L/year
        expectedReturn: 0.071,
        riskLevel: 'low',
        taxBenefit: '80C deduction + tax-free returns',
        lockInPeriod: 15,
        liquidity: 'low',
        rationale: 'Triple tax benefit with government backing',
      });

      reasoning.push(
        `Debt allocation (₹${debtAmount.toLocaleString()}): 50% debt MF, 50% PPF (with 80C benefit)`,
      );
    }

    // Gold products
    const goldAmount = (monthlyAmount * allocation.gold) / 100;
    if (goldAmount > 0) {
      products.push({
        name: 'Gold ETF',
        type: 'etf',
        monthlyAmount: goldAmount,
        expectedReturn: 0.06,
        riskLevel: 'low',
        liquidity: 'high',
        rationale: 'Hedge against inflation and currency risk',
      });

      reasoning.push(
        `Gold allocation (₹${goldAmount.toLocaleString()}): Gold ETF for liquidity`,
      );
    }

    await this.recordReasoning(
      `Recommended ${products.length} investment products`,
      traceId,
    );

    // Calculate tax savings
    const taxSavings = this.calculateTaxSavings(products);
    reasoning.push(
      `Estimated annual tax savings: ₹${taxSavings.toLocaleString()} (assuming 30% tax bracket)`,
    );

    return this.createSuccessResponse(
      {
        products,
        totalMonthly: monthlyAmount,
        taxSavings,
        allocation,
      },
      reasoning,
      [],
      0.85,
      [
        'Project returns over investment timeline',
        'Set up automated monthly SIPs',
        'Review annually for rebalancing',
      ],
    );
  }

  /**
   * Project investment returns over timeline
   */
  private async projectReturns(
    context: any,
    traceId?: string,
  ): Promise<AgentResponse> {
    const monthlyAmount = context.monthlyAmount;
    const timeline = context.goalTimeline || 5;
    const allocation: AssetAllocation =
      context.allocation ||
      (await this.recommendAllocation(context, traceId)).result.allocation;

    const reasoning: string[] = [];
    const toolsUsed: string[] = [];

    await this.recordReasoning(
      `Projecting returns for ${timeline} years with ₹${monthlyAmount}/month`,
      traceId,
    );

    // Calculate weighted return
    const expectedReturn = this.calculateExpectedReturn(allocation);

    // Call calculate_returns tool
    const projection = await this.callTool(
      'calculate_returns',
      {
        monthlyInvestment: monthlyAmount,
        years: timeline,
        annualReturn: expectedReturn,
        allocation,
      },
      traceId,
    );

    toolsUsed.push('calculate_returns');

    reasoning.push(
      `Expected annualized return: ${(expectedReturn * 100).toFixed(1)}%`,
    );
    reasoning.push(
      `Total investment: ₹${projection.totalInvested.toLocaleString()}`,
    );
    reasoning.push(
      `Projected final value: ₹${projection.finalValue.toLocaleString()}`,
    );
    reasoning.push(
      `Expected gains: ₹${projection.totalGains.toLocaleString()} (${((projection.totalGains / projection.totalInvested) * 100).toFixed(1)}% total return)`,
    );

    await this.recordReasoning(
      `Projected final corpus: ₹${projection.finalValue.toLocaleString()}`,
      traceId,
    );

    return this.createSuccessResponse(
      projection,
      reasoning,
      toolsUsed,
      0.82,
      [
        'Run simulation for downside scenarios',
        'Review allocation if target not met',
      ],
    );
  }

  /**
   * Rebalance existing portfolio to target allocation
   */
  private async rebalancePortfolio(
    context: any,
    traceId?: string,
  ): Promise<AgentResponse> {
    const currentPortfolio: AssetAllocation = context.currentPortfolio;
    const targetAllocation: AssetAllocation =
      context.targetAllocation ||
      (await this.recommendAllocation(context, traceId)).result.allocation;

    const reasoning: string[] = [];

    reasoning.push('Current portfolio:');
    reasoning.push(
      `  Equity: ${currentPortfolio.equity}%, Debt: ${currentPortfolio.debt}%, Gold: ${currentPortfolio.gold}%`,
    );
    reasoning.push('Target allocation:');
    reasoning.push(
      `  Equity: ${targetAllocation.equity}%, Debt: ${targetAllocation.debt}%, Gold: ${targetAllocation.gold}%`,
    );

    await this.recordReasoning('Calculating rebalancing actions', traceId);

    // Calculate rebalancing actions
    const actions = [];

    if (currentPortfolio.equity > targetAllocation.equity) {
      const diff = currentPortfolio.equity - targetAllocation.equity;
      actions.push({
        action: 'sell',
        asset: 'equity',
        percentage: diff,
        rationale: 'Reduce equity exposure to target level',
      });
    } else if (currentPortfolio.equity < targetAllocation.equity) {
      const diff = targetAllocation.equity - currentPortfolio.equity;
      actions.push({
        action: 'buy',
        asset: 'equity',
        percentage: diff,
        rationale: 'Increase equity to target allocation',
      });
    }

    if (currentPortfolio.debt > targetAllocation.debt) {
      const diff = currentPortfolio.debt - targetAllocation.debt;
      actions.push({
        action: 'sell',
        asset: 'debt',
        percentage: diff,
        rationale: 'Reduce debt exposure',
      });
    } else if (currentPortfolio.debt < targetAllocation.debt) {
      const diff = targetAllocation.debt - currentPortfolio.debt;
      actions.push({
        action: 'buy',
        asset: 'debt',
        percentage: diff,
        rationale: 'Increase debt for stability',
      });
    }

    reasoning.push(`Rebalancing requires ${actions.length} actions`);
    actions.forEach((action) => {
      reasoning.push(
        `${action.action.toUpperCase()} ${action.percentage.toFixed(1)}% ${action.asset}: ${action.rationale}`,
      );
    });

    await this.recordReasoning(
      `Generated ${actions.length} rebalancing actions`,
      traceId,
    );

    return this.createSuccessResponse(
      {
        currentPortfolio,
        targetAllocation,
        actions,
        driftPercentage: this.calculateDrift(
          currentPortfolio,
          targetAllocation,
        ),
      },
      reasoning,
      [],
      0.9,
      ['Execute rebalancing trades', 'Set quarterly rebalancing reminder'],
    );
  }

  /**
   * Get base allocation for risk profile
   */
  private getBaseAllocation(
    riskProfile: string,
  ): AssetAllocation {
    const profile = riskProfile.toLowerCase();

    if (profile === 'conservative' || profile === 'low') {
      return { ...this.ALLOCATIONS.conservative };
    } else if (profile === 'aggressive' || profile === 'high') {
      return { ...this.ALLOCATIONS.aggressive };
    } else {
      return { ...this.ALLOCATIONS.moderate };
    }
  }

  /**
   * Adjust allocation based on timeline
   */
  private adjustForTimeline(
    allocation: AssetAllocation,
    timeline: number,
  ): AssetAllocation {
    const adjusted = { ...allocation };

    if (timeline < 3) {
      // Short-term: reduce equity risk
      const reduction = 20;
      adjusted.equity = Math.max(0, adjusted.equity - reduction);
      adjusted.debt += reduction * 0.7;
      adjusted.cash = (adjusted.cash || 0) + reduction * 0.3;
    } else if (timeline > 7) {
      // Long-term: can increase equity
      const increase = 10;
      adjusted.equity = Math.min(80, adjusted.equity + increase);
      adjusted.debt = Math.max(10, adjusted.debt - increase);
    }

    return adjusted;
  }

  /**
   * Calculate expected return based on allocation
   */
  private calculateExpectedReturn(allocation: AssetAllocation): number {
    return (
      (allocation.equity / 100) * this.EXPECTED_RETURNS.equity +
      (allocation.debt / 100) * this.EXPECTED_RETURNS.debt +
      (allocation.gold / 100) * this.EXPECTED_RETURNS.gold +
      ((allocation.cash || 0) / 100) * this.EXPECTED_RETURNS.cash
    );
  }

  /**
   * Calculate annual tax savings from products
   */
  private calculateTaxSavings(products: InvestmentProduct[]): number {
    const taxRate = 0.3; // Assume 30% bracket

    const annualDeductions = products
      .filter((p) => p.taxBenefit?.includes('80C'))
      .reduce((sum, p) => sum + p.monthlyAmount * 12, 0);

    return Math.min(annualDeductions, 150000) * taxRate; // 80C limit is ₹1.5L
  }

  /**
   * Calculate drift between current and target allocation
   */
  private calculateDrift(
    current: AssetAllocation,
    target: AssetAllocation,
  ): number {
    const equityDrift = Math.abs(current.equity - target.equity);
    const debtDrift = Math.abs(current.debt - target.debt);
    const goldDrift = Math.abs(current.gold - target.gold);

    return (equityDrift + debtDrift + goldDrift) / 3;
  }

  /**
   * Validate context based on task
   */
  private validateContext(context: any, task: string): void {
    if (task === 'suggest_products' && !context.monthlyAmount) {
      throw new Error('Missing required context: monthlyAmount');
    }

    if (task === 'project_returns' && !context.monthlyAmount) {
      throw new Error('Missing required context: monthlyAmount');
    }

    if (task === 'rebalance_portfolio' && !context.currentPortfolio) {
      throw new Error('Missing required context: currentPortfolio');
    }
  }
}
