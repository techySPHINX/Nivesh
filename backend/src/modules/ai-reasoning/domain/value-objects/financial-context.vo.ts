/**
 * Financial Context Value Object
 * Represents the anonymized financial state of a user for AI reasoning
 */

export interface FinancialSnapshot {
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  totalInvestments: number;
  totalDebt: number;
  monthlySpending: {
    category: string;
    amount: number;
    percentage: number;
  }[];
  savingsRate: number; // Percentage
  debtToIncomeRatio: number; // Percentage
}

export interface GoalSummary {
  id: string;
  category: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date;
  monthlyContribution: number;
  onTrack: boolean;
}

export interface RiskProfile {
  level: 'conservative' | 'moderate' | 'aggressive';
  age: number;
  dependents: number;
  hasEmergencyFund: boolean;
  jobStability: 'high' | 'medium' | 'low';
}

export class FinancialContext {
  constructor(
    public readonly userId: string,
    public readonly snapshot: FinancialSnapshot,
    public readonly goals: GoalSummary[],
    public readonly riskProfile: RiskProfile,
    public readonly generatedAt: Date = new Date(),
  ) { }

  // Business logic
  hasEmergencyFund(): boolean {
    const threeMonthsExpenses = this.snapshot.totalExpenses * 3;
    return this.snapshot.totalSavings >= threeMonthsExpenses;
  }

  canAfford(amount: number): boolean {
    const disposableIncome = this.snapshot.totalIncome - this.snapshot.totalExpenses;
    return disposableIncome >= amount;
  }

  getDisposableIncome(): number {
    return this.snapshot.totalIncome - this.snapshot.totalExpenses;
  }

  getNetWorth(): number {
    return (
      this.snapshot.totalSavings +
      this.snapshot.totalInvestments -
      this.snapshot.totalDebt
    );
  }

  isFinanciallyStressed(): boolean {
    return (
      this.snapshot.debtToIncomeRatio > 40 ||
      this.snapshot.savingsRate < 10 ||
      !this.hasEmergencyFund()
    );
  }

  // Serialization for AI prompts (anonymized)
  toAIContext(): Record<string, any> {
    return {
      financialState: {
        monthlyIncome: Math.round(this.snapshot.totalIncome),
        monthlyExpenses: Math.round(this.snapshot.totalExpenses),
        currentSavings: Math.round(this.snapshot.totalSavings),
        investments: Math.round(this.snapshot.totalInvestments),
        debt: Math.round(this.snapshot.totalDebt),
        savingsRate: `${this.snapshot.savingsRate}%`,
        debtRatio: `${this.snapshot.debtToIncomeRatio}%`,
      },
      spendingPattern: this.snapshot.monthlySpending.map((cat) => ({
        category: cat.category,
        amount: Math.round(cat.amount),
        share: `${cat.percentage}%`,
      })),
      goals: this.goals.map((goal) => ({
        type: goal.category,
        target: Math.round(goal.targetAmount),
        saved: Math.round(goal.currentAmount),
        deadline: goal.targetDate.toISOString().split('T')[0],
        monthlyNeed: Math.round(goal.monthlyContribution),
        status: goal.onTrack ? 'on-track' : 'at-risk',
      })),
      profile: {
        riskTolerance: this.riskProfile.level,
        age: this.riskProfile.age,
        dependents: this.riskProfile.dependents,
        hasEmergencyFund: this.hasEmergencyFund(),
      },
      metrics: {
        disposableIncome: Math.round(this.getDisposableIncome()),
        netWorth: Math.round(this.getNetWorth()),
        financialHealth: this.isFinanciallyStressed() ? 'stressed' : 'healthy',
      },
    };
  }
}
