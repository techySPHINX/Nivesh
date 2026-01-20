/**
 * Financial Context Builder Service
 * Builds anonymized financial context from user's financial data
 */

import { Injectable } from '@nestjs/common';
import {
  FinancialContext,
  FinancialSnapshot,
  GoalSummary,
  RiskProfile,
} from '../value-objects/financial-context.vo';

export interface BuildContextParams {
  userId: string;
  accountsData?: any[];
  transactionsData?: any[];
  goalsData?: any[];
  userProfile?: any;
}

@Injectable()
export class FinancialContextBuilderService {
  /**
   * Builds financial context from user's data
   */
  async buildContext(params: BuildContextParams): Promise<FinancialContext> {
    const snapshot = this.buildSnapshot(
      params.transactionsData || [],
      params.accountsData || [],
    );

    const goals = this.buildGoalsSummary(params.goalsData || []);

    const riskProfile = this.buildRiskProfile(params.userProfile, snapshot);

    return new FinancialContext(params.userId, snapshot, goals, riskProfile);
  }

  private buildSnapshot(
    transactions: any[],
    accounts: any[],
  ): FinancialSnapshot {
    // Calculate income (credit transactions with income categories)
    const incomeTransactions = transactions.filter(
      (t) =>
        t.type === 'CREDIT' &&
        ['SALARY', 'FREELANCE', 'OTHER_INCOME'].includes(t.category),
    );
    const totalIncome =
      incomeTransactions.reduce((sum, t) => sum + t.amount, 0) || 0;

    // Calculate expenses (debit transactions)
    const expenseTransactions = transactions.filter((t) => t.type === 'DEBIT');
    const totalExpenses =
      expenseTransactions.reduce((sum, t) => sum + t.amount, 0) || 0;

    // Calculate savings (account balances for savings/current accounts)
    const savingsAccounts = accounts.filter(
      (a) => a.accountType === 'SAVINGS' || a.accountType === 'CURRENT',
    );
    const totalSavings =
      savingsAccounts.reduce((sum, a) => sum + a.balance, 0) || 0;

    // Calculate investments
    const investmentAccounts = accounts.filter(
      (a) => a.accountType === 'INVESTMENT',
    );
    const totalInvestments =
      investmentAccounts.reduce((sum, a) => sum + a.balance, 0) || 0;

    // Calculate debt (credit cards, loans)
    const debtAccounts = accounts.filter(
      (a) => a.accountType === 'CREDIT_CARD' || a.accountType === 'LOAN',
    );
    const totalDebt =
      debtAccounts.reduce((sum, a) => sum + Math.abs(a.balance), 0) || 0;

    // Monthly spending by category
    const categorySpending = this.calculateCategorySpending(expenseTransactions);

    // Calculate metrics
    const savingsRate =
      totalIncome > 0
        ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100)
        : 0;

    const debtToIncomeRatio =
      totalIncome > 0 ? Math.round((totalDebt / totalIncome) * 100) : 0;

    return {
      totalIncome,
      totalExpenses,
      totalSavings,
      totalInvestments,
      totalDebt,
      monthlySpending: categorySpending,
      savingsRate,
      debtToIncomeRatio,
    };
  }

  private calculateCategorySpending(transactions: any[]): Array<{
    category: string;
    amount: number;
    percentage: number;
  }> {
    const categoryTotals = new Map<string, number>();
    let total = 0;

    transactions.forEach((t) => {
      const current = categoryTotals.get(t.category) || 0;
      categoryTotals.set(t.category, current + t.amount);
      total += t.amount;
    });

    return Array.from(categoryTotals.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  private buildGoalsSummary(goals: any[]): GoalSummary[] {
    return goals.map((goal) => {
      const monthsRemaining = this.getMonthsRemaining(
        new Date(),
        new Date(goal.targetDate),
      );
      const amountRemaining = goal.targetAmount - goal.currentAmount;
      const monthlyContribution =
        monthsRemaining > 0 ? amountRemaining / monthsRemaining : 0;

      const onTrack =
        goal.currentAmount >= (goal.targetAmount * this.getProgressPercentage(
          new Date(goal.startDate),
          new Date(),
          new Date(goal.targetDate),
        )) / 100;

      return {
        id: goal.id,
        category: goal.category,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        targetDate: new Date(goal.targetDate),
        monthlyContribution,
        onTrack,
      };
    });
  }

  private buildRiskProfile(
    userProfile: any,
    snapshot: FinancialSnapshot,
  ): RiskProfile {
    const age = userProfile?.dateOfBirth
      ? new Date().getFullYear() - new Date(userProfile.dateOfBirth).getFullYear()
      : 30;

    const hasEmergencyFund = snapshot.totalSavings >= snapshot.totalExpenses * 3;

    // Determine job stability based on income consistency
    const jobStability: 'high' | 'medium' | 'low' =
      snapshot.totalIncome > snapshot.totalExpenses * 2 ? 'high' : 'medium';

    return {
      level: userProfile?.riskProfile || 'moderate',
      age,
      dependents: 0, // TODO: Add dependents to user profile
      hasEmergencyFund,
      jobStability,
    };
  }

  private getMonthsRemaining(start: Date, end: Date): number {
    const months =
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth());
    return Math.max(0, months);
  }

  private getProgressPercentage(start: Date, current: Date, end: Date): number {
    const totalDuration = end.getTime() - start.getTime();
    const elapsed = current.getTime() - start.getTime();
    return totalDuration > 0 ? Math.round((elapsed / totalDuration) * 100) : 0;
  }
}
