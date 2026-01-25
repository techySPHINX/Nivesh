import { Tool } from '../types/agent.types';

/**
 * Savings Rate Calculation Tool
 * Calculates monthly savings required to achieve a financial goal.
 *
 * Formula: Monthly Savings = FV / [((1 + r)^n - 1) / r]
 * Where:
 * - FV = Future Value (goal amount)
 * - r = Monthly return rate
 * - n = Number of months
 *
 * Considers:
 * - Compound interest on savings
 * - Existing corpus
 * - Expected returns
 * - Inflation adjustment
 *
 * Example:
 * Goal: ₹50,00,000
 * Timeline: 5 years (60 months)
 * Expected returns: 12% p.a.
 * Current savings: ₹5,00,000
 * Required monthly: ₹65,432
 *
 * @tool calculate_savings_rate
 */

interface SavingsRateInput {
  goalAmount: number;           // Target amount to achieve
  timelineMonths: number;       // Timeline in months
  expectedReturn: number;       // Expected annual return (%)
  currentSavings?: number;      // Existing corpus (optional)
  inflationRate?: number;       // Annual inflation rate (%) (optional)
}

interface SavingsRateResult {
  monthlySavingsRequired: number;     // Required monthly savings
  totalInvestment: number;            // Total amount to be invested
  expectedCorpus: number;             // Expected final corpus
  goalAmount: number;                 // Original goal amount
  inflationAdjustedGoal: number;      // Goal adjusted for inflation
  currentSavings: number;             // Starting corpus
  timeline: {
    months: number;
    years: number;
  };
  returns: {
    annualRate: number;
    monthlyRate: number;
    totalReturns: number;
  };
  yearlyProjection: Array<{
    year: number;
    invested: number;
    returns: number;
    corpus: number;
  }>;
}

export const calculateSavingsRateTool: Tool = {
  name: 'calculate_savings_rate',
  description: 'Calculate monthly savings required to achieve a financial goal with compound interest',
  schema: {
    type: 'object',
    properties: {
      goalAmount: {
        type: 'number',
        description: 'Target amount to achieve in rupees',
        minimum: 1000,
        maximum: 1000000000,
      },
      timelineMonths: {
        type: 'number',
        description: 'Timeline to achieve goal in months',
        minimum: 1,
        maximum: 600, // 50 years max
      },
      expectedReturn: {
        type: 'number',
        description: 'Expected annual return in percentage (e.g., 12 for 12%)',
        minimum: 0,
        maximum: 50,
      },
      currentSavings: {
        type: 'number',
        description: 'Existing corpus in rupees (optional)',
        minimum: 0,
        default: 0,
      },
      inflationRate: {
        type: 'number',
        description: 'Annual inflation rate in percentage (optional)',
        minimum: 0,
        maximum: 20,
        default: 6,
      },
    },
    required: ['goalAmount', 'timelineMonths', 'expectedReturn'],
  },
  handler: async (args: SavingsRateInput): Promise<SavingsRateResult> => {
    const {
      goalAmount,
      timelineMonths,
      expectedReturn,
      currentSavings = 0,
      inflationRate = 6,
    } = args;

    // Validate inputs
    if (goalAmount <= 0) {
      throw new Error('Goal amount must be greater than 0');
    }
    if (timelineMonths <= 0) {
      throw new Error('Timeline must be greater than 0');
    }
    if (expectedReturn < 0) {
      throw new Error('Expected return cannot be negative');
    }

    // Calculate inflation-adjusted goal
    const yearsToGoal = timelineMonths / 12;
    const inflationAdjustedGoal = goalAmount * Math.pow(1 + inflationRate / 100, yearsToGoal);

    // Calculate monthly return rate
    const monthlyReturnRate = expectedReturn / 12 / 100;

    // Future value of current savings
    const futureValueOfCurrentSavings =
      currentSavings * Math.pow(1 + monthlyReturnRate, timelineMonths);

    // Remaining amount to accumulate
    const remainingAmount = inflationAdjustedGoal - futureValueOfCurrentSavings;

    // Calculate monthly savings using FV of annuity formula
    // FV = PMT × [((1 + r)^n - 1) / r]
    // PMT = FV / [((1 + r)^n - 1) / r]
    let monthlySavingsRequired = 0;

    if (monthlyReturnRate === 0) {
      // No returns case
      monthlySavingsRequired = remainingAmount / timelineMonths;
    } else {
      const annuityFactor =
        (Math.pow(1 + monthlyReturnRate, timelineMonths) - 1) / monthlyReturnRate;
      monthlySavingsRequired = remainingAmount / annuityFactor;
    }

    // Ensure non-negative
    monthlySavingsRequired = Math.max(0, monthlySavingsRequired);

    const totalInvestment = monthlySavingsRequired * timelineMonths + currentSavings;

    // Calculate expected corpus
    const expectedCorpus =
      futureValueOfCurrentSavings +
      monthlySavingsRequired *
        ((Math.pow(1 + monthlyReturnRate, timelineMonths) - 1) / monthlyReturnRate);

    const totalReturns = expectedCorpus - totalInvestment;

    // Generate yearly projection
    const yearlyProjection = [];
    let cumulativeInvested = currentSavings;
    let cumulativeCorpus = currentSavings;

    for (let year = 1; year <= Math.ceil(yearsToGoal); year++) {
      const monthsInYear = Math.min(12, timelineMonths - (year - 1) * 12);

      // Invested this year
      const yearlyInvestment = monthlySavingsRequired * monthsInYear;
      cumulativeInvested += yearlyInvestment;

      // Corpus grows with monthly contributions and returns
      for (let month = 1; month <= monthsInYear; month++) {
        cumulativeCorpus =
          cumulativeCorpus * (1 + monthlyReturnRate) + monthlySavingsRequired;
      }

      yearlyProjection.push({
        year,
        invested: Math.round(cumulativeInvested),
        returns: Math.round(cumulativeCorpus - cumulativeInvested),
        corpus: Math.round(cumulativeCorpus),
      });
    }

    return {
      monthlySavingsRequired: Math.round(monthlySavingsRequired),
      totalInvestment: Math.round(totalInvestment),
      expectedCorpus: Math.round(expectedCorpus),
      goalAmount,
      inflationAdjustedGoal: Math.round(inflationAdjustedGoal),
      currentSavings,
      timeline: {
        months: timelineMonths,
        years: parseFloat(yearsToGoal.toFixed(1)),
      },
      returns: {
        annualRate: expectedReturn,
        monthlyRate: parseFloat((monthlyReturnRate * 100).toFixed(4)),
        totalReturns: Math.round(totalReturns),
      },
      yearlyProjection,
    };
  },
};
