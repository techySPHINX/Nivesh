import { Tool } from '../types/agent.types';

/**
 * Investment Returns Calculation Tool
 * Projects investment returns with compound interest.
 *
 * Handles:
 * - Lump sum investments
 * - SIP (Systematic Investment Plan)
 * - Combination of both
 * - Tax implications
 * - Inflation adjustment
 *
 * Formula (Lump Sum): FV = PV × (1 + r)^n
 * Formula (SIP): FV = PMT × [((1 + r)^n - 1) / r]
 *
 * Example:
 * Investment: ₹10,00,000 lump sum + ₹25,000/month SIP
 * Duration: 10 years
 * Expected return: 12% p.a.
 * Final corpus: ₹88,49,117
 *
 * @tool calculate_returns
 */

interface ReturnsCalculationInput {
  lumpSum?: number;              // Initial lump sum investment
  monthlySIP?: number;           // Monthly SIP amount
  annualReturn: number;          // Expected annual return (%)
  timelineYears: number;         // Investment duration in years
  taxRate?: number;              // Tax rate on gains (%) (optional)
  inflationRate?: number;        // Annual inflation rate (%) (optional)
}

interface ReturnsCalculationResult {
  finalCorpus: number;                    // Total corpus at maturity
  totalInvestment: number;                // Total amount invested
  totalReturns: number;                   // Total returns earned
  returnsPercentage: number;              // Returns as % of investment
  postTaxCorpus: number;                  // Corpus after tax
  inflationAdjustedCorpus: number;        // Real value after inflation
  breakdown: {
    lumpSumContribution: number;          // Final value from lump sum
    sipContribution: number;              // Final value from SIP
    lumpSumInvested: number;              // Initial lump sum
    sipInvested: number;                  // Total SIP invested
  };
  yearlyGrowth: Array<{
    year: number;
    invested: number;
    corpus: number;
    returns: number;
  }>;
  cagr: number;                           // Compound Annual Growth Rate
}

export const calculateReturnsTool: Tool = {
  name: 'calculate_returns',
  description: 'Calculate investment returns with compound interest for lump sum and/or SIP investments',
  schema: {
    type: 'object',
    properties: {
      lumpSum: {
        type: 'number',
        description: 'Initial lump sum investment in rupees (optional)',
        minimum: 0,
        default: 0,
      },
      monthlySIP: {
        type: 'number',
        description: 'Monthly SIP amount in rupees (optional)',
        minimum: 0,
        default: 0,
      },
      annualReturn: {
        type: 'number',
        description: 'Expected annual return in percentage (e.g., 12 for 12%)',
        minimum: -50,
        maximum: 100,
      },
      timelineYears: {
        type: 'number',
        description: 'Investment duration in years',
        minimum: 0.1,
        maximum: 50,
      },
      taxRate: {
        type: 'number',
        description: 'Tax rate on capital gains in percentage (optional)',
        minimum: 0,
        maximum: 50,
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
    required: ['annualReturn', 'timelineYears'],
  },
  handler: async (args: ReturnsCalculationInput): Promise<ReturnsCalculationResult> => {
    const {
      lumpSum = 0,
      monthlySIP = 0,
      annualReturn,
      timelineYears,
      taxRate = 0,
      inflationRate = 6,
    } = args;

    // Validate inputs
    if (lumpSum === 0 && monthlySIP === 0) {
      throw new Error('Either lumpSum or monthlySIP must be provided');
    }
    if (timelineYears <= 0) {
      throw new Error('Timeline must be greater than 0');
    }

    const monthlyReturnRate = annualReturn / 12 / 100;
    const totalMonths = timelineYears * 12;

    // Calculate lump sum growth: FV = PV × (1 + r)^n
    const lumpSumFutureValue = lumpSum * Math.pow(1 + monthlyReturnRate, totalMonths);

    // Calculate SIP growth: FV = PMT × [((1 + r)^n - 1) / r]
    let sipFutureValue = 0;
    if (monthlyReturnRate === 0) {
      sipFutureValue = monthlySIP * totalMonths;
    } else {
      sipFutureValue =
        monthlySIP *
        ((Math.pow(1 + monthlyReturnRate, totalMonths) - 1) / monthlyReturnRate);
    }

    const finalCorpus = lumpSumFutureValue + sipFutureValue;
    const totalInvestment = lumpSum + monthlySIP * totalMonths;
    const totalReturns = finalCorpus - totalInvestment;
    const returnsPercentage = (totalReturns / totalInvestment) * 100;

    // Calculate post-tax corpus
    const taxableGains = totalReturns;
    const taxAmount = (taxableGains * taxRate) / 100;
    const postTaxCorpus = finalCorpus - taxAmount;

    // Calculate inflation-adjusted corpus (real value)
    const inflationAdjustedCorpus =
      postTaxCorpus / Math.pow(1 + inflationRate / 100, timelineYears);

    // Calculate CAGR
    const cagr =
      (Math.pow(finalCorpus / totalInvestment, 1 / timelineYears) - 1) * 100;

    // Generate yearly growth projection
    const yearlyGrowth = [];
    let currentLumpSum = lumpSum;
    let currentSIPValue = 0;
    let totalSIPInvested = 0;

    for (let year = 1; year <= Math.ceil(timelineYears); year++) {
      const monthsInYear = Math.min(12, totalMonths - (year - 1) * 12);

      // Grow lump sum for this year
      currentLumpSum *= Math.pow(1 + monthlyReturnRate, monthsInYear);

      // Add SIP contributions and growth for this year
      for (let month = 1; month <= monthsInYear; month++) {
        currentSIPValue = currentSIPValue * (1 + monthlyReturnRate) + monthlySIP;
        totalSIPInvested += monthlySIP;
      }

      const yearCorpus = currentLumpSum + currentSIPValue;
      const yearInvested = lumpSum + totalSIPInvested;

      yearlyGrowth.push({
        year,
        invested: Math.round(yearInvested),
        corpus: Math.round(yearCorpus),
        returns: Math.round(yearCorpus - yearInvested),
      });
    }

    return {
      finalCorpus: Math.round(finalCorpus),
      totalInvestment: Math.round(totalInvestment),
      totalReturns: Math.round(totalReturns),
      returnsPercentage: parseFloat(returnsPercentage.toFixed(2)),
      postTaxCorpus: Math.round(postTaxCorpus),
      inflationAdjustedCorpus: Math.round(inflationAdjustedCorpus),
      breakdown: {
        lumpSumContribution: Math.round(lumpSumFutureValue),
        sipContribution: Math.round(sipFutureValue),
        lumpSumInvested: lumpSum,
        sipInvested: Math.round(monthlySIP * totalMonths),
      },
      yearlyGrowth,
      cagr: parseFloat(cagr.toFixed(2)),
    };
  },
};
