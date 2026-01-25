import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../core/database/postgres/prisma.service';

/**
 * Function Executor Service
 * 
 * Executes registered functions called by LLM:
 * - Routes function calls to appropriate handlers
 * - Handles errors and timeouts
 * - Logs execution for debugging
 */
@Injectable()
export class FunctionExecutorService {
  private readonly logger = new Logger(FunctionExecutorService.name);
  private readonly functionTimeout = 30000; // 30 seconds

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Execute a function call from LLM
   */
  async executeFunction(
    functionName: string,
    args: any,
    userId: string,
  ): Promise<any> {
    const startTime = Date.now();

    try {
      this.logger.debug(
        `Executing function: ${functionName} with args: ${JSON.stringify(args)}`,
      );

      // Execute with timeout
      const result = await this.executeWithTimeout(
        this.routeFunction(functionName, args, userId),
        this.functionTimeout,
      );

      const latency = Date.now() - startTime;
      this.logger.debug(
        `Function ${functionName} executed in ${latency}ms`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Function ${functionName} failed:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Route function to appropriate handler
   */
  private async routeFunction(
    functionName: string,
    args: any,
    userId: string,
  ): Promise<any> {
    switch (functionName) {
      case 'query_financial_graph':
        return this.queryFinancialGraph(args, userId);
      
      case 'calculate_emi':
        return this.calculateEMI(args);
      
      case 'run_monte_carlo_simulation':
        return this.runMonteCarloSimulation(args);
      
      case 'calculate_compound_interest':
        return this.calculateCompoundInterest(args);
      
      case 'calculate_tax':
        return this.calculateTax(args);
      
      case 'analyze_spending_pattern':
        return this.analyzeSpendingPattern(args, userId);
      
      case 'check_goal_progress':
        return this.checkGoalProgress(args, userId);
      
      case 'calculate_sip_returns':
        return this.calculateSIPReturns(args);
      
      case 'assess_loan_affordability':
        return this.assessLoanAffordability(args);
      
      case 'optimize_portfolio':
        return this.optimizePortfolio(args);
      
      default:
        throw new BadRequestException(`Unknown function: ${functionName}`);
    }
  }

  // ==========================================
  // Function Implementations
  // ==========================================

  private async queryFinancialGraph(args: any, userId: string): Promise<any> {
    // TODO: Integrate with Neo4j service when available
    const { query_type, filters } = args;

    // Mock implementation
    return {
      query_type,
      data: `Mock data for ${query_type}`,
      message: 'Neo4j integration pending',
    };
  }

  private calculateEMI(args: any): any {
    const { principal, rate, tenure_months } = args;

    // EMI = [P x R x (1+R)^N] / [(1+R)^N-1]
    const monthlyRate = rate / (12 * 100);
    const emi =
      (principal * monthlyRate * Math.pow(1 + monthlyRate, tenure_months)) /
      (Math.pow(1 + monthlyRate, tenure_months) - 1);

    const totalPayment = emi * tenure_months;
    const totalInterest = totalPayment - principal;

    return {
      emi: Math.round(emi),
      total_payment: Math.round(totalPayment),
      total_interest: Math.round(totalInterest),
      principal,
      rate,
      tenure_months,
    };
  }

  private async runMonteCarloSimulation(args: any): Promise<any> {
    const {
      scenario,
      initial_amount,
      monthly_contribution = 0,
      expected_return = 12,
      years,
      iterations = 1000,
    } = args;

    // Simplified Monte Carlo simulation
    const results: number[] = [];
    const monthlyReturn = expected_return / (12 * 100);
    const totalMonths = years * 12;

    for (let i = 0; i < iterations; i++) {
      let balance = initial_amount;

      for (let month = 0; month < totalMonths; month++) {
        // Add random volatility (±20% of expected return)
        const volatility = (Math.random() - 0.5) * 0.4;
        const actualReturn = monthlyReturn * (1 + volatility);

        balance = balance * (1 + actualReturn) + monthly_contribution;
      }

      results.push(balance);
    }

    // Calculate statistics
    results.sort((a, b) => a - b);

    return {
      scenario,
      iterations,
      statistics: {
        p10: Math.round(results[Math.floor(iterations * 0.1)]),
        p50_median: Math.round(results[Math.floor(iterations * 0.5)]),
        p90: Math.round(results[Math.floor(iterations * 0.9)]),
        mean: Math.round(results.reduce((a, b) => a + b) / iterations),
        min: Math.round(results[0]),
        max: Math.round(results[iterations - 1]),
      },
      inputs: {
        initial_amount,
        monthly_contribution,
        expected_return,
        years,
      },
    };
  }

  private calculateCompoundInterest(args: any): any {
    const {
      principal,
      rate,
      time_years,
      compounding_frequency = 'annually',
    } = args;

    const frequencies: Record<string, number> = {
      annually: 1,
      'semi-annually': 2,
      quarterly: 4,
      monthly: 12,
      daily: 365,
    };

    const n = frequencies[compounding_frequency];
    const r = rate / 100;

    // A = P(1 + r/n)^(nt)
    const amount = principal * Math.pow(1 + r / n, n * time_years);
    const interest = amount - principal;

    return {
      principal,
      rate,
      time_years,
      compounding_frequency,
      final_amount: Math.round(amount),
      interest_earned: Math.round(interest),
    };
  }

  private calculateTax(args: any): any {
    const { annual_income, regime, deductions = 0 } = args;

    let taxableIncome = annual_income;
    let tax = 0;

    if (regime === 'old') {
      // Apply deductions
      taxableIncome = Math.max(0, annual_income - deductions);

      // Old regime slabs (FY 2024-25)
      if (taxableIncome <= 250000) tax = 0;
      else if (taxableIncome <= 500000) tax = (taxableIncome - 250000) * 0.05;
      else if (taxableIncome <= 1000000)
        tax = 12500 + (taxableIncome - 500000) * 0.2;
      else tax = 112500 + (taxableIncome - 1000000) * 0.3;
    } else {
      // New regime slabs (FY 2024-25)
      if (taxableIncome <= 300000) tax = 0;
      else if (taxableIncome <= 600000) tax = (taxableIncome - 300000) * 0.05;
      else if (taxableIncome <= 900000)
        tax = 15000 + (taxableIncome - 600000) * 0.1;
      else if (taxableIncome <= 1200000)
        tax = 45000 + (taxableIncome - 900000) * 0.15;
      else if (taxableIncome <= 1500000)
        tax = 90000 + (taxableIncome - 1200000) * 0.2;
      else tax = 150000 + (taxableIncome - 1500000) * 0.3;
    }

    // Add cess (4%)
    const totalTax = tax * 1.04;

    return {
      annual_income,
      regime,
      deductions: regime === 'old' ? deductions : 0,
      taxable_income: Math.round(taxableIncome),
      tax_amount: Math.round(totalTax),
      effective_rate: ((totalTax / annual_income) * 100).toFixed(2) + '%',
    };
  }

  private async analyzeSpendingPattern(args: any, userId: string): Promise<any> {
    const { months = 3, category } = args;

    // Get transactions from database
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        createdAt: { gte: startDate },
        ...(category && { category }),
      },
      orderBy: { createdAt: 'desc' },
    });

    // Analyze spending
    const totalSpent = transactions
      .filter((t) => t.type === 'DEBIT')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const categoryBreakdown = transactions
      .filter((t) => t.type === 'DEBIT')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
        return acc;
      }, {} as Record<string, number>);

    return {
      period_months: months,
      total_spent: Math.round(totalSpent),
      average_monthly: Math.round(totalSpent / months),
      transaction_count: transactions.length,
      category_breakdown: categoryBreakdown,
    };
  }

  private async checkGoalProgress(args: any, userId: string): Promise<any> {
    const { goal_id } = args;

    const goal = await this.prisma.goal.findFirst({
      where: {
        id: goal_id,
        userId,
      },
      include: {
        contributions: true,
      },
    });

    if (!goal) {
      return { error: 'Goal not found' };
    }

    const totalContributed = goal.contributions.reduce(
      (sum, c) => sum + Number(c.amount),
      0,
    );

    const progressPercentage =
      (totalContributed / Number(goal.targetAmount)) * 100;

    return {
      goal_name: goal.name,
      target_amount: Number(goal.targetAmount),
      current_amount: Math.round(totalContributed),
      progress_percentage: Math.round(progressPercentage),
      remaining_amount: Math.round(Number(goal.targetAmount) - totalContributed),
      target_date: goal.targetDate,
      status: goal.status,
    };
  }

  private calculateSIPReturns(args: any): any {
    const { monthly_amount, expected_return, years } = args;

    const monthlyRate = expected_return / (12 * 100);
    const months = years * 12;

    // FV of SIP = P × [(1 + r)^n - 1] / r × (1 + r)
    const futureValue =
      monthly_amount *
      ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) *
      (1 + monthlyRate);

    const totalInvested = monthly_amount * months;
    const returns = futureValue - totalInvested;

    return {
      monthly_amount,
      expected_return,
      years,
      total_invested: Math.round(totalInvested),
      future_value: Math.round(futureValue),
      returns: Math.round(returns),
      return_percentage: ((returns / totalInvested) * 100).toFixed(2) + '%',
    };
  }

  private assessLoanAffordability(args: any): any {
    const {
      monthly_income,
      existing_emis = 0,
      loan_amount,
      rate,
      tenure_months,
    } = args;

    // Calculate proposed EMI
    const emiResult = this.calculateEMI({ principal: loan_amount, rate, tenure_months });
    const proposedEMI = emiResult.emi;

    // Calculate FOIR (Fixed Obligation to Income Ratio)
    const totalEMI = existing_emis + proposedEMI;
    const foir = (totalEMI / monthly_income) * 100;

    // Typically, FOIR should be < 50%
    const isAffordable = foir <= 50;

    return {
      loan_amount,
      proposed_emi: proposedEMI,
      existing_emis,
      total_monthly_emi: totalEMI,
      monthly_income,
      foir: foir.toFixed(2) + '%',
      is_affordable: isAffordable,
      recommendation: isAffordable
        ? 'Loan appears affordable based on standard FOIR guidelines'
        : 'Loan may strain finances. Consider reducing loan amount or extending tenure',
      disposable_income: Math.round(monthly_income - totalEMI),
    };
  }

  private optimizePortfolio(args: any): any {
    const { risk_profile, investment_amount, goal_horizon_years = 10 } = args;

    // Asset allocation based on risk profile
    const allocations: Record<string, any> = {
      conservative: {
        equity: 20,
        debt: 60,
        gold: 10,
        liquid: 10,
      },
      moderate: {
        equity: 50,
        debt: 35,
        gold: 10,
        liquid: 5,
      },
      aggressive: {
        equity: 75,
        debt: 15,
        gold: 5,
        liquid: 5,
      },
    };

    const allocation = allocations[risk_profile];

    const portfolio = Object.entries(allocation).map(([asset, percentage]) => ({
      asset_class: asset,
      allocation_percentage: percentage,
      amount: Math.round((investment_amount * (percentage as number)) / 100),
    }));

    return {
      risk_profile,
      investment_amount,
      goal_horizon_years,
      recommended_allocation: portfolio,
      rebalancing_frequency: risk_profile === 'aggressive' ? 'quarterly' : 'annually',
    };
  }

  // ==========================================
  // Helper Methods
  // ==========================================

  private executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Function execution timeout (${timeoutMs}ms)`)),
          timeoutMs,
        ),
      ),
    ]);
  }
}
