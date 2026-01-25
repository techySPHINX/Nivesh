import { Tool } from '../types/agent.types';

/**
 * Monte Carlo Simulation Tool
 * Runs probabilistic simulations for investment outcomes.
 *
 * Simulates market volatility using random returns based on:
 * - Expected return (mean)
 * - Volatility (standard deviation)
 * - Normal distribution of returns
 *
 * Generates 10,000 scenarios and calculates:
 * - Best case (90th percentile)
 * - Good case (75th percentile)
 * - Expected case (50th percentile/median)
 * - Poor case (25th percentile)
 * - Worst case (10th percentile)
 *
 * Example:
 * Investment: ₹25,000/month for 10 years
 * Expected return: 12% p.a.
 * Volatility: 15%
 * Outcomes: ₹45L (p10) to ₹72L (p90)
 *
 * @tool run_monte_carlo_simulation
 */

interface MonteCarloInput {
  initialInvestment?: number;    // Starting corpus
  monthlySIP?: number;           // Monthly investment
  expectedReturn: number;        // Expected annual return (%)
  volatility: number;            // Annual volatility/std dev (%)
  timelineYears: number;         // Investment duration
  iterations?: number;           // Number of simulations (default: 10000)
  inflationRate?: number;        // Annual inflation (%)
}

interface MonteCarloResult {
  simulations: number;                // Number of iterations run
  outcomes: {
    p10: number;                      // 10th percentile (worst 10%)
    p25: number;                      // 25th percentile
    p50: number;                      // 50th percentile (median)
    p75: number;                      // 75th percentile
    p90: number;                      // 90th percentile (best 10%)
    mean: number;                     // Average outcome
    min: number;                      // Absolute worst case
    max: number;                      // Absolute best case
  };
  totalInvestment: number;            // Total amount invested
  successProbability: number;         // % of scenarios meeting goal
  riskMetrics: {
    expectedReturn: number;
    volatility: number;
    sharpeRatio: number;              // Risk-adjusted return
    valueAtRisk95: number;            // 95% VaR (5% worst loss)
  };
  distribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
}

export const runMonteCarloSimulationTool: Tool = {
  name: 'run_monte_carlo_simulation',
  description: 'Run Monte Carlo simulation to estimate investment outcome probabilities with market volatility',
  schema: {
    type: 'object',
    properties: {
      initialInvestment: {
        type: 'number',
        description: 'Starting investment corpus in rupees (optional)',
        minimum: 0,
        default: 0,
      },
      monthlySIP: {
        type: 'number',
        description: 'Monthly SIP amount in rupees (optional)',
        minimum: 0,
        default: 0,
      },
      expectedReturn: {
        type: 'number',
        description: 'Expected annual return in percentage',
        minimum: -50,
        maximum: 100,
      },
      volatility: {
        type: 'number',
        description: 'Annual volatility (standard deviation) in percentage',
        minimum: 0,
        maximum: 100,
      },
      timelineYears: {
        type: 'number',
        description: 'Investment timeline in years',
        minimum: 0.5,
        maximum: 50,
      },
      iterations: {
        type: 'number',
        description: 'Number of simulation iterations (default: 10000)',
        minimum: 1000,
        maximum: 100000,
        default: 10000,
      },
      inflationRate: {
        type: 'number',
        description: 'Annual inflation rate in percentage (optional)',
        minimum: 0,
        maximum: 20,
        default: 0,
      },
    },
    required: ['expectedReturn', 'volatility', 'timelineYears'],
  },
  handler: async (args: MonteCarloInput): Promise<MonteCarloResult> => {
    const {
      initialInvestment = 0,
      monthlySIP = 0,
      expectedReturn,
      volatility,
      timelineYears,
      iterations = 10000,
      inflationRate = 0,
    } = args;

    // Validate inputs
    if (initialInvestment === 0 && monthlySIP === 0) {
      throw new Error('Either initialInvestment or monthlySIP must be provided');
    }
    if (timelineYears <= 0) {
      throw new Error('Timeline must be greater than 0');
    }
    if (volatility < 0) {
      throw new Error('Volatility cannot be negative');
    }

    const totalMonths = timelineYears * 12;
    const totalInvestment = initialInvestment + monthlySIP * totalMonths;

    // Run simulations
    const finalValues: number[] = [];

    for (let i = 0; i < iterations; i++) {
      let corpus = initialInvestment;

      // Simulate each month
      for (let month = 1; month <= totalMonths; month++) {
        // Generate random monthly return using normal distribution
        const monthlyExpectedReturn = expectedReturn / 12 / 100;
        const monthlyVolatility = volatility / Math.sqrt(12) / 100;

        // Box-Muller transform for normal distribution
        const randomReturn = generateNormalRandom(
          monthlyExpectedReturn,
          monthlyVolatility,
        );

        // Apply return to existing corpus
        corpus *= 1 + randomReturn;

        // Add monthly SIP
        corpus += monthlySIP;
      }

      // Adjust for inflation if specified
      if (inflationRate > 0) {
        corpus /= Math.pow(1 + inflationRate / 100, timelineYears);
      }

      finalValues.push(corpus);
    }

    // Sort results for percentile calculations
    finalValues.sort((a, b) => a - b);

    // Calculate percentiles
    const outcomes = {
      p10: finalValues[Math.floor(iterations * 0.1)],
      p25: finalValues[Math.floor(iterations * 0.25)],
      p50: finalValues[Math.floor(iterations * 0.5)], // Median
      p75: finalValues[Math.floor(iterations * 0.75)],
      p90: finalValues[Math.floor(iterations * 0.9)],
      mean: finalValues.reduce((sum, val) => sum + val, 0) / iterations,
      min: finalValues[0],
      max: finalValues[iterations - 1],
    };

    // Calculate success probability (outcomes >= total investment)
    const successfulOutcomes = finalValues.filter((val) => val >= totalInvestment);
    const successProbability = (successfulOutcomes.length / iterations) * 100;

    // Calculate Sharpe Ratio (risk-adjusted return)
    // Sharpe = (Mean Return - Risk-Free Rate) / Volatility
    const averageReturn = ((outcomes.mean - totalInvestment) / totalInvestment) * 100;
    const riskFreeRate = 6; // Assume 6% risk-free rate
    const sharpeRatio = (averageReturn - riskFreeRate) / volatility;

    // Calculate Value at Risk (95%)
    const var95 = totalInvestment - outcomes.p10;

    // Create distribution buckets
    const distribution = createDistribution(finalValues, totalInvestment);

    return {
      simulations: iterations,
      outcomes: {
        p10: Math.round(outcomes.p10),
        p25: Math.round(outcomes.p25),
        p50: Math.round(outcomes.p50),
        p75: Math.round(outcomes.p75),
        p90: Math.round(outcomes.p90),
        mean: Math.round(outcomes.mean),
        min: Math.round(outcomes.min),
        max: Math.round(outcomes.max),
      },
      totalInvestment: Math.round(totalInvestment),
      successProbability: parseFloat(successProbability.toFixed(2)),
      riskMetrics: {
        expectedReturn,
        volatility,
        sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
        valueAtRisk95: Math.round(var95),
      },
      distribution,
    };
  },
};

/**
 * Generate random number from normal distribution
 * Using Box-Muller transform
 */
function generateNormalRandom(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();

  // Box-Muller transform
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

  return mean + z0 * stdDev;
}

/**
 * Create distribution buckets for visualization
 */
function createDistribution(
  values: number[],
  investment: number,
): Array<{ range: string; count: number; percentage: number }> {
  const buckets = [
    { range: 'Loss (< investment)', min: 0, max: investment },
    { range: '0-25% gain', min: investment, max: investment * 1.25 },
    { range: '25-50% gain', min: investment * 1.25, max: investment * 1.5 },
    { range: '50-100% gain', min: investment * 1.5, max: investment * 2 },
    { range: '100-200% gain', min: investment * 2, max: investment * 3 },
    { range: '>200% gain', min: investment * 3, max: Infinity },
  ];

  return buckets.map((bucket) => {
    const count = values.filter((v) => v >= bucket.min && v < bucket.max).length;
    return {
      range: bucket.range,
      count,
      percentage: parseFloat(((count / values.length) * 100).toFixed(1)),
    };
  });
}
