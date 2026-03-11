/**
 * Simulation Type Enum
 */
export enum SimulationType {
  MONTE_CARLO = "MONTE_CARLO",
  WHAT_IF = "WHAT_IF",
  STRESS_TEST = "STRESS_TEST",
}

/**
 * Simulation Status Enum
 */
export enum SimulationStatus {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

/**
 * Monte Carlo simulation input parameters
 */
export interface SimulationInputParameters {
  initialAmount: number;
  monthlyContribution: number;
  durationMonths: number;
  expectedAnnualReturn: number;
  riskLevel: "conservative" | "moderate" | "aggressive";
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
    const monthlyVolatility = this.getVolatilityForRisk(
      this.inputParameters.riskLevel,
    );
    const finalValues: number[] = [];

    for (let i = 0; i < iterations; i++) {
      let portfolioValue = initialAmount;
      for (let month = 0; month < durationMonths; month++) {
        // Box-Muller transform for normal distribution
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

        const monthlyReturnSimulated = monthlyReturn + monthlyVolatility * z;
        portfolioValue =
          portfolioValue * (1 + monthlyReturnSimulated) + monthlyContribution;
      }

      // Adjust for inflation
      const inflationMultiplier = Math.pow(
        1 + inflationRate,
        durationMonths / 12,
      );
      portfolioValue = portfolioValue / inflationMultiplier;
      finalValues.push(Math.round(portfolioValue * 100) / 100);
    }

    finalValues.sort((a, b) => a - b);

    const percentile = (arr: number[], p: number) =>
      arr[Math.floor((arr.length * p) / 100)];
    const mean = finalValues.reduce((a, b) => a + b, 0) / finalValues.length;
    const variance =
      finalValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
      finalValues.length;

    return {
      projectedValues: finalValues.filter(
        (_, i) => i % Math.ceil(iterations / 100) === 0,
      ), // sample 100 points
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
      case "conservative":
        return 0.02;
      case "moderate":
        return 0.04;
      case "aggressive":
        return 0.07;
      default:
        return 0.04;
    }
  }

  /**
   * Run a What-If scenario simulation.
   * Compares multiple deterministic projections side-by-side based on
   * alternate contribution/return/duration assumptions embedded in `metadata`.
   */
  runWhatIfSimulation(): SimulationResults {
    const {
      initialAmount,
      monthlyContribution,
      durationMonths,
      expectedAnnualReturn,
      inflationRate = 0.06,
    } = this.inputParameters;

    // Scenarios: base | optimistic (+2% return) | conservative (-2% return) | stretch (2x contribution)
    const scenarios: Array<{
      label: string;
      rate: number;
      contribution: number;
    }> = [
      {
        label: "base",
        rate: expectedAnnualReturn,
        contribution: monthlyContribution,
      },
      {
        label: "optimistic",
        rate: expectedAnnualReturn + 0.02,
        contribution: monthlyContribution,
      },
      {
        label: "conservative",
        rate: Math.max(expectedAnnualReturn - 0.02, 0.01),
        contribution: monthlyContribution,
      },
      {
        label: "stretch",
        rate: expectedAnnualReturn,
        contribution: monthlyContribution * 1.5,
      },
    ];

    const project = (rate: number, contribution: number): number => {
      const mr = rate / 12;
      let val = initialAmount;
      for (let m = 0; m < durationMonths; m++) {
        val = val * (1 + mr) + contribution;
      }
      return val / Math.pow(1 + inflationRate, durationMonths / 12);
    };

    const results = scenarios.map(
      (s) => Math.round(project(s.rate, s.contribution) * 100) / 100,
    );
    const sorted = [...results].sort((a, b) => a - b);
    const mean = results.reduce((a, b) => a + b, 0) / results.length;
    const variance =
      results.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / results.length;

    return {
      projectedValues: results,
      percentile10: sorted[0],
      percentile25: sorted[Math.floor(sorted.length * 0.25)],
      percentile50: sorted[Math.floor(sorted.length * 0.5)],
      percentile75: sorted[Math.floor(sorted.length * 0.75)],
      percentile90: sorted[sorted.length - 1],
      bestCase: sorted[sorted.length - 1],
      worstCase: sorted[0],
      median: sorted[Math.floor(sorted.length * 0.5)],
      mean: Math.round(mean * 100) / 100,
      standardDeviation: Math.round(Math.sqrt(variance) * 100) / 100,
      metadata: {
        scenarios: scenarios.map((s, i) => ({
          label: s.label,
          projectedValue: results[i],
          annualReturn: s.rate,
          monthlyContribution: s.contribution,
        })),
      },
    } as SimulationResults & { metadata?: any };
  }

  /**
   * Run a Stress Test simulation.
   * Applies historical market crash scenarios (2008 GFC, 2020 COVID)
   * with severely degraded return rates and elevated volatility.
   */
  runStressTestSimulation(): SimulationResults {
    const {
      initialAmount,
      monthlyContribution,
      durationMonths,
      inflationRate = 0.06,
    } = this.inputParameters;

    // Stress scenarios
    const stressScenarios = [
      {
        label: "2008_gfc",
        annualReturn: -0.4,
        recoveryMonths: 36,
        volatility: 0.12,
      },
      {
        label: "2020_covid",
        annualReturn: -0.35,
        recoveryMonths: 12,
        volatility: 0.1,
      },
      {
        label: "prolonged_bear",
        annualReturn: -0.15,
        recoveryMonths: 60,
        volatility: 0.08,
      },
      {
        label: "stagflation",
        annualReturn: 0.02,
        recoveryMonths: 0,
        volatility: 0.06,
      },
    ];

    const runStressed = (
      annualReturn: number,
      recoveryMonths: number,
      vol: number,
    ): number => {
      const crashMonths = Math.min(12, durationMonths);
      const recovMonths = Math.min(
        recoveryMonths,
        durationMonths - crashMonths,
      );
      const normalMonths = durationMonths - crashMonths - recovMonths;

      let val = initialAmount;
      const phase = (months: number, rate: number, v: number) => {
        const mr = rate / 12;
        for (let m = 0; m < months; m++) {
          const u1 = Math.max(1e-10, Math.random());
          const u2 = Math.random();
          const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
          val = val * (1 + mr + v * z) + monthlyContribution;
        }
      };

      phase(crashMonths, annualReturn, vol);
      // Recovery phase — gradual rebound (half of normal return)
      const normalReturn = this.inputParameters.expectedAnnualReturn || 0.12;
      phase(recovMonths, normalReturn * 0.5, vol * 0.5);
      phase(
        normalMonths,
        normalReturn,
        this.getVolatilityForRisk(this.inputParameters.riskLevel),
      );

      return (
        Math.round(
          (val / Math.pow(1 + inflationRate, durationMonths / 12)) * 100,
        ) / 100
      );
    };

    const iterations = 200;
    const allFinalValues: number[] = [];
    for (const scenario of stressScenarios) {
      for (let i = 0; i < iterations / stressScenarios.length; i++) {
        allFinalValues.push(
          runStressed(
            scenario.annualReturn,
            scenario.recoveryMonths,
            scenario.volatility,
          ),
        );
      }
    }

    allFinalValues.sort((a, b) => a - b);
    const percentile = (arr: number[], p: number) =>
      arr[Math.floor((arr.length * p) / 100)];
    const mean =
      allFinalValues.reduce((a, b) => a + b, 0) / allFinalValues.length;
    const variance =
      allFinalValues.reduce((s, v) => s + Math.pow(v - mean, 2), 0) /
      allFinalValues.length;

    return {
      projectedValues: allFinalValues.filter((_, i) => i % 2 === 0),
      percentile10: percentile(allFinalValues, 10),
      percentile25: percentile(allFinalValues, 25),
      percentile50: percentile(allFinalValues, 50),
      percentile75: percentile(allFinalValues, 75),
      percentile90: percentile(allFinalValues, 90),
      bestCase: allFinalValues[allFinalValues.length - 1],
      worstCase: allFinalValues[0],
      median: percentile(allFinalValues, 50),
      mean: Math.round(mean * 100) / 100,
      standardDeviation: Math.round(Math.sqrt(variance) * 100) / 100,
      stressScenarios: stressScenarios.map((s) => s.label),
    } as SimulationResults & { stressScenarios?: string[] };
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
