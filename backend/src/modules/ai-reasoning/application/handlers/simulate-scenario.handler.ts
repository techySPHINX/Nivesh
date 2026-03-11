import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { Inject, Logger } from "@nestjs/common";
import { SimulateScenarioCommand } from "../commands/simulate-scenario.command";
import { FinancialContextBuilderService } from "../../domain/services/context-builder.service";
import {
  SimulationResult,
  ScenarioType,
  ProjectedOutcome,
  ScenarioParameters,
} from "../../domain/value-objects/simulation.vo";
import {
  IAccountRepository,
  ACCOUNT_REPOSITORY,
} from "../../../financial-data/domain/repositories/account.repository.interface";
import {
  ITransactionRepository,
  TRANSACTION_REPOSITORY,
} from "../../../financial-data/domain/repositories/transaction.repository.interface";

/**
 * Simulate Scenario Handler
 * Full implementation for all scenario types:
 *   NEW_EXPENSE       — adds a recurring monthly expense
 *   INCOME_CHANGE     — models a raise, job loss, or freelance income
 *   GOAL_ADDITION     — adds a new financial goal with a monthly reserve
 *   INVESTMENT_INCREASE — bumps monthly SIP/investment allocation
 *   DEBT_PAYOFF       — pays off a loan and frees up cash flow
 *   LIFESTYLE_CHANGE  — general change across multiple spending categories
 */
@CommandHandler(SimulateScenarioCommand)
export class SimulateScenarioHandler implements ICommandHandler<SimulateScenarioCommand> {
  private readonly logger = new Logger(SimulateScenarioHandler.name);

  constructor(
    private readonly contextBuilder: FinancialContextBuilderService,
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: IAccountRepository,
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: ITransactionRepository,
  ) {}

  async execute(command: SimulateScenarioCommand): Promise<SimulationResult> {
    const { userId, scenarioType, parameters } = command;
    this.logger.log(`Simulating ${scenarioType} for user ${userId}`);

    try {
      const [accounts, transactions] = await Promise.all([
        this.accountRepository.findByUserId(userId),
        this.transactionRepository.getRecentTransactions(userId, 90),
      ]);

      const accountsData = accounts.map((acc) => ({
        id: acc.Id,
        userId: acc.UserId,
        accountType: acc.AccountType,
        balance: acc.Balance.getAmount(),
        currency: acc.Balance.getCurrency(),
        status: acc.Status,
      }));

      const transactionsData = transactions.map((txn) => ({
        id: txn.Id,
        userId: txn.UserId,
        accountId: txn.AccountId,
        amount: txn.Amount.getAmount(),
        type: txn.Type,
        category: txn.Category,
        transactionDate: txn.TransactionDate,
        description: txn.Description,
      }));

      const context = await this.contextBuilder.buildContext({
        userId,
        accountsData,
        transactionsData,
        goalsData: [],
      });

      const snapshot = context.toAIContext();
      return this.dispatch(scenarioType, snapshot, parameters);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Simulation failed: ${msg}`,
        error instanceof Error ? error.stack : "",
      );
      throw error;
    }
  }

  // ─── Dispatcher ────────────────────────────────────────────────────────────

  private dispatch(
    scenarioType: string,
    snapshot: any,
    params: any,
  ): SimulationResult {
    switch (scenarioType) {
      case ScenarioType.NEW_EXPENSE:
        return this.simulateNewExpense(snapshot, params);
      case ScenarioType.INCOME_CHANGE:
        return this.simulateIncomeChange(snapshot, params);
      case ScenarioType.GOAL_ADDITION:
        return this.simulateGoalAddition(snapshot, params);
      case ScenarioType.INVESTMENT_INCREASE:
        return this.simulateInvestmentIncrease(snapshot, params);
      case ScenarioType.DEBT_PAYOFF:
        return this.simulateDebtPayoff(snapshot, params);
      case ScenarioType.LIFESTYLE_CHANGE:
        return this.simulateLifestyleChange(snapshot, params);
      default:
        this.logger.warn(
          `Unknown scenarioType "${scenarioType}", falling back to NEW_EXPENSE`,
        );
        return this.simulateNewExpense(snapshot, params);
    }
  }

  // ─── Scenario Implementations ───────────────────────────────────────────────

  /** NEW_EXPENSE: monthly cost increase (EMI, subscription, rent, etc.) */
  private simulateNewExpense(snapshot: any, params: any): SimulationResult {
    const { category = "general", monthlyChange = 0 } = params;

    const income = snapshot.totalIncome ?? 0;
    const currentExpenses = snapshot.totalExpenses ?? 0;
    const newExpenses = currentExpenses + monthlyChange;
    const currentSavingsRate =
      income > 0 ? ((income - currentExpenses) / income) * 100 : 0;
    const newSavings = income - newExpenses;
    const newSavingsRate = income > 0 ? (newSavings / income) * 100 : 0;
    const impact = newSavingsRate - currentSavingsRate;

    const outcomes = this.buildOutcomes([
      {
        metric: "Monthly Expenses",
        current: currentExpenses,
        projected: newExpenses,
        change: monthlyChange,
      },
      {
        metric: "Savings Rate (%)",
        current: currentSavingsRate,
        projected: newSavingsRate,
      },
      {
        metric: "Annual Impact (₹)",
        current: 0,
        projected: -monthlyChange * 12,
        change: -monthlyChange * 12,
      },
    ]);

    const insights: string[] = [];
    if (newSavingsRate < 10)
      insights.push("⚠️ Savings rate falls below recommended 10% minimum");
    if (newSavingsRate < 0)
      insights.push("🚨 Critical: Monthly expenses exceed income");
    if (newSavingsRate >= 20)
      insights.push("✅ Healthy savings rate maintained");

    const alternatives =
      newSavingsRate < 10
        ? [
            "Cut discretionary spending to offset new expense",
            "Seek income enhancement through upskilling",
          ]
        : [];

    return this.buildResult(
      ScenarioType.NEW_EXPENSE,
      { category, monthlyChange },
      12,
      outcomes,
      impact,
      insights,
      alternatives,
    );
  }

  /** INCOME_CHANGE: salary raise, job loss, freelance side income */
  private simulateIncomeChange(snapshot: any, params: any): SimulationResult {
    const { monthlyChange = 0, reason = "salary change" } = params;

    const currentIncome = snapshot.totalIncome ?? 0;
    const expenses = snapshot.totalExpenses ?? 0;
    const newIncome = currentIncome + monthlyChange;
    const currentSavings = currentIncome - expenses;
    const newSavings = newIncome - expenses;
    const currentSavingsRate =
      currentIncome > 0 ? (currentSavings / currentIncome) * 100 : 0;
    const newSavingsRate = newIncome > 0 ? (newSavings / newIncome) * 100 : 0;
    const savingsRateChange = newSavingsRate - currentSavingsRate;

    // Project 12-month corpus delta
    const corpusDelta = (newSavings - currentSavings) * 12 * Math.pow(1.1, 1); // 10% assumed return

    const outcomes = this.buildOutcomes([
      {
        metric: "Monthly Income",
        current: currentIncome,
        projected: newIncome,
        change: monthlyChange,
      },
      {
        metric: "Monthly Savings",
        current: currentSavings,
        projected: newSavings,
      },
      {
        metric: "Savings Rate (%)",
        current: currentSavingsRate,
        projected: newSavingsRate,
      },
      {
        metric: "1-Year Corpus Delta (₹)",
        current: 0,
        projected: corpusDelta,
        change: corpusDelta,
      },
    ]);

    const insights: string[] = [];
    if (monthlyChange > 0) {
      insights.push(
        `✅ Income boost of ₹${monthlyChange.toLocaleString("en-IN")}/month improves savings by ₹${Math.round(corpusDelta).toLocaleString("en-IN")} over a year.`,
      );
      insights.push(
        "Consider channelling the raise directly into SIP to avoid lifestyle inflation.",
      );
    } else {
      insights.push(
        `⚠️ Income reduction of ₹${Math.abs(monthlyChange).toLocaleString("en-IN")}/month.`,
      );
      if (newSavings < 0)
        insights.push(
          "🚨 Expenses now exceed income — immediate budget review needed.",
        );
    }

    const alternatives =
      monthlyChange < 0
        ? [
            "Identify top 3 discretionary categories to cut",
            "Explore freelance or consulting income",
          ]
        : [
            "Automate the income delta into index funds",
            "Accelerate goal timelines with surplus",
          ];

    return this.buildResult(
      ScenarioType.INCOME_CHANGE,
      { monthlyChange, reason },
      12,
      outcomes,
      savingsRateChange,
      insights,
      alternatives,
    );
  }

  /** GOAL_ADDITION: adds a new financial goal requiring a monthly reserve */
  private simulateGoalAddition(snapshot: any, params: any): SimulationResult {
    const {
      goalName = "New Goal",
      targetAmount = 0,
      timelineMonths = 60,
      expectedReturnRate = 0.1,
    } = params;

    const income = snapshot.totalIncome ?? 0;
    const expenses = snapshot.totalExpenses ?? 0;
    const currentSavings = income - expenses;

    // Monthly SIP needed (FV of annuity formula)
    const r = expectedReturnRate / 12;
    const monthlyRequired =
      r > 0
        ? (targetAmount * r) / (Math.pow(1 + r, timelineMonths) - 1)
        : targetAmount / timelineMonths;

    const newSavings = currentSavings - monthlyRequired;
    const currentSavingsRate = income > 0 ? (currentSavings / income) * 100 : 0;
    const newSavingsRate = income > 0 ? (newSavings / income) * 100 : 0;

    const outcomes = this.buildOutcomes([
      {
        metric: "Monthly SIP Required",
        current: 0,
        projected: monthlyRequired,
        change: monthlyRequired,
      },
      {
        metric: "Free Monthly Savings",
        current: currentSavings,
        projected: newSavings,
      },
      {
        metric: "Savings Rate (%)",
        current: currentSavingsRate,
        projected: newSavingsRate,
      },
      {
        metric: "Goal Timeline (months)",
        current: 0,
        projected: timelineMonths,
        change: timelineMonths,
      },
    ]);

    const insights: string[] = [
      `You need ₹${Math.round(monthlyRequired).toLocaleString("en-IN")}/month to reach ₹${targetAmount.toLocaleString("en-IN")} in ${timelineMonths} months.`,
    ];
    if (newSavingsRate < 0)
      insights.push(
        "🚨 Goal not feasible without income growth or expense reduction.",
      );
    if (monthlyRequired > currentSavings)
      insights.push("⚠️ Monthly requirement exceeds current surplus.");
    if (newSavingsRate >= 10)
      insights.push("✅ Savings rate remains healthy after goal allocation.");

    const alternatives =
      newSavingsRate < 0
        ? [
            `Extend timeline to ${Math.round(timelineMonths * 1.5)} months to reduce monthly requirement`,
            "Start with partial SIP and step-up annually",
          ]
        : [];

    const impact = newSavingsRate - currentSavingsRate;
    return this.buildResult(
      ScenarioType.GOAL_ADDITION,
      { goalName, targetAmount, timelineMonths },
      timelineMonths,
      outcomes,
      impact,
      insights,
      alternatives,
    );
  }

  /** INVESTMENT_INCREASE: boosting SIP / equity allocation */
  private simulateInvestmentIncrease(
    snapshot: any,
    params: any,
  ): SimulationResult {
    const {
      additionalMonthlyInvestment = 0,
      instrument = "equity mutual fund",
      expectedReturnRate = 0.12,
      investmentHorizonYears = 10,
    } = params;

    const income = snapshot.totalIncome ?? 0;
    const expenses = snapshot.totalExpenses ?? 0;
    const currentSavings = income - expenses;
    const newFreeSavings = currentSavings - additionalMonthlyInvestment;

    const horizonMonths = investmentHorizonYears * 12;
    const r = expectedReturnRate / 12;
    const fv =
      r > 0
        ? additionalMonthlyInvestment *
          ((Math.pow(1 + r, horizonMonths) - 1) / r)
        : additionalMonthlyInvestment * horizonMonths;

    const outcomes = this.buildOutcomes([
      {
        metric: "Additional Monthly SIP",
        current: 0,
        projected: additionalMonthlyInvestment,
        change: additionalMonthlyInvestment,
      },
      {
        metric: "Free Monthly Cash",
        current: currentSavings,
        projected: newFreeSavings,
      },
      {
        metric: `${investmentHorizonYears}Y Corpus (₹)`,
        current: 0,
        projected: Math.round(fv),
        change: Math.round(fv),
      },
    ]);

    const insights = [
      `₹${additionalMonthlyInvestment.toLocaleString("en-IN")}/month into ${instrument} at ${(expectedReturnRate * 100).toFixed(1)}% grows to ₹${Math.round(fv).toLocaleString("en-IN")} in ${investmentHorizonYears} years.`,
    ];
    if (newFreeSavings < 0)
      insights.push(
        "⚠️ Insufficient free cash — reduce investment or expenses.",
      );
    if (newFreeSavings > 0)
      insights.push("✅ Emergency fund buffer maintained.");

    const impact = newFreeSavings >= 0 ? fv : -Math.abs(newFreeSavings) * 12;
    return this.buildResult(
      ScenarioType.INVESTMENT_INCREASE,
      { additionalMonthlyInvestment, instrument, expectedReturnRate },
      horizonMonths,
      outcomes,
      impact,
      insights,
      [],
    );
  }

  /** DEBT_PAYOFF: eliminates an EMI and redirects cash to investments/savings */
  private simulateDebtPayoff(snapshot: any, params: any): SimulationResult {
    const {
      emiAmount = 0,
      loanName = "Loan",
      remainingMonths = 0,
      redirectToInvestment = true,
      expectedReturnRate = 0.12,
    } = params;

    const income = snapshot.totalIncome ?? 0;
    const expenses = snapshot.totalExpenses ?? 0;

    // Pre-payoff state
    const currentSavings = income - expenses;
    const currentSavingsRate = income > 0 ? (currentSavings / income) * 100 : 0;

    // Post-payoff: EMI freed
    const newSavings = currentSavings + emiAmount;
    const newSavingsRate = income > 0 ? (newSavings / income) * 100 : 0;

    // Investment corpus if redirected
    const r = expectedReturnRate / 12;
    const redirectionCorpus =
      redirectToInvestment && r > 0
        ? emiAmount * ((Math.pow(1 + r, remainingMonths) - 1) / r)
        : emiAmount * remainingMonths;

    const outcomes = this.buildOutcomes([
      {
        metric: "Monthly Cash Flow",
        current: currentSavings,
        projected: newSavings,
        change: emiAmount,
      },
      {
        metric: "Savings Rate (%)",
        current: currentSavingsRate,
        projected: newSavingsRate,
      },
      {
        metric: `Corpus if Redirected (₹)`,
        current: 0,
        projected: Math.round(redirectionCorpus),
        change: Math.round(redirectionCorpus),
      },
    ]);

    const insights = [
      `Paying off ${loanName} frees ₹${emiAmount.toLocaleString("en-IN")}/month, improving savings rate from ${currentSavingsRate.toFixed(1)}% to ${newSavingsRate.toFixed(1)}%.`,
    ];
    if (redirectToInvestment) {
      insights.push(
        `Redirecting ₹${emiAmount.toLocaleString("en-IN")}/month to investments could grow to ₹${Math.round(redirectionCorpus).toLocaleString("en-IN")} over ${remainingMonths} months.`,
      );
    }

    const impact = newSavingsRate - currentSavingsRate;
    return this.buildResult(
      ScenarioType.DEBT_PAYOFF,
      { loanName, emiAmount, remainingMonths },
      remainingMonths,
      outcomes,
      impact,
      insights,
      [],
    );
  }

  /** LIFESTYLE_CHANGE: broad spending cuts or upgrades across categories */
  private simulateLifestyleChange(
    snapshot: any,
    params: any,
  ): SimulationResult {
    const {
      categoryChanges = [] as Array<{
        category: string;
        monthlyChange: number;
      }>,
      description = "Lifestyle adjustment",
    } = params;

    const income = snapshot.totalIncome ?? 0;
    const expenses = snapshot.totalExpenses ?? 0;
    const totalMonthlyChange = (categoryChanges as any[]).reduce(
      (sum: number, c: any) => sum + (c.monthlyChange ?? 0),
      0,
    );
    const newExpenses = expenses + totalMonthlyChange;
    const currentSavings = income - expenses;
    const newSavings = income - newExpenses;
    const currentSavingsRate = income > 0 ? (currentSavings / income) * 100 : 0;
    const newSavingsRate = income > 0 ? (newSavings / income) * 100 : 0;

    const outcomes = this.buildOutcomes([
      {
        metric: "Total Monthly Change",
        current: 0,
        projected: Math.abs(totalMonthlyChange),
        change: totalMonthlyChange,
      },
      { metric: "Monthly Expenses", current: expenses, projected: newExpenses },
      {
        metric: "Savings Rate (%)",
        current: currentSavingsRate,
        projected: newSavingsRate,
      },
      {
        metric: "Annual Savings Impact (₹)",
        current: 0,
        projected: -totalMonthlyChange * 12,
        change: -totalMonthlyChange * 12,
      },
    ]);

    const insights: string[] = [description];
    if (totalMonthlyChange < 0) {
      insights.push(
        `✅ Reducing spending by ₹${Math.abs(totalMonthlyChange).toLocaleString("en-IN")}/month saves ₹${Math.abs(totalMonthlyChange * 12).toLocaleString("en-IN")} annually.`,
      );
    }
    if (newSavingsRate < 10)
      insights.push("⚠️ Savings rate still below recommended minimum of 10%.");

    const impact = newSavingsRate - currentSavingsRate;
    return this.buildResult(
      ScenarioType.LIFESTYLE_CHANGE,
      { categoryChanges, description },
      12,
      outcomes,
      impact,
      insights,
      [],
    );
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private buildOutcomes(
    rows: Array<{
      metric: string;
      current: number;
      projected: number;
      change?: number;
    }>,
  ): ProjectedOutcome[] {
    return rows.map((r) => {
      const change = r.change ?? r.projected - r.current;
      return {
        metric: r.metric,
        current: Math.round(r.current * 100) / 100,
        projected: Math.round(r.projected * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercentage:
          r.current !== 0
            ? Math.round((change / Math.abs(r.current)) * 10000) / 100
            : 0,
      };
    });
  }

  private buildResult(
    type: ScenarioType,
    changes: Record<string, any>,
    timeframeMonths: number,
    outcomes: ProjectedOutcome[],
    impactNumber: number,
    insights: string[],
    alternatives: string[],
  ): SimulationResult {
    const impact =
      impactNumber > 5
        ? "positive"
        : impactNumber < -5
          ? "negative"
          : "neutral";
    const feasibility = outcomes.some(
      (o) => o.metric.includes("Savings Rate") && o.projected < 0,
    )
      ? "unfeasible"
      : outcomes.some(
            (o) => o.metric.includes("Savings Rate") && o.projected < 10,
          )
        ? "challenging"
        : "feasible";

    const params: ScenarioParameters = { type, changes, timeframeMonths };

    return new SimulationResult(
      `sim_${Date.now()}`,
      type,
      params,
      outcomes,
      impact,
      feasibility,
      insights,
      alternatives,
    );
  }
}
