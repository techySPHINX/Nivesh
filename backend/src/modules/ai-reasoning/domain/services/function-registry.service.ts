import { Injectable, Logger } from '@nestjs/common';
import { FunctionDeclaration } from '@google/generative-ai';

/**
 * Financial Functions Registry
 * 
 * Defines all available tools for LLM function calling:
 * - Neo4j graph queries
 * - Financial calculations
 * - Monte Carlo simulations
 */
@Injectable()
export class FunctionRegistry {
  private readonly logger = new Logger(FunctionRegistry.name);

  /**
   * Get all registered functions for Gemini
   */
  getAllFunctions(): FunctionDeclaration[] {
    return [
      this.queryFinancialGraphFunction(),
      this.calculateEMIFunction(),
      this.runMonteCarloSimulationFunction(),
      this.calculateCompoundInterestFunction(),
      this.calculateTaxFunction(),
      this.analyzeSpendingPatternFunction(),
      this.checkGoalProgressFunction(),
      this.calculateSIPReturnsFunction(),
      this.assessLoanAffordabilityFunction(),
      this.optimizePortfolioFunction(),
    ];
  }

  /**
   * Get specific function by name
   */
  getFunction(name: string): FunctionDeclaration | undefined {
    return this.getAllFunctions().find((f) => f.name === name);
  }

  // ==========================================
  // Function Definitions
  // ==========================================

  private queryFinancialGraphFunction(): FunctionDeclaration {
    return {
      name: 'query_financial_graph',
      description: 'Query user\'s financial data from Neo4j knowledge graph to get insights about spending patterns, income stability, goal progress, or account information',
      parameters: {
        type: 'object' as any,
        properties: {
          query_type: {
            type: 'string',
            enum: ['spending_pattern', 'goal_progress', 'income_stability', 'account_summary'],
            description: 'Type of financial data to query',
          },
          filters: {
            type: 'object',
            properties: {
              date_range: {
                type: 'string',
                description: 'Date range for the query (e.g., "last_30_days", "last_6_months")',
              },
              category: {
                type: 'string',
                description: 'Transaction category to filter by (e.g., "FOOD", "TRANSPORT")',
              },
            },
          },
        },
        required: ['query_type'],
      },
    };
  }

  private calculateEMIFunction(): FunctionDeclaration {
    return {
      name: 'calculate_emi',
      description: 'Calculate Equated Monthly Installment (EMI) for a loan',
      parameters: {
        type: 'object' as any,
        properties: {
          principal: {
            type: 'number',
            description: 'Loan principal amount in INR',
          },
          rate: {
            type: 'number',
            description: 'Annual interest rate (e.g., 8.5 for 8.5%)',
          },
          tenure_months: {
            type: 'number',
            description: 'Loan tenure in months',
          },
        },
        required: ['principal', 'rate', 'tenure_months'],
      },
    };
  }

  private runMonteCarloSimulationFunction(): FunctionDeclaration {
    return {
      name: 'run_monte_carlo_simulation',
      description: 'Run Monte Carlo simulation for financial scenarios (investment returns, loan affordability, goal achievement probability)',
      parameters: {
        type: 'object' as any,
        properties: {
          scenario: {
            type: 'string',
            enum: ['investment_growth', 'loan_affordability', 'goal_achievement', 'retirement_planning'],
            description: 'Type of scenario to simulate',
          },
          initial_amount: {
            type: 'number',
            description: 'Initial investment or savings amount',
          },
          monthly_contribution: {
            type: 'number',
            description: 'Monthly contribution amount',
          },
          expected_return: {
            type: 'number',
            description: 'Expected annual return rate (e.g., 12 for 12%)',
          },
          years: {
            type: 'number',
            description: 'Number of years to simulate',
          },
          iterations: {
            type: 'number',
            description: 'Number of Monte Carlo iterations (default: 1000)',
          },
        },
        required: ['scenario', 'initial_amount', 'years'],
      },
    };
  }

  private calculateCompoundInterestFunction(): FunctionDeclaration {
    return {
      name: 'calculate_compound_interest',
      description: 'Calculate compound interest for savings or investments',
      parameters: {
        type: 'object' as any,
        properties: {
          principal: {
            type: 'number',
            description: 'Initial principal amount',
          },
          rate: {
            type: 'number',
            description: 'Annual interest rate (e.g., 7.5 for 7.5%)',
          },
          time_years: {
            type: 'number',
            description: 'Investment period in years',
          },
          compounding_frequency: {
            type: 'string',
            enum: ['annually', 'semi-annually', 'quarterly', 'monthly', 'daily'],
            description: 'How often interest is compounded',
          },
        },
        required: ['principal', 'rate', 'time_years'],
      },
    };
  }

  private calculateTaxFunction(): FunctionDeclaration {
    return {
      name: 'calculate_tax',
      description: 'Calculate income tax based on Indian tax slabs',
      parameters: {
        type: 'object' as any,
        properties: {
          annual_income: {
            type: 'number',
            description: 'Annual taxable income in INR',
          },
          regime: {
            type: 'string',
            enum: ['old', 'new'],
            description: 'Tax regime (old or new)',
          },
          deductions: {
            type: 'number',
            description: 'Total deductions claimed (for old regime)',
          },
        },
        required: ['annual_income', 'regime'],
      },
    };
  }

  private analyzeSpendingPatternFunction(): FunctionDeclaration {
    return {
      name: 'analyze_spending_pattern',
      description: 'Analyze user\'s spending pattern and identify trends',
      parameters: {
        type: 'object' as any,
        properties: {
          months: {
            type: 'number',
            description: 'Number of months to analyze (default: 3)',
          },
          category: {
            type: 'string',
            description: 'Specific category to analyze (optional)',
          },
        },
        required: [],
      },
    };
  }

  private checkGoalProgressFunction(): FunctionDeclaration {
    return {
      name: 'check_goal_progress',
      description: 'Check progress towards a specific financial goal',
      parameters: {
        type: 'object' as any,
        properties: {
          goal_id: {
            type: 'string',
            description: 'ID of the goal to check',
          },
        },
        required: ['goal_id'],
      },
    };
  }

  private calculateSIPReturnsFunction(): FunctionDeclaration {
    return {
      name: 'calculate_sip_returns',
      description: 'Calculate returns for Systematic Investment Plan (SIP)',
      parameters: {
        type: 'object' as any,
        properties: {
          monthly_amount: {
            type: 'number',
            description: 'Monthly SIP amount in INR',
          },
          expected_return: {
            type: 'number',
            description: 'Expected annual return rate (e.g., 12 for 12%)',
          },
          years: {
            type: 'number',
            description: 'Investment period in years',
          },
        },
        required: ['monthly_amount', 'expected_return', 'years'],
      },
    };
  }

  private assessLoanAffordabilityFunction(): FunctionDeclaration {
    return {
      name: 'assess_loan_affordability',
      description: 'Assess loan affordability based on income and existing obligations',
      parameters: {
        type: 'object' as any,
        properties: {
          monthly_income: {
            type: 'number',
            description: 'Monthly take-home income',
          },
          existing_emis: {
            type: 'number',
            description: 'Total existing EMI obligations',
          },
          loan_amount: {
            type: 'number',
            description: 'Requested loan amount',
          },
          rate: {
            type: 'number',
            description: 'Interest rate',
          },
          tenure_months: {
            type: 'number',
            description: 'Loan tenure in months',
          },
        },
        required: ['monthly_income', 'loan_amount', 'rate', 'tenure_months'],
      },
    };
  }

  private optimizePortfolioFunction(): FunctionDeclaration {
    return {
      name: 'optimize_portfolio',
      description: 'Optimize investment portfolio based on risk profile and goals',
      parameters: {
        type: 'object' as any,
        properties: {
          risk_profile: {
            type: 'string',
            enum: ['conservative', 'moderate', 'aggressive'],
            description: 'User\'s risk profile',
          },
          investment_amount: {
            type: 'number',
            description: 'Total amount to invest',
          },
          goal_horizon_years: {
            type: 'number',
            description: 'Investment horizon in years',
          },
        },
        required: ['risk_profile', 'investment_amount'],
      },
    };
  }
}
