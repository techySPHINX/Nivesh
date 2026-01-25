import { Injectable, Logger } from '@nestjs/common';
import { BaseAgent } from './base.agent';
import { AgentMessage, AgentResponse, AgentType } from '../types/agent.types';
import { ToolRegistry } from '../services/tool-registry.service';
import { DecisionTraceService } from '../services/decision-trace.service';

/**
 * Simulation Scenario Interface
 * Defines a what-if scenario to simulate
 */
interface SimulationScenario {
  name: string;
  monthlyInvestment: number;
  years: number;
  expectedReturn: number;
  volatility: number; // Standard deviation
  inflationRate?: number;
}

/**
 * Simulation Result Interface
 * Results from Monte Carlo simulation
 */
interface SimulationResult {
  scenarios: number; // Number of scenarios run
  medianOutcome: number;
  bestCase: number; // 90th percentile
  worstCase: number; // 10th percentile
  probabilityOfSuccess: number; // % chance of meeting goal
  confidenceInterval: {
    lower: number; // 25th percentile
    upper: number; // 75th percentile
  };
  distribution: Array<{
    percentile: number;
    value: number;
  }>;
}

/**
 * Affordability Check Interface
 * Results of loan affordability simulation
 */
interface AffordabilityResult {
  loanAmount: number;
  emi: number;
  affordable: boolean;
  maxAffordableLoan: number;
  riskLevel: 'low' | 'medium' | 'high';
  stressTestResults: {
    incomeReduction20Percent: boolean;
    interestRateIncrease2Percent: boolean;
    jobLoss3Months: boolean;
  };
}

/**
 * SimulationAgent
 * Specialized agent for running Monte Carlo simulations and what-if scenarios.
 *
 * Capabilities:
 * - Monte Carlo simulations for investment outcomes
 * - Loan affordability analysis with stress testing
 * - Goal achievement probability calculation
 * - Retirement corpus projections
 * - Market volatility impact analysis
 * - Downside risk assessment
 *
 * Example Use Case:
 * User wants to know if saving ₹50K/month for 5 years will achieve ₹40L goal
 * Agent:
 * 1. Runs 10,000 Monte Carlo iterations
 * 2. Models returns with volatility (mean 12%, std dev 8%)
 * 3. Calculates probability: 78% chance of success
 * 4. Shows worst case (₹32L), median (₹39L), best case (₹48L)
 * 5. Recommends increasing savings to ₹55K for 90% success rate
 *
 * Simulation Types:
 * - Investment outcome simulation (Monte Carlo)
 * - Loan affordability simulation (stress testing)
 * - Goal achievement probability
 * - Retirement readiness assessment
 *
 * @Injectable
 */
@Injectable()
export class SimulationAgent extends BaseAgent {
  protected readonly logger = new Logger(SimulationAgent.name);

  // Simulation constants
  private readonly DEFAULT_ITERATIONS = 10000;
  private readonly DEFAULT_VOLATILITY = 0.08; // 8% std dev
  private readonly DEFAULT_INFLATION = 0.06; // 6%

  // Affordability thresholds
  private readonly MAX_EMI_TO_INCOME_RATIO = 0.4; // 40%
  private readonly SAFE_EMI_TO_INCOME_RATIO = 0.3; // 30%

  constructor(
    toolRegistry: ToolRegistry,
    decisionTraceService: DecisionTraceService,
  ) {
    super(AgentType.SIMULATION, toolRegistry, decisionTraceService);
  }

  /**
   * Execute simulation task
   *
   * Expected message.payload structure:
   * {
   *   task: 'run_monte_carlo' | 'check_affordability' | 'assess_goal_probability' | 'retirement_simulation',
   *   context: {
   *     scenario: SimulationScenario,
   *     targetAmount?: number,
   *     loanAmount?: number,
   *     userId?: string,
   *     traceId?: string
   *   }
   * }
   */
  async execute(message: AgentMessage): Promise<AgentResponse> {
    const { task, context } = message.payload;
    const traceId = context.traceId;

    this.logger.log(`Executing SimulationAgent: ${task}`);

    try {
      await this.recordReasoning(
        `Starting simulation task: ${task}`,
        traceId,
      );

      // Route to appropriate handler
      let result;
      switch (task) {
        case 'run_monte_carlo':
          result = await this.runMonteCarloSimulation(context, traceId);
          break;
        case 'check_affordability':
          result = await this.checkLoanAffordability(context, traceId);
          break;
        case 'assess_goal_probability':
          result = await this.assessGoalProbability(context, traceId);
          break;
        case 'retirement_simulation':
          result = await this.runRetirementSimulation(context, traceId);
          break;
        default:
          throw new Error(`Unknown task: ${task}`);
      }

      return result;
    } catch (error) {
      this.logger.error(
        `SimulationAgent execution failed: ${error.message}`,
        error.stack,
      );
      return this.handleError(error, context);
    }
  }

  /**
   * Run Monte Carlo simulation for investment outcomes
   */
  private async runMonteCarloSimulation(
    context: any,
    traceId?: string,
  ): Promise<AgentResponse> {
    const scenario: SimulationScenario = context.scenario;
    const iterations = context.iterations || this.DEFAULT_ITERATIONS;

    const reasoning: string[] = [];
    const toolsUsed: string[] = [];

    reasoning.push(
      `Running Monte Carlo simulation with ${iterations.toLocaleString()} iterations`,
    );
    reasoning.push(
      `Investment: ₹${scenario.monthlyInvestment.toLocaleString()}/month for ${scenario.years} years`,
    );
    reasoning.push(
      `Expected return: ${(scenario.expectedReturn * 100).toFixed(1)}% ± ${(scenario.volatility * 100).toFixed(1)}%`,
    );

    await this.recordReasoning(
      `Starting ${iterations} Monte Carlo iterations`,
      traceId,
    );

    // Call simulation tool
    const simulationResults = await this.callTool(
      'run_monte_carlo_simulation',
      {
        monthlyInvestment: scenario.monthlyInvestment,
        years: scenario.years,
        expectedReturn: scenario.expectedReturn,
        volatility: scenario.volatility,
        iterations,
      },
      traceId,
    );

    toolsUsed.push('run_monte_carlo_simulation');

    // Analyze results
    const result: SimulationResult = {
      scenarios: iterations,
      medianOutcome: simulationResults.percentiles.p50,
      bestCase: simulationResults.percentiles.p90,
      worstCase: simulationResults.percentiles.p10,
      probabilityOfSuccess: context.targetAmount
        ? this.calculateSuccessProbability(
            simulationResults.outcomes,
            context.targetAmount,
          )
        : 0,
      confidenceInterval: {
        lower: simulationResults.percentiles.p25,
        upper: simulationResults.percentiles.p75,
      },
      distribution: [
        { percentile: 10, value: simulationResults.percentiles.p10 },
        { percentile: 25, value: simulationResults.percentiles.p25 },
        { percentile: 50, value: simulationResults.percentiles.p50 },
        { percentile: 75, value: simulationResults.percentiles.p75 },
        { percentile: 90, value: simulationResults.percentiles.p90 },
      ],
    };

    reasoning.push(
      `Median outcome: ₹${result.medianOutcome.toLocaleString()}`,
    );
    reasoning.push(
      `Best case (90th percentile): ₹${result.bestCase.toLocaleString()}`,
    );
    reasoning.push(
      `Worst case (10th percentile): ₹${result.worstCase.toLocaleString()}`,
    );

    if (context.targetAmount) {
      reasoning.push(
        `Probability of reaching ₹${context.targetAmount.toLocaleString()}: ${(result.probabilityOfSuccess * 100).toFixed(1)}%`,
      );
    }

    await this.recordReasoning(
      `Simulation complete: ${(result.probabilityOfSuccess * 100).toFixed(1)}% success probability`,
      traceId,
    );

    // Determine next actions based on results
    const nextActions = this.determineNextActions(
      result.probabilityOfSuccess,
      context.targetAmount,
    );

    const confidence = 0.92; // High confidence in simulation

    return this.createSuccessResponse(
      result,
      reasoning,
      toolsUsed,
      confidence,
      nextActions,
    );
  }

  /**
   * Check loan affordability with stress testing
   */
  private async checkLoanAffordability(
    context: any,
    traceId?: string,
  ): Promise<AgentResponse> {
    const loanAmount = context.loanAmount;
    const interestRate = context.interestRate || 0.09; // 9% default
    const tenureYears = context.tenureYears || 20;
    const monthlyIncome = context.monthlyIncome;

    const reasoning: string[] = [];
    const toolsUsed: string[] = [];

    reasoning.push(`Loan amount: ₹${loanAmount.toLocaleString()}`);
    reasoning.push(`Interest rate: ${(interestRate * 100).toFixed(2)}%`);
    reasoning.push(`Tenure: ${tenureYears} years`);
    reasoning.push(`Monthly income: ₹${monthlyIncome.toLocaleString()}`);

    await this.recordReasoning('Calculating loan affordability', traceId);

    // Calculate EMI
    const emi = await this.callTool(
      'calculate_emi',
      {
        principal: loanAmount,
        rate: interestRate,
        tenure: tenureYears,
      },
      traceId,
    );

    toolsUsed.push('calculate_emi');

    const emiToIncomeRatio = emi.monthlyEMI / monthlyIncome;

    reasoning.push(`Monthly EMI: ₹${emi.monthlyEMI.toLocaleString()}`);
    reasoning.push(
      `EMI-to-income ratio: ${(emiToIncomeRatio * 100).toFixed(1)}%`,
    );

    // Determine affordability
    const affordable = emiToIncomeRatio <= this.MAX_EMI_TO_INCOME_RATIO;
    const riskLevel: 'low' | 'medium' | 'high' =
      emiToIncomeRatio <= this.SAFE_EMI_TO_INCOME_RATIO
        ? 'low'
        : emiToIncomeRatio <= this.MAX_EMI_TO_INCOME_RATIO
          ? 'medium'
          : 'high';

    reasoning.push(
      affordable
        ? '✓ Loan is affordable within 40% limit'
        : '✗ Loan exceeds 40% income allocation limit',
    );
    reasoning.push(`Risk level: ${riskLevel.toUpperCase()}`);

    await this.recordReasoning('Running stress tests', traceId);

    // Stress testing
    const stressTestResults = {
      incomeReduction20Percent:
        emi.monthlyEMI / (monthlyIncome * 0.8) <=
        this.MAX_EMI_TO_INCOME_RATIO,
      interestRateIncrease2Percent:
        (await this.callTool(
          'calculate_emi',
          {
            principal: loanAmount,
            rate: interestRate + 0.02,
            tenure: tenureYears,
          },
          traceId,
        )).monthlyEMI /
          monthlyIncome <=
        this.MAX_EMI_TO_INCOME_RATIO,
      jobLoss3Months:
        (context.emergencyFund || 0) >= emi.monthlyEMI * 3,
    };

    reasoning.push('Stress test results:');
    reasoning.push(
      `  20% income reduction: ${stressTestResults.incomeReduction20Percent ? '✓ Pass' : '✗ Fail'}`,
    );
    reasoning.push(
      `  2% interest rate increase: ${stressTestResults.interestRateIncrease2Percent ? '✓ Pass' : '✗ Fail'}`,
    );
    reasoning.push(
      `  3-month job loss coverage: ${stressTestResults.jobLoss3Months ? '✓ Pass' : '✗ Fail'}`,
    );

    // Calculate max affordable loan
    const maxAffordableEMI = monthlyIncome * this.SAFE_EMI_TO_INCOME_RATIO;
    const maxAffordableLoan = this.calculateMaxLoan(
      maxAffordableEMI,
      interestRate,
      tenureYears,
    );

    reasoning.push(
      `Maximum affordable loan (at 30% EMI): ₹${maxAffordableLoan.toLocaleString()}`,
    );

    const result: AffordabilityResult = {
      loanAmount,
      emi: emi.monthlyEMI,
      affordable,
      maxAffordableLoan,
      riskLevel,
      stressTestResults,
    };

    await this.recordReasoning(
      `Affordability check: ${affordable ? 'PASS' : 'FAIL'}`,
      traceId,
    );

    return this.createSuccessResponse(
      result,
      reasoning,
      toolsUsed,
      0.9,
      affordable
        ? ['Proceed with loan application', 'Build emergency fund for 6 months EMI']
        : [
            `Reduce loan to ₹${maxAffordableLoan.toLocaleString()}`,
            'Increase down payment',
            'Consider longer tenure',
          ],
    );
  }

  /**
   * Assess probability of achieving a financial goal
   */
  private async assessGoalProbability(
    context: any,
    traceId?: string,
  ): Promise<AgentResponse> {
    const targetAmount = context.targetAmount;
    const scenario: SimulationScenario = context.scenario;

    const reasoning: string[] = [];

    reasoning.push(
      `Target amount: ₹${targetAmount.toLocaleString()}`,
    );
    reasoning.push(
      `Investment plan: ₹${scenario.monthlyInvestment.toLocaleString()}/month for ${scenario.years} years`,
    );

    await this.recordReasoning(
      'Assessing goal achievement probability',
      traceId,
    );

    // Run simulation with target
    const simulationResult = await this.runMonteCarloSimulation(
      {
        ...context,
        targetAmount,
      },
      traceId,
    );

    const probability = simulationResult.result.probabilityOfSuccess;

    reasoning.push(
      `Probability of success: ${(probability * 100).toFixed(1)}%`,
    );

    // Provide recommendation based on probability
    let recommendation = '';
    if (probability >= 0.9) {
      recommendation = 'Excellent - Plan is highly likely to succeed';
    } else if (probability >= 0.75) {
      recommendation = 'Good - Plan has strong chance of success';
    } else if (probability >= 0.5) {
      recommendation =
        'Moderate - Consider increasing savings or timeline';
    } else {
      recommendation = 'Low - Plan needs significant adjustment';
    }

    reasoning.push(`Recommendation: ${recommendation}`);

    return this.createSuccessResponse(
      {
        targetAmount,
        probability,
        recommendation,
        simulationDetails: simulationResult.result,
      },
      reasoning,
      simulationResult.toolsUsed,
      0.88,
      probability < 0.75
        ? [
            `Increase monthly investment by ${Math.ceil((1 - probability) * 20)}%`,
            'Extend timeline by 1-2 years',
            'Adjust expected returns or risk profile',
          ]
        : ['Maintain current plan', 'Review annually'],
    );
  }

  /**
   * Run retirement corpus simulation
   */
  private async runRetirementSimulation(
    context: any,
    traceId?: string,
  ): Promise<AgentResponse> {
    const currentAge = context.currentAge;
    const retirementAge = context.retirementAge || 60;
    const monthlyInvestment = context.monthlyInvestment;
    const currentCorpus = context.currentCorpus || 0;
    const expectedLifespan = context.expectedLifespan || 85;

    const yearsToRetirement = retirementAge - currentAge;
    const yearsInRetirement = expectedLifespan - retirementAge;

    const reasoning: string[] = [];

    reasoning.push(`Current age: ${currentAge}, Retirement age: ${retirementAge}`);
    reasoning.push(`Years to retirement: ${yearsToRetirement}`);
    reasoning.push(
      `Monthly investment: ₹${monthlyInvestment.toLocaleString()}`,
    );

    await this.recordReasoning('Simulating retirement corpus', traceId);

    // Accumulation phase simulation
    const accumulationResult = await this.runMonteCarloSimulation(
      {
        scenario: {
          name: 'Retirement Accumulation',
          monthlyInvestment,
          years: yearsToRetirement,
          expectedReturn: 0.12,
          volatility: 0.08,
        },
      },
      traceId,
    );

    const retirementCorpus =
      accumulationResult.result.medianOutcome + currentCorpus;

    reasoning.push(
      `Expected corpus at retirement: ₹${retirementCorpus.toLocaleString()}`,
    );

    // Calculate monthly income in retirement (4% withdrawal rule)
    const monthlyIncomeInRetirement = (retirementCorpus * 0.04) / 12;

    reasoning.push(
      `Monthly income in retirement (4% rule): ₹${monthlyIncomeInRetirement.toLocaleString()}`,
    );

    // Adjust for inflation
    const inflationRate = context.inflationRate || this.DEFAULT_INFLATION;
    const inflationAdjustedIncome =
      monthlyIncomeInRetirement / Math.pow(1 + inflationRate, yearsToRetirement);

    reasoning.push(
      `Inflation-adjusted monthly income (today's value): ₹${inflationAdjustedIncome.toLocaleString()}`,
    );

    return this.createSuccessResponse(
      {
        currentAge,
        retirementAge,
        yearsToRetirement,
        retirementCorpus,
        monthlyIncomeInRetirement,
        inflationAdjustedIncome,
        simulationDetails: accumulationResult.result,
      },
      reasoning,
      accumulationResult.toolsUsed,
      0.85,
      [
        'Review retirement corpus annually',
        'Adjust contributions as income increases',
        'Consider increasing equity allocation if young',
      ],
    );
  }

  /**
   * Calculate success probability from outcomes array
   */
  private calculateSuccessProbability(
    outcomes: number[],
    targetAmount: number,
  ): number {
    const successfulOutcomes = outcomes.filter((val) => val >= targetAmount);
    return successfulOutcomes.length / outcomes.length;
  }

  /**
   * Determine next actions based on success probability
   */
  private determineNextActions(
    probability: number,
    targetAmount?: number,
  ): string[] {
    if (!targetAmount) {
      return ['Define specific target amount for goal analysis'];
    }

    if (probability >= 0.9) {
      return [
        'Current plan has excellent success rate',
        'Consider reducing risk in final years',
      ];
    } else if (probability >= 0.75) {
      return [
        'Plan is on track with good probability',
        'Monitor annually and adjust if needed',
      ];
    } else if (probability >= 0.5) {
      return [
        'Increase monthly investment by 15-20%',
        'Extend timeline by 1-2 years',
        'Review asset allocation for higher returns',
      ];
    } else {
      return [
        'Significant adjustment needed',
        'Increase investment by 30%+ or extend timeline',
        'Consult with Financial Planning Agent',
        'Consider reducing target amount',
      ];
    }
  }

  /**
   * Calculate maximum affordable loan amount
   */
  private calculateMaxLoan(
    maxEMI: number,
    interestRate: number,
    tenureYears: number,
  ): number {
    const monthlyRate = interestRate / 12;
    const totalMonths = tenureYears * 12;

    // Loan = EMI * [(1 - (1 + r)^-n) / r]
    const maxLoan =
      maxEMI *
      ((1 - Math.pow(1 + monthlyRate, -totalMonths)) / monthlyRate);

    return Math.floor(maxLoan);
  }
}
