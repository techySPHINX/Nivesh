import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { SimulateScenarioCommand } from '../commands/simulate-scenario.command';
import { FinancialContextBuilderService } from '../../domain/services/context-builder.service';
import {
  SimulationResult,
  ScenarioType,
  ProjectedOutcome,
  ScenarioParameters
} from '../../domain/value-objects/simulation.vo';
import {
  IAccountRepository,
  ACCOUNT_REPOSITORY
} from '../../../financial-data/domain/repositories/account.repository.interface';
import {
  ITransactionRepository,
  TRANSACTION_REPOSITORY
} from '../../../financial-data/domain/repositories/transaction.repository.interface';

/**
 * Simulate Scenario Handler
 * Handles what-if financial scenario simulations
 */
@CommandHandler(SimulateScenarioCommand)
export class SimulateScenarioHandler implements ICommandHandler<SimulateScenarioCommand> {
  private readonly logger = new Logger(SimulateScenarioHandler.name);

  constructor(
    private readonly contextBuilder: FinancialContextBuilderService,
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
    @Inject(TRANSACTION_REPOSITORY) private readonly transactionRepository: ITransactionRepository,
  ) { }

  async execute(command: SimulateScenarioCommand): Promise<SimulationResult> {
    const { userId, scenarioType, parameters } = command;

    this.logger.log(`Simulating scenario for user ${userId}: ${scenarioType}`);

    try {
      // Fetch current financial data
      const [accounts, transactions] = await Promise.all([
        this.accountRepository.findByUserId(userId),
        this.transactionRepository.getRecentTransactions(userId, 90),
      ]);

      // Build current context
      const accountsData = accounts.map(acc => ({
        id: acc.Id,
        userId: acc.UserId,
        accountType: acc.AccountType,
        balance: acc.Balance.getAmount(),
        currency: acc.Balance.getCurrency(),
        status: acc.Status,
      }));

      const transactionsData = transactions.map(txn => ({
        id: txn.Id,
        userId: txn.UserId,
        accountId: txn.AccountId,
        amount: txn.Amount.getAmount(),
        type: txn.Type,
        category: txn.Category,
        transactionDate: txn.TransactionDate,
        description: txn.Description,
      }));

      const currentContext = await this.contextBuilder.buildContext({
        userId,
        accountsData,
        transactionsData,
        goalsData: [],
      });

      // Simulate based on scenario type
      return this.simulate(scenarioType, currentContext, parameters);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Simulation failed: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  private simulate(scenarioType: string, context: any, params: any): SimulationResult {
    const currentSnapshot = context.toAIContext();

    // Calculate based on scenario
    const { category = 'general', monthlyChange = 0 } = params;

    const currentMonthlyExpenses = currentSnapshot.totalExpenses;
    const newMonthlyExpenses = currentMonthlyExpenses + monthlyChange;

    const currentSavingsRate = currentSnapshot.savingsRate;
    const newSavings = currentSnapshot.totalIncome - newMonthlyExpenses;
    const newSavingsRate = (newSavings / currentSnapshot.totalIncome) * 100;

    const impact = newSavingsRate - currentSavingsRate;

    const outcomes: ProjectedOutcome[] = [
      {
        metric: 'Monthly Expenses',
        current: currentMonthlyExpenses,
        projected: newMonthlyExpenses,
        change: monthlyChange,
        changePercentage: (monthlyChange / currentMonthlyExpenses) * 100,
      },
      {
        metric: 'Savings Rate (%)',
        current: currentSavingsRate,
        projected: newSavingsRate,
        change: impact,
        changePercentage: currentSavingsRate > 0 ? (impact / currentSavingsRate) * 100 : 0,
      },
    ];

    const insights: string[] = [];
    const alternatives: string[] = [];

    if (newSavingsRate < 10) {
      insights.push('⚠️ Savings rate falls below recommended 10% minimum');
      alternatives.push('Reduce expense amount or increase income sources');
    }

    if (newSavingsRate < 0) {
      insights.push('🚨 Critical: Monthly expenses exceed income');
      alternatives.push('Immediate budget restructuring required');
    } else if (newSavingsRate >= 20) {
      insights.push('✅ Excellent savings rate maintained');
    }

    const scenarioParams: ScenarioParameters = {
      type: ScenarioType.NEW_EXPENSE,
      changes: { category, monthlyChange },
      timeframeMonths: 12,
    };

    return new SimulationResult(
      `sim_${Date.now()}`,
      ScenarioType.NEW_EXPENSE,
      scenarioParams,
      outcomes,
      impact < -5 ? 'negative' : impact > 5 ? 'positive' : 'neutral',
      newSavingsRate >= 10 ? 'feasible' : newSavingsRate >= 0 ? 'challenging' : 'unfeasible',
      insights,
      alternatives,
    );
  }
}
