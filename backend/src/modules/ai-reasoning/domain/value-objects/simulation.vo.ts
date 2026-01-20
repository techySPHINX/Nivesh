/**
 * Simulation Scenario Value Object
 * Represents a what-if scenario for financial decisions
 */

export enum ScenarioType {
  NEW_EXPENSE = 'NEW_EXPENSE',
  INCOME_CHANGE = 'INCOME_CHANGE',
  GOAL_ADDITION = 'GOAL_ADDITION',
  INVESTMENT_INCREASE = 'INVESTMENT_INCREASE',
  DEBT_PAYOFF = 'DEBT_PAYOFF',
  LIFESTYLE_CHANGE = 'LIFESTYLE_CHANGE',
}

export interface ScenarioParameters {
  type: ScenarioType;
  changes: Record<string, any>;
  timeframeMonths: number;
}

export interface ProjectedOutcome {
  metric: string;
  current: number;
  projected: number;
  change: number;
  changePercentage: number;
}

export class SimulationResult {
  constructor(
    public readonly id: string,
    public readonly scenarioType: ScenarioType,
    public readonly parameters: ScenarioParameters,
    public readonly outcomes: ProjectedOutcome[],
    public readonly impact: 'positive' | 'neutral' | 'negative',
    public readonly feasibility: 'feasible' | 'challenging' | 'unfeasible',
    public readonly insights: string[],
    public readonly alternatives: string[],
    public readonly generatedAt: Date = new Date(),
  ) { }

  isViable(): boolean {
    return this.feasibility !== 'unfeasible' && this.impact !== 'negative';
  }

  getKeyImpacts(): ProjectedOutcome[] {
    return this.outcomes.filter((o) => Math.abs(o.changePercentage) > 10);
  }

  // Serialize for API response
  toResponse(): Record<string, any> {
    return {
      id: this.id,
      scenario: {
        type: this.scenarioType,
        parameters: this.parameters,
      },
      projections: this.outcomes,
      assessment: {
        impact: this.impact,
        feasibility: this.feasibility,
        viable: this.isViable(),
      },
      insights: this.insights,
      alternatives: this.alternatives,
      generatedAt: this.generatedAt.toISOString(),
    };
  }
}
