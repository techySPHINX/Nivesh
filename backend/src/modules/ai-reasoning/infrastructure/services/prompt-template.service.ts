import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { FinancialContext } from '../../domain/value-objects/financial-context.vo';

export enum PromptType {
  AFFORDABILITY = 'AFFORDABILITY',
  GOAL_PROJECTION = 'GOAL_PROJECTION',
  BUDGET_OPTIMIZATION = 'BUDGET_OPTIMIZATION',
  GENERAL_ADVICE = 'GENERAL_ADVICE',
}

/**
 * Prompt Template Service
 * Manages AI prompt construction with context injection
 * 
 * Features:
 * - Template-based prompt generation
 * - Context variable substitution
 * - Privacy-safe data formatting
 * - Consistent prompt structure
 */
@Injectable()
export class PromptTemplateService {
  private readonly logger = new Logger(PromptTemplateService.name);
  private systemPrompt: string;

  constructor() {
    this.loadSystemPrompt();
  }

  /**
   * Build affordability assessment prompt
   */
  buildAffordabilityPrompt(params: {
    context: FinancialContext;
    expenseDescription: string;
    amount: number;
    frequency: 'one-time' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  }): string {
    const { context, expenseDescription, amount, frequency } = params;

    const contextStr = this.formatFinancialContext(context);

    return `
**Context:**
${contextStr}

**Question:**
Can the user afford: ${expenseDescription} costing ₹${amount.toLocaleString('en-IN')} (${frequency})?

**Analysis Required:**
1. Calculate monthly budget impact
2. Assess against disposable income
3. Check emergency fund status
4. Evaluate impact on existing goals
5. Consider debt situation
6. Factor in risk profile

**Provide:**
- Clear yes/no/conditional answer
- Detailed reasoning with numbers
- Budget impact percentage
- Goal achievement implications
- Specific recommendations
- Alternative options if unaffordable
`.trim();
  }

  /**
   * Build goal projection prompt
   */
  buildGoalProjectionPrompt(params: {
    context: FinancialContext;
    goalName: string;
    targetAmount: number;
    currentAmount: number;
    monthlyContribution: number;
  }): string {
    const { context, goalName, targetAmount, currentAmount, monthlyContribution } = params;

    const contextStr = this.formatFinancialContext(context);
    const remaining = targetAmount - currentAmount;

    return `
**Context:**
${contextStr}

**Goal Details:**
- Goal Name: ${goalName}
- Target Amount: ₹${targetAmount.toLocaleString('en-IN')}
- Current Savings: ₹${currentAmount.toLocaleString('en-IN')}
- Remaining: ₹${remaining.toLocaleString('en-IN')}
- Monthly Contribution: ₹${monthlyContribution.toLocaleString('en-IN')}

**Analysis Required:**
1. Calculate months to goal completion
2. Assess contribution sustainability
3. Project with reasonable returns (6-8% for conservative)
4. Identify acceleration opportunities
5. Check for risks or delays

**Provide:**
- Projected achievement date
- Milestones timeline (25%, 50%, 75%, 100%)
- Contribution optimization tips
- Risk factors that could delay achievement
- Strategies to achieve goal faster
`.trim();
  }

  /**
   * Build budget optimization prompt
   */
  buildBudgetOptimizationPrompt(params: {
    context: FinancialContext;
    targetSavingsRate: number;
  }): string {
    const { context, targetSavingsRate } = params;

    const contextStr = this.formatFinancialContext(context);
    const snapshot = context.toAIContext();

    return `
**Context:**
${contextStr}

**Current Situation:**
- Monthly Income: ₹${snapshot.totalIncome.toLocaleString('en-IN')}
- Monthly Expenses: ₹${snapshot.totalExpenses.toLocaleString('en-IN')}
- Current Savings Rate: ${snapshot.savingsRate}%
- Target Savings Rate: ${targetSavingsRate}%
- Top Spending Categories: ${this.formatTopCategories(snapshot.categorySpending)}

**Optimization Goals:**
- Increase savings rate from ${snapshot.savingsRate}% to ${targetSavingsRate}%
- Identify unnecessary expenses
- Reallocate funds to goals

**Provide:**
1. Category-wise spending analysis
2. Overspending categories with benchmarks
3. Specific cut suggestions with amounts (e.g., "Reduce dining out from ₹8,000 to ₹5,000")
4. Reallocation strategy to goals
5. Expected timeline to reach target savings rate
6. Quick wins for immediate impact
`.trim();
  }

  /**
   * Build general financial advice prompt
   */
  buildGeneralAdvicePrompt(params: {
    context: FinancialContext;
    question: string;
  }): string {
    const { context, question } = params;

    const contextStr = this.formatFinancialContext(context);

    return `
**Context:**
${contextStr}

**User Question:**
${question}

**Instructions:**
Provide clear, actionable financial advice considering the user's complete financial situation.
Focus on practical steps they can take immediately.
Include warnings if the question involves risky decisions.
Suggest alternatives when appropriate.
`.trim();
  }

  /**
   * Get system prompt
   */
  getSystemPrompt(): string {
    return this.systemPrompt;
  }

  // ========================================
  // Private Helper Methods
  // ========================================

  private loadSystemPrompt(): void {
    try {
      const promptsPath = join(__dirname, '../prompts/system-prompts.md');
      const content = readFileSync(promptsPath, 'utf-8');

      // Extract base financial advisor prompt (first section)
      const sections = content.split('---');
      this.systemPrompt = sections[0].trim();

      this.logger.log('System prompt loaded successfully');
    } catch (error) {
      this.logger.error(`Failed to load system prompt: ${error.message}`);
      // Fallback to inline prompt
      this.systemPrompt = this.getFallbackSystemPrompt();
    }
  }

  private formatFinancialContext(context: FinancialContext): string {
    const snapshot = context.toAIContext();

    return `
**Financial Snapshot:**
- Monthly Income: ₹${snapshot.totalIncome.toLocaleString('en-IN')}
- Monthly Expenses: ₹${snapshot.totalExpenses.toLocaleString('en-IN')}
- Monthly Savings: ₹${snapshot.totalSavings.toLocaleString('en-IN')}
- Savings Rate: ${snapshot.savingsRate}%
- Total Investments: ₹${snapshot.totalInvestments.toLocaleString('en-IN')}
- Total Debt: ₹${snapshot.totalDebt.toLocaleString('en-IN')}
- Debt-to-Income Ratio: ${snapshot.debtToIncomeRatio}%

**Goals Summary:**
${this.formatGoals(snapshot.goals)}

**Risk Profile:**
- Age Group: ${snapshot.riskProfile.ageGroup}
- Dependents: ${snapshot.riskProfile.dependents}
- Emergency Fund: ${snapshot.riskProfile.emergencyFund}
- Job Stability: ${snapshot.riskProfile.jobStability}
- Risk Tolerance: ${snapshot.riskProfile.riskTolerance}

**Spending Breakdown:**
${this.formatCategorySpending(snapshot.categorySpending)}
`.trim();
  }

  private formatGoals(goals: Array<{ name: string; target: number; current: number; onTrack: boolean }>): string {
    if (goals.length === 0) {
      return '- No active goals';
    }

    return goals
      .map((goal) => {
        const progress = (goal.current / goal.target) * 100;
        const status = goal.onTrack ? '✓ On track' : '⚠ At risk';
        return `- ${goal.name}: ₹${goal.current.toLocaleString('en-IN')} / ₹${goal.target.toLocaleString('en-IN')} (${progress.toFixed(0)}%) - ${status}`;
      })
      .join('\n');
  }

  private formatCategorySpending(spending: Array<{ category: string; amount: number; percentage: number }>): string {
    if (spending.length === 0) {
      return '- No spending data available';
    }

    return spending
      .map((item) => `- ${item.category}: ₹${item.amount.toLocaleString('en-IN')} (${item.percentage.toFixed(1)}%)`)
      .join('\n');
  }

  private formatTopCategories(spending: Array<{ category: string; amount: number; percentage: number }>): string {
    return spending
      .slice(0, 3)
      .map((item) => item.category)
      .join(', ');
  }

  private getFallbackSystemPrompt(): string {
    return `
You are Nivesh AI, a trusted financial advisor helping Indians make smart money decisions.

**Core Principles:**
- Be transparent and explainable in all recommendations
- Consider user's complete financial context before advising
- Prioritize financial security (emergency fund, debt management)
- Align advice with user's goals and risk profile
- Use clear, jargon-free language
- Provide step-by-step reasoning
- Include warnings for risky decisions

**Response Structure:**
1. Direct answer to the question
2. Step-by-step reasoning
3. Specific recommendations
4. Warnings (if any)
5. Alternative approaches (if applicable)

**Indian Context:**
- All amounts in INR (₹)
- Consider Indian tax implications
- Reference Indian investment vehicles when appropriate

**Safety Guardrails:**
- Never recommend specific stocks or securities
- Don't guarantee returns or market predictions
- Always disclose limitations and uncertainties
`.trim();
  }
}
