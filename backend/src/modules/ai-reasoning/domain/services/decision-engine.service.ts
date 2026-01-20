/**
 * Decision Engine Service
 * Core business logic for financial decision-making
 */

import { Injectable } from '@nestjs/common';
import { FinancialContext } from '../value-objects/financial-context.vo';
import {
  Decision,
  QueryType,
  ConfidenceLevel,
  ReasoningStep,
} from '../value-objects/decision.vo';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DecisionEngineService {
  /**
   * Evaluate affordability of an expense
   */
  async evaluateAffordability(
    context: FinancialContext,
    expense: { amount: number; frequency: 'once' | 'monthly'; description: string },
  ): Promise<Decision> {
    const reasoning: ReasoningStep[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Step 1: Calculate monthly impact
    const monthlyImpact =
      expense.frequency === 'monthly' ? expense.amount : expense.amount / 12;

    reasoning.push({
      step: 1,
      description: 'Calculate monthly financial impact',
      data: {
        expenseAmount: expense.amount,
        frequency: expense.frequency,
        monthlyImpact,
      },
      conclusion: `This expense would impact your monthly budget by ₹${monthlyImpact.toFixed(0)}`,
    });

    // Step 2: Check disposable income
    const disposableIncome = context.getDisposableIncome();
    const impactPercentage = (monthlyImpact / disposableIncome) * 100;

    reasoning.push({
      step: 2,
      description: 'Compare with disposable income',
      data: {
        disposableIncome,
        monthlyImpact,
        impactPercentage: impactPercentage.toFixed(1),
      },
      conclusion: `This represents ${impactPercentage.toFixed(1)}% of your disposable income`,
    });

    // Step 3: Check emergency fund
    const hasEmergencyFund = context.hasEmergencyFund();
    reasoning.push({
      step: 3,
      description: 'Assess financial buffer',
      data: {
        hasEmergencyFund,
        currentSavings: context.snapshot.totalSavings,
        threeMonthsExpenses: context.snapshot.totalExpenses * 3,
      },
      conclusion: hasEmergencyFund
        ? 'You have adequate emergency savings'
        : 'Your emergency fund needs attention',
    });

    // Step 4: Check goal impact
    const affectedGoals = this.checkGoalImpact(context, monthlyImpact);
    if (affectedGoals.length > 0) {
      reasoning.push({
        step: 4,
        description: 'Evaluate impact on financial goals',
        data: {
          affectedGoals,
        },
        conclusion: `This expense may delay ${affectedGoals.length} goal(s)`,
      });
      warnings.push(
        `May delay goals: ${affectedGoals.map((g) => g.category).join(', ')}`,
      );
    }

    // Decision logic
    let answer: string;
    let confidence: ConfidenceLevel;

    if (impactPercentage < 10 && hasEmergencyFund) {
      answer = 'Yes, you can comfortably afford this expense';
      confidence = ConfidenceLevel.HIGH;
      recommendations.push('This expense fits well within your budget');
    } else if (impactPercentage < 25 && (hasEmergencyFund || affectedGoals.length === 0)) {
      answer = 'Yes, but it will require careful budgeting';
      confidence = ConfidenceLevel.MEDIUM;
      recommendations.push('Consider reducing spending in other categories');
      if (!hasEmergencyFund) {
        recommendations.push('Priority: Build emergency fund to 3 months expenses');
      }
    } else if (impactPercentage < 40) {
      answer = 'Possible, but not recommended without adjustments';
      confidence = ConfidenceLevel.MEDIUM;
      warnings.push('This expense will significantly strain your budget');
      recommendations.push('Look for ways to reduce the cost');
      recommendations.push('Consider delaying until finances improve');
    } else {
      answer = 'Not advisable with current financial situation';
      confidence = ConfidenceLevel.HIGH;
      warnings.push('This expense exceeds your financial capacity');
      recommendations.push('Build savings before considering this expense');
      recommendations.push('Explore lower-cost alternatives');
    }

    // Add context-specific recommendations
    if (context.isFinanciallyStressed()) {
      recommendations.push('Focus on reducing debt and building emergency fund first');
    }

    return new Decision(
      uuidv4(),
      QueryType.AFFORDABILITY,
      `Can I afford ${expense.description} costing ₹${expense.amount}?`,
      answer,
      reasoning,
      confidence,
      recommendations,
      warnings,
      {
        expense,
        monthlyImpact,
        impactPercentage,
      },
    );
  }

  /**
   * Project goal achievement timeline
   */
  async projectGoal(
    context: FinancialContext,
    goalParams: { targetAmount: number; currentAmount: number; monthlyContribution: number },
  ): Promise<Decision> {
    const reasoning: ReasoningStep[] = [];
    const recommendations: string[] = [];
    const warnings: string[] = [];

    const remaining = goalParams.targetAmount - goalParams.currentAmount;
    const monthsNeeded = Math.ceil(remaining / goalParams.monthlyContribution);
    const projectedDate = new Date();
    projectedDate.setMonth(projectedDate.getMonth() + monthsNeeded);

    reasoning.push({
      step: 1,
      description: 'Calculate timeline',
      data: {
        remaining,
        monthlyContribution: goalParams.monthlyContribution,
        monthsNeeded,
      },
      conclusion: `You'll need ${monthsNeeded} months at current contribution rate`,
    });

    const canAfford = context.canAfford(goalParams.monthlyContribution);
    reasoning.push({
      step: 2,
      description: 'Assess affordability',
      data: {
        disposableIncome: context.getDisposableIncome(),
        required: goalParams.monthlyContribution,
        canAfford,
      },
      conclusion: canAfford
        ? 'Monthly contribution is affordable'
        : 'Monthly contribution exceeds disposable income',
    });

    const answer = `You can achieve this goal by ${projectedDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} with monthly contributions of ₹${goalParams.monthlyContribution}`;

    const confidence = canAfford ? ConfidenceLevel.HIGH : ConfidenceLevel.MEDIUM;

    if (!canAfford) {
      warnings.push('Current contribution rate may not be sustainable');
      recommendations.push('Review and optimize monthly expenses');
    }

    return new Decision(
      uuidv4(),
      QueryType.GOAL_PROJECTION,
      `When can I achieve my goal of ₹${goalParams.targetAmount}?`,
      answer,
      reasoning,
      confidence,
      recommendations,
      warnings,
      {
        projectedDate,
        monthsNeeded,
      },
    );
  }

  private checkGoalImpact(
    context: FinancialContext,
    monthlyExpense: number,
  ): any[] {
    return context.goals.filter(
      (goal) => goal.onTrack && goal.monthlyContribution < monthlyExpense,
    );
  }
}
