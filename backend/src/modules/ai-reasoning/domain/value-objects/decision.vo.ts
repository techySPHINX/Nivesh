/**
 * AI Decision Types and Value Objects
 */

export enum QueryType {
  AFFORDABILITY = 'AFFORDABILITY',
  GOAL_PROJECTION = 'GOAL_PROJECTION',
  BUDGET_OPTIMIZATION = 'BUDGET_OPTIMIZATION',
  INVESTMENT_ADVICE = 'INVESTMENT_ADVICE',
  DEBT_MANAGEMENT = 'DEBT_MANAGEMENT',
  GENERAL_ADVICE = 'GENERAL_ADVICE',
}

export enum ConfidenceLevel {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export interface ReasoningStep {
  step: number;
  description: string;
  data: Record<string, any>;
  conclusion: string;
}

export class Decision {
  constructor(
    public readonly id: string,
    public readonly queryType: QueryType,
    public readonly query: string,
    public readonly answer: string,
    public readonly reasoning: ReasoningStep[],
    public readonly confidence: ConfidenceLevel,
    public readonly recommendations: string[],
    public readonly warnings: string[],
    public readonly metadata: Record<string, any>,
    public readonly generatedAt: Date = new Date(),
  ) { }

  /**
   * Factory method to create Decision from AI response
   */
  static createFromAI(params: {
    query: string;
    queryType: QueryType;
    answer: string;
    reasoning: Array<{ step: string; data: string }>;
    recommendations: string[];
    warnings: string[];
    confidence: ConfidenceLevel;
    dataCitations: string[];
  }): Decision {
    // Convert simple reasoning to structured format
    const reasoningSteps: ReasoningStep[] = params.reasoning.map((r, index) => ({
      step: index + 1,
      description: r.step,
      data: r.data ? { details: r.data } : {},
      conclusion: '',
    }));

    return new Decision(
      `decision_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      params.queryType,
      params.query,
      params.answer,
      reasoningSteps,
      params.confidence,
      params.recommendations,
      params.warnings,
      {
        dataCitations: params.dataCitations,
        source: 'AI',
      },
    );
  }

  isHighConfidence(): boolean {
    return this.confidence === ConfidenceLevel.HIGH;
  }

  hasWarnings(): boolean {
    return this.warnings.length > 0;
  }

  // Serialize for API response
  toResponse(): Record<string, any> {
    return {
      id: this.id,
      type: this.queryType,
      query: this.query,
      answer: this.answer,
      reasoning: this.reasoning,
      confidence: this.confidence,
      recommendations: this.recommendations,
      warnings: this.warnings,
      generatedAt: this.generatedAt.toISOString(),
    };
  }
}
