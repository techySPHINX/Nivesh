import { Tool } from '../types/agent.types';

/**
 * EMI Calculation Tool
 * Calculates Equated Monthly Installment (EMI) for loans.
 *
 * Formula: EMI = [P × R × (1+R)^N] / [(1+R)^N-1]
 * Where:
 * - P = Principal loan amount
 * - R = Monthly interest rate (annual rate / 12 / 100)
 * - N = Loan tenure in months
 *
 * Example:
 * Principal: ₹40,00,000
 * Interest: 8.5% p.a.
 * Tenure: 20 years (240 months)
 * EMI: ₹34,443
 *
 * @tool calculate_emi
 */

interface EMICalculationInput {
  principal: number;      // Loan amount in ₹
  annualRate: number;     // Annual interest rate (e.g., 8.5 for 8.5%)
  tenureMonths: number;   // Loan tenure in months
}

interface EMICalculationResult {
  emi: number;                  // Monthly EMI
  totalPayment: number;         // Total amount paid
  totalInterest: number;        // Total interest paid
  principalAmount: number;      // Original principal
  interestRate: number;         // Annual interest rate
  tenure: number;               // Tenure in months
  tenureYears: number;          // Tenure in years
  breakdown: {
    month: number;
    emi: number;
    principal: number;
    interest: number;
    balance: number;
  }[];
}

export const calculateEMITool: Tool = {
  name: 'calculate_emi',
  description: 'Calculate Equated Monthly Installment (EMI) for loans with complete amortization schedule',
  schema: {
    type: 'object',
    properties: {
      principal: {
        type: 'number',
        description: 'Principal loan amount in rupees',
        minimum: 1000,
        maximum: 100000000,
      },
      annualRate: {
        type: 'number',
        description: 'Annual interest rate in percentage (e.g., 8.5 for 8.5%)',
        minimum: 0.1,
        maximum: 50,
      },
      tenureMonths: {
        type: 'number',
        description: 'Loan tenure in months',
        minimum: 1,
        maximum: 360, // 30 years max
      },
    },
    required: ['principal', 'annualRate', 'tenureMonths'],
  },
  handler: async (args: EMICalculationInput): Promise<EMICalculationResult> => {
    const { principal, annualRate, tenureMonths } = args;

    // Validate inputs
    if (principal <= 0) {
      throw new Error('Principal must be greater than 0');
    }
    if (annualRate <= 0) {
      throw new Error('Interest rate must be greater than 0');
    }
    if (tenureMonths <= 0) {
      throw new Error('Tenure must be greater than 0');
    }

    // Calculate monthly interest rate
    const monthlyRate = annualRate / 12 / 100;

    // Calculate EMI using formula: [P × R × (1+R)^N] / [(1+R)^N-1]
    const emi = monthlyRate === 0
      ? principal / tenureMonths // No interest case
      : (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
        (Math.pow(1 + monthlyRate, tenureMonths) - 1);

    const totalPayment = emi * tenureMonths;
    const totalInterest = totalPayment - principal;

    // Generate amortization schedule
    const breakdown = [];
    let balance = principal;

    for (let month = 1; month <= tenureMonths; month++) {
      const interestPayment = balance * monthlyRate;
      const principalPayment = emi - interestPayment;
      balance -= principalPayment;

      breakdown.push({
        month,
        emi: Math.round(emi),
        principal: Math.round(principalPayment),
        interest: Math.round(interestPayment),
        balance: Math.max(0, Math.round(balance)), // Avoid negative due to rounding
      });
    }

    return {
      emi: Math.round(emi),
      totalPayment: Math.round(totalPayment),
      totalInterest: Math.round(totalInterest),
      principalAmount: principal,
      interestRate: annualRate,
      tenure: tenureMonths,
      tenureYears: parseFloat((tenureMonths / 12).toFixed(1)),
      breakdown,
    };
  },
};
