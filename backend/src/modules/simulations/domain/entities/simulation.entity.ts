/**
 * Simulation Type Enum
 */
export enum SimulationType {
  MONTE_CARLO = 'MONTE_CARLO',
  WHAT_IF = 'WHAT_IF',
  STRESS_TEST = 'STRESS_TEST',
}

/**
 * Simulation Status Enum
 */
export enum SimulationStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

/**
 * Monte Carlo simulation input parameters
 */
export interface SimulationInputParameters {
  initialAmount: number;
  monthlyContribution: number;
  durationMonths: number;
  expectedAnnualReturn: number;
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
  inflationRate?: number;
  iterations?: number;
}

/**
 * Simulation results object
 */
export interface SimulationResults {
  projectedValues: number[];
  percentile10: number;
  percentile25: number;
  percentile50: number;
  percentile75: number;
  percentile90: number;
  bestCase: number;
  worstCase: number;
  median: number;
  mean: number;
  standardDeviation: number;
  probabilityOfGoal?: number;
}

/**
 * Simulation Entity
 */
export class Simulation {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public name: string,
    public type: SimulationType,
    public scenario: string | null,
    public inputParameters: SimulationInputParameters,
    public results: SimulationResults | null,
    public status: SimulationStatus,
    public metadata: Record<string, any> | null,
    public readonly createdAt: Date,
    public completedAt: Date | null,
  ) {}

  static create(params: {
    id: string;
    userId: string;
    name: string;
    type: SimulationType;
    scenario?: string;
    inputParameters: SimulationInputParameters;
    metadata?: Record<string, any>;
  }): Simulation {
    return new Simulation(
      params.id,
      params.userId,
      params.name,
      params.type,
      params.scenario || null,
      params.inputParameters,
      null,
      SimulationStatus.PENDING,
      params.metadata || null,
      new Date(),
      null,
    );
  }

  markRunning(): void {
    if (this.status !== SimulationStatus.PENDING) {
      throw new Error(`Cannot start simulation in ${this.status} status`);
    }
    this.status = SimulationStatus.RUNNING;
  }

  complete(results: SimulationResults): void {
    this.status = SimulationStatus.COMPLETED;
    this.results = results;
    this.completedAt = new Date();
  }

  fail(): void {
    this.status = SimulationStatus.FAILED;
    this.completedAt = new Date();
  }

  isCompleted(): boolean {
    return this.status === SimulationStatus.COMPLETED;
  }

  /**
   * Run a basic Monte Carlo simulation.
   * For production, this should delegate to the ML service.
   */
  runMonteCarloSimulation(): SimulationResults {
    const {
      initialAmount,
      monthlyContribution,
      durationMonths,
      expectedAnnualReturn,
      inflationRate = 0.06,
      iterations = 1000,
    } = this.inputParameters;

    const monthlyReturn = expectedAnnualReturn / 12;
    const monthlyVolatility = this.getVolatilityForRisk(this.inputParameters.riskLevel);
    const finalValues: number[] = [];

    for (let i = 0; i < iterations; i++) {
      let portfolioValue = initialAmount;
      for (let month = 0; month < durationMonths; month++) {
        // Box-Muller transform for normal distribution
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

        const monthlyReturnSimulated = monthlyReturn + monthlyVolatility * z;
        portfolioValue = portfolioValue * (1 + monthlyReturnSimulated) + monthlyContribution;
      }

      // Adjust for inflation
      const inflationMultiplier = Math.pow(1 + inflationRate, durationMonths / 12);
      portfolioValue = portfolioValue / inflationMultiplier;
      finalValues.push(Math.round(portfolioValue * 100) / 100);
    }

    finalValues.sort((a, b) => a - b);

    const percentile = (arr: number[], p: number) => arr[Math.floor(arr.length * p / 100)];
    const mean = finalValues.reduce((a, b) => a + b, 0) / finalValues.length;
    const variance =
      finalValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / finalValues.length;

    return {
      projectedValues: finalValues.filter((_, i) => i % Math.ceil(iterations / 100) === 0), // sample 100 points
      percentile10: percentile(finalValues, 10),
      percentile25: percentile(finalValues, 25),
      percentile50: percentile(finalValues, 50),
      percentile75: percentile(finalValues, 75),
      percentile90: percentile(finalValues, 90),
      bestCase: finalValues[finalValues.length - 1],
      worstCase: finalValues[0],
      median: percentile(finalValues, 50),
      mean: Math.round(mean * 100) / 100,
      standardDeviation: Math.round(Math.sqrt(variance) * 100) / 100,
    };
  }

  private getVolatilityForRisk(riskLevel: string): number {
    switch (riskLevel) {
      case 'conservative':
        return 0.02;
      case 'moderate':
        return 0.04;
      case 'aggressive':
        return 0.07;
      default:
        return 0.04;
    }
  }

  static fromPersistence(data: any): Simulation {
    return new Simulation(
      data.id,
      data.userId,
      data.name,
      data.type as SimulationType,
      data.scenario,
      data.inputParameters as SimulationInputParameters,
      data.results as SimulationResults | null,
      data.status as SimulationStatus,
      data.metadata,
      data.createdAt,
      data.completedAt,
    );
  }
}
