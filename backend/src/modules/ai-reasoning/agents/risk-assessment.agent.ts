import { Injectable, Logger } from '@nestjs/common';
import { BaseAgent } from './base.agent';
import { AgentMessage, AgentResponse, AgentType } from '../types/agent.types';
import { ToolRegistry } from '../services/tool-registry.service';
import { DecisionTraceService } from '../services/decision-trace.service';

/**
 * Risk Metrics Interface
 * Comprehensive financial risk indicators
 */
interface RiskMetrics {
  incomeVolatility: number; // Standard deviation of income
  debtToIncomeRatio: number; // Total debt / monthly income
  emergencyFundCoverage: number; // Emergency fund / (monthly expenses * 6)
  investmentRiskScore: number; // 0-100 (higher = riskier)
  liquidityRatio: number; // Liquid assets / monthly expenses
  concentrationRisk: number; // 0-1 (1 = highly concentrated)
}

/**
 * Risk Level Type
 */
type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Risk Mitigation Strategy Interface
 */
interface RiskMitigation {
  risk: string;
  severity: RiskLevel;
  recommendation: string;
  priority: number; // 1-5 (5 = highest)
  estimatedImpact: string;
}

/**
 * RiskAssessmentAgent
 * Specialized agent for evaluating financial risks and suggesting mitigation strategies.
 *
 * Capabilities:
 * - Income stability analysis
 * - Debt-to-income ratio calculation
 * - Emergency fund adequacy check
 * - Investment risk profiling
 * - Liquidity assessment
 * - Concentration risk detection
 *
 * Example Use Case:
 * User planning house purchase
 * Agent:
 * 1. Analyzes income history for volatility
 * 2. Calculates current debt obligations
 * 3. Checks emergency fund (should be 6+ months expenses)
 * 4. Assesses investment portfolio risk
 * 5. Provides risk level: Low/Medium/High
 * 6. Suggests mitigations (e.g., "Build emergency fund before taking loan")
 *
 * Risk Thresholds:
 * - Low Risk: DTI <30%, Emergency Fund >6 months, Low volatility
 * - Medium Risk: DTI 30-50%, Emergency Fund 3-6 months, Moderate volatility
 * - High Risk: DTI >50%, Emergency Fund <3 months, High volatility
 * - Critical Risk: DTI >70%, No emergency fund, Extreme volatility
 *
 * @Injectable
 */
@Injectable()
export class RiskAssessmentAgent extends BaseAgent {
  protected readonly logger = new Logger(RiskAssessmentAgent.name);

  // Risk thresholds
  private readonly DTI_LOW_THRESHOLD = 0.3; // 30%
  private readonly DTI_MEDIUM_THRESHOLD = 0.5; // 50%
  private readonly DTI_HIGH_THRESHOLD = 0.7; // 70%

  private readonly EMERGENCY_FUND_IDEAL_MONTHS = 6;
  private readonly EMERGENCY_FUND_MINIMUM_MONTHS = 3;

  private readonly VOLATILITY_LOW_THRESHOLD = 0.15; // 15% std dev
  private readonly VOLATILITY_HIGH_THRESHOLD = 0.3; // 30% std dev

  constructor(
    toolRegistry: ToolRegistry,
    decisionTraceService: DecisionTraceService,
  ) {
    super(AgentType.RISK_ASSESSMENT, toolRegistry, decisionTraceService);
  }

  /**
   * Execute risk assessment task
   *
   * Expected message.payload structure:
   * {
   *   task: 'assess_risk' | 'analyze_debt' | 'check_emergency_fund',
   *   context: {
   *     userId: string,
   *     traceId?: string
   *   }
   * }
   */
  async execute(message: AgentMessage): Promise<AgentResponse> {
    const { task, context } = message.payload;
    const traceId = context.traceId;

    this.logger.log(`Executing RiskAssessmentAgent: ${task}`);

    try {
      await this.recordReasoning(
        `Starting risk assessment task: ${task}`,
        traceId,
      );

      // Validate required context
      if (!context.userId) {
        throw new Error('Missing required context: userId');
      }

      // Route to appropriate handler
      let result;
      switch (task) {
        case 'assess_risk':
          result = await this.assessOverallRisk(context, traceId);
          break;
        case 'analyze_debt':
          result = await this.analyzeDebtRisk(context, traceId);
          break;
        case 'check_emergency_fund':
          result = await this.checkEmergencyFund(context, traceId);
          break;
        default:
          throw new Error(`Unknown task: ${task}`);
      }

      return result;
    } catch (error) {
      this.logger.error(
        `RiskAssessmentAgent execution failed: ${error.message}`,
        error.stack,
      );
      return this.handleError(error, context);
    }
  }

  /**
   * Comprehensive risk assessment
   * Queries financial graph for risk indicators and calculates overall risk level
   */
  private async assessOverallRisk(
    context: any,
    traceId?: string,
  ): Promise<AgentResponse> {
    const userId = context.userId;
    const reasoning: string[] = [];
    const toolsUsed: string[] = [];

    // Step 1: Query financial graph for risk indicators
    await this.recordReasoning(
      'Querying financial graph for risk indicators',
      traceId,
    );

    const graphData = await this.callTool(
      'query_financial_graph',
      {
        userId,
        queryType: 'risk_indicators',
      },
      traceId,
    );

    toolsUsed.push('query_financial_graph');

    reasoning.push(
      `Retrieved financial data: ${Object.keys(graphData).join(', ')}`,
    );

    // Step 2: Calculate risk metrics
    await this.recordReasoning('Calculating risk metrics', traceId);

    const metrics = this.calculateRiskMetrics(graphData);

    // Document each metric
    reasoning.push(
      `Income volatility: ${(metrics.incomeVolatility * 100).toFixed(1)}% (std dev)`,
    );
    reasoning.push(
      `Debt-to-income ratio: ${(metrics.debtToIncomeRatio * 100).toFixed(1)}%`,
    );
    reasoning.push(
      `Emergency fund coverage: ${metrics.emergencyFundCoverage.toFixed(1)}x monthly expenses`,
    );
    reasoning.push(
      `Investment risk score: ${metrics.investmentRiskScore.toFixed(0)}/100`,
    );
    reasoning.push(
      `Liquidity ratio: ${metrics.liquidityRatio.toFixed(1)}x monthly expenses`,
    );

    // Step 3: Determine overall risk level
    const riskLevel = this.determineRiskLevel(metrics);
    reasoning.push(`Overall risk assessment: ${riskLevel.toUpperCase()}`);

    await this.recordReasoning(`Risk level determined: ${riskLevel}`, traceId);

    // Step 4: Generate mitigation strategies
    const mitigations = this.generateMitigations(metrics, riskLevel);
    reasoning.push(`Generated ${mitigations.length} risk mitigation strategies`);

    // Step 5: Calculate confidence
    const confidence = this.calculateConfidence(graphData);

    return this.createSuccessResponse(
      {
        riskLevel,
        metrics,
        mitigations,
        riskScore: this.calculateOverallRiskScore(metrics),
      },
      reasoning,
      toolsUsed,
      confidence,
      ['Review mitigation strategies', 'Update financial plan based on risk level'],
    );
  }

  /**
   * Calculate comprehensive risk metrics from financial data
   */
  private calculateRiskMetrics(graphData: any): RiskMetrics {
    // Income volatility (standard deviation of last 6 months)
    const incomeHistory = graphData.incomeHistory || [];
    const incomeVolatility =
      incomeHistory.length >= 3
        ? this.calculateStandardDeviation(incomeHistory)
        : 0.5; // Default to high volatility if insufficient data

    // Debt-to-income ratio
    const monthlyIncome = graphData.monthlyIncome || 0;
    const totalDebt = graphData.totalDebt || 0;
    const debtToIncomeRatio = monthlyIncome > 0 ? totalDebt / monthlyIncome : 0;

    // Emergency fund coverage
    const emergencyFund = graphData.emergencyFund || 0;
    const monthlyExpenses = graphData.monthlyExpenses || monthlyIncome * 0.7;
    const emergencyFundCoverage =
      monthlyExpenses > 0
        ? emergencyFund / (monthlyExpenses * this.EMERGENCY_FUND_IDEAL_MONTHS)
        : 0;

    // Investment risk score (weighted by asset allocation)
    const investments = graphData.investments || {};
    const investmentRiskScore = this.assessPortfolioRisk(investments);

    // Liquidity ratio
    const liquidAssets = graphData.liquidAssets || emergencyFund;
    const liquidityRatio =
      monthlyExpenses > 0 ? liquidAssets / monthlyExpenses : 0;

    // Concentration risk (Herfindahl index on expense categories)
    const expenseCategories = graphData.expenseCategories || {};
    const concentrationRisk =
      this.calculateConcentrationRisk(expenseCategories);

    return {
      incomeVolatility,
      debtToIncomeRatio,
      emergencyFundCoverage,
      investmentRiskScore,
      liquidityRatio,
      concentrationRisk,
    };
  }

  /**
   * Calculate standard deviation of an array
   */
  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      values.length;

    return Math.sqrt(variance) / mean; // Coefficient of variation
  }

  /**
   * Assess investment portfolio risk
   * Returns risk score 0-100 (higher = riskier)
   */
  private assessPortfolioRisk(investments: any): number {
    const equity = investments.equity || 0;
    const debt = investments.debt || 0;
    const gold = investments.gold || 0;
    const crypto = investments.crypto || 0;

    const totalInvestment = equity + debt + gold + crypto;

    if (totalInvestment === 0) return 50; // Default medium risk

    // Risk weights: Crypto=100, Equity=70, Gold=30, Debt=10
    const riskScore =
      ((crypto / totalInvestment) * 100 +
        (equity / totalInvestment) * 70 +
        (gold / totalInvestment) * 30 +
        (debt / totalInvestment) * 10);

    return Math.min(100, riskScore);
  }

  /**
   * Calculate concentration risk using Herfindahl index
   * Returns 0-1 (1 = highly concentrated, risky)
   */
  private calculateConcentrationRisk(categories: Record<string, number>): number {
    const values = Object.values(categories);
    const total = values.reduce((sum, val) => sum + val, 0);

    if (total === 0) return 0;

    // Herfindahl index: sum of squared market shares
    const herfindahl = values.reduce(
      (sum, val) => sum + Math.pow(val / total, 2),
      0,
    );

    return herfindahl;
  }

  /**
   * Determine overall risk level based on metrics
   */
  private determineRiskLevel(metrics: RiskMetrics): RiskLevel {
    let riskScore = 0;

    // Debt-to-income contribution (0-4 points)
    if (metrics.debtToIncomeRatio > this.DTI_HIGH_THRESHOLD) riskScore += 4;
    else if (metrics.debtToIncomeRatio > this.DTI_MEDIUM_THRESHOLD) riskScore += 2;
    else if (metrics.debtToIncomeRatio > this.DTI_LOW_THRESHOLD) riskScore += 1;

    // Emergency fund contribution (0-3 points)
    if (metrics.emergencyFundCoverage < 0.5) riskScore += 3;
    else if (
      metrics.emergencyFundCoverage < this.EMERGENCY_FUND_MINIMUM_MONTHS / this.EMERGENCY_FUND_IDEAL_MONTHS
    )
      riskScore += 2;
    else if (metrics.emergencyFundCoverage < 1) riskScore += 1;

    // Income volatility contribution (0-3 points)
    if (metrics.incomeVolatility > this.VOLATILITY_HIGH_THRESHOLD) riskScore += 3;
    else if (metrics.incomeVolatility > this.VOLATILITY_LOW_THRESHOLD) riskScore += 1;

    // Investment risk contribution (0-2 points)
    if (metrics.investmentRiskScore > 70) riskScore += 2;
    else if (metrics.investmentRiskScore > 50) riskScore += 1;

    // Determine level based on total score
    if (riskScore >= 8) return 'critical';
    if (riskScore >= 5) return 'high';
    if (riskScore >= 2) return 'medium';
    return 'low';
  }

  /**
   * Generate risk mitigation strategies
   */
  private generateMitigations(
    metrics: RiskMetrics,
    riskLevel: RiskLevel,
  ): RiskMitigation[] {
    const mitigations: RiskMitigation[] = [];

    // Emergency fund mitigation
    if (metrics.emergencyFundCoverage < 1) {
      mitigations.push({
        risk: 'Insufficient Emergency Fund',
        severity: metrics.emergencyFundCoverage < 0.5 ? 'critical' : 'high',
        recommendation: `Build emergency fund to ₹${Math.ceil(metrics.emergencyFundCoverage * 100000)} (${this.EMERGENCY_FUND_IDEAL_MONTHS} months expenses)`,
        priority: 5,
        estimatedImpact: 'Protects against income loss or unexpected expenses',
      });
    }

    // Debt mitigation
    if (metrics.debtToIncomeRatio > this.DTI_MEDIUM_THRESHOLD) {
      mitigations.push({
        risk: 'High Debt-to-Income Ratio',
        severity: metrics.debtToIncomeRatio > this.DTI_HIGH_THRESHOLD ? 'critical' : 'high',
        recommendation: 'Reduce debt obligations through early repayment or consolidation',
        priority: 4,
        estimatedImpact: 'Frees up monthly cash flow and reduces financial stress',
      });
    }

    // Income volatility mitigation
    if (metrics.incomeVolatility > this.VOLATILITY_HIGH_THRESHOLD) {
      mitigations.push({
        risk: 'High Income Volatility',
        severity: 'high',
        recommendation: 'Diversify income sources or build larger emergency buffer',
        priority: 3,
        estimatedImpact: 'Reduces impact of income fluctuations',
      });
    }

    // Investment risk mitigation
    if (metrics.investmentRiskScore > 70) {
      mitigations.push({
        risk: 'High-Risk Investment Portfolio',
        severity: 'medium',
        recommendation: 'Rebalance portfolio with more debt/stable instruments',
        priority: 2,
        estimatedImpact: 'Reduces volatility and protects capital',
      });
    }

    // Sort by priority (highest first)
    return mitigations.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Calculate overall risk score (0-100)
   */
  private calculateOverallRiskScore(metrics: RiskMetrics): number {
    const weights = {
      debtToIncome: 0.3,
      emergencyFund: 0.25,
      incomeVolatility: 0.2,
      investmentRisk: 0.15,
      liquidity: 0.1,
    };

    const dtiScore = Math.min(100, metrics.debtToIncomeRatio * 100);
    const efScore = Math.max(0, 100 - metrics.emergencyFundCoverage * 100);
    const volScore = Math.min(100, metrics.incomeVolatility * 200);
    const invScore = metrics.investmentRiskScore;
    const liqScore = Math.max(0, 100 - metrics.liquidityRatio * 20);

    const overallScore =
      dtiScore * weights.debtToIncome +
      efScore * weights.emergencyFund +
      volScore * weights.incomeVolatility +
      invScore * weights.investmentRisk +
      liqScore * weights.liquidity;

    return Math.round(overallScore);
  }

  /**
   * Analyze debt-specific risks
   */
  private async analyzeDebtRisk(
    context: any,
    traceId?: string,
  ): Promise<AgentResponse> {
    const graphData = await this.callTool('query_financial_graph', {
      userId: context.userId,
      queryType: 'debt_details',
    });

    const reasoning: string[] = [];
    const totalDebt = graphData.totalDebt || 0;
    const monthlyIncome = graphData.monthlyIncome || 0;
    const dti = totalDebt / monthlyIncome;

    reasoning.push(`Total debt: ₹${totalDebt.toLocaleString()}`);
    reasoning.push(`Monthly income: ₹${monthlyIncome.toLocaleString()}`);
    reasoning.push(`Debt-to-income ratio: ${(dti * 100).toFixed(1)}%`);

    const severity: RiskLevel =
      dti > this.DTI_HIGH_THRESHOLD
        ? 'critical'
        : dti > this.DTI_MEDIUM_THRESHOLD
          ? 'high'
          : dti > this.DTI_LOW_THRESHOLD
            ? 'medium'
            : 'low';

    return this.createSuccessResponse(
      { totalDebt, dti, severity },
      reasoning,
      ['query_financial_graph'],
      0.9,
    );
  }

  /**
   * Check emergency fund adequacy
   */
  private async checkEmergencyFund(
    context: any,
    traceId?: string,
  ): Promise<AgentResponse> {
    const graphData = await this.callTool('query_financial_graph', {
      userId: context.userId,
      queryType: 'emergency_fund',
    });

    const emergencyFund = graphData.emergencyFund || 0;
    const monthlyExpenses = graphData.monthlyExpenses || 0;
    const coverage = monthlyExpenses > 0 ? emergencyFund / monthlyExpenses : 0;

    const reasoning: string[] = [];
    reasoning.push(`Emergency fund: ₹${emergencyFund.toLocaleString()}`);
    reasoning.push(`Monthly expenses: ₹${monthlyExpenses.toLocaleString()}`);
    reasoning.push(`Coverage: ${coverage.toFixed(1)} months`);

    const adequate = coverage >= this.EMERGENCY_FUND_IDEAL_MONTHS;
    reasoning.push(
      adequate ? '✓ Emergency fund is adequate' : `✗ Need ${this.EMERGENCY_FUND_IDEAL_MONTHS - coverage} more months`,
    );

    return this.createSuccessResponse(
      { emergencyFund, coverage, adequate },
      reasoning,
      ['query_financial_graph'],
      0.95,
    );
  }

  /**
   * Calculate confidence based on data completeness
   */
  private calculateConfidence(graphData: any): number {
    const requiredFields = [
      'incomeHistory',
      'totalDebt',
      'monthlyIncome',
      'monthlyExpenses',
      'emergencyFund',
      'investments',
    ];

    const presentFields = requiredFields.filter(
      (field) => graphData[field] !== undefined,
    ).length;

    return 0.5 + (presentFields / requiredFields.length) * 0.5; // 0.5 to 1.0
  }
}
