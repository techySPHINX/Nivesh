import { Test, TestingModule } from '@nestjs/testing';
import { FunctionExecutorService } from '../domain/services/function-executor.service';
import { FunctionRegistryService } from '../domain/services/function-registry.service';

describe('FunctionExecutorService', () => {
  let service: FunctionExecutorService;
  let registry: FunctionRegistryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FunctionExecutorService, FunctionRegistryService],
    }).compile();

    service = module.get<FunctionExecutorService>(FunctionExecutorService);
    registry = module.get<FunctionRegistryService>(FunctionRegistryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(registry).toBeDefined();
  });

  describe('calculate_emi', () => {
    it('should calculate EMI correctly', async () => {
      const result = await service.executeFunction('calculate_emi', {
        principal: 1000000,
        annual_rate: 8,
        tenure_months: 60,
      });

      expect(result).toHaveProperty('monthly_emi');
      expect(result).toHaveProperty('total_payment');
      expect(result).toHaveProperty('total_interest');
      expect(result.monthly_emi).toBeCloseTo(20276.03, 2);
      expect(result.total_payment).toBeCloseTo(1216561.8, 2);
      expect(result.total_interest).toBeCloseTo(216561.8, 2);
    });

    it('should handle zero interest rate', async () => {
      const result = await service.executeFunction('calculate_emi', {
        principal: 100000,
        annual_rate: 0,
        tenure_months: 12,
      });

      expect(result.monthly_emi).toBeCloseTo(8333.33, 2);
      expect(result.total_interest).toBe(0);
    });
  });

  describe('calculate_sip_returns', () => {
    it('should calculate SIP returns correctly', async () => {
      const result = await service.executeFunction('calculate_sip_returns', {
        monthly_investment: 10000,
        annual_return_rate: 12,
        tenure_years: 20,
      });

      expect(result).toHaveProperty('final_amount');
      expect(result).toHaveProperty('total_invested');
      expect(result).toHaveProperty('total_returns');
      expect(result.final_amount).toBeGreaterThan(0);
      expect(result.total_invested).toBe(10000 * 12 * 20);
      expect(result.total_returns).toBeGreaterThan(0);
    });

    it('should handle single year investment', async () => {
      const result = await service.executeFunction('calculate_sip_returns', {
        monthly_investment: 5000,
        annual_return_rate: 10,
        tenure_years: 1,
      });

      expect(result.total_invested).toBe(60000);
      expect(result.final_amount).toBeGreaterThan(60000);
    });
  });

  describe('calculate_tax', () => {
    it('should calculate tax for old regime', async () => {
      const result = await service.executeFunction('calculate_tax', {
        annual_income: 1500000,
        regime: 'old',
        deductions: 150000,
      });

      expect(result).toHaveProperty('total_tax');
      expect(result).toHaveProperty('effective_tax_rate');
      expect(result).toHaveProperty('breakdown');
      expect(result.total_tax).toBeGreaterThan(0);
    });

    it('should calculate tax for new regime', async () => {
      const result = await service.executeFunction('calculate_tax', {
        annual_income: 1500000,
        regime: 'new',
      });

      expect(result).toHaveProperty('total_tax');
      expect(result.total_tax).toBeGreaterThan(0);
    });

    it('should handle income below taxable limit', async () => {
      const result = await service.executeFunction('calculate_tax', {
        annual_income: 200000,
        regime: 'new',
      });

      expect(result.total_tax).toBe(0);
      expect(result.effective_tax_rate).toBe('0.00%');
    });
  });

  describe('assess_loan_affordability', () => {
    it('should assess affordable loan', async () => {
      const result = await service.executeFunction('assess_loan_affordability', {
        monthly_income: 150000,
        loan_amount: 5000000,
        annual_rate: 8.5,
        tenure_months: 240,
      });

      expect(result).toHaveProperty('is_affordable');
      expect(result).toHaveProperty('foir');
      expect(result).toHaveProperty('recommended_loan_amount');
      expect(result.is_affordable).toBe(true);
    });

    it('should assess unaffordable loan', async () => {
      const result = await service.executeFunction('assess_loan_affordability', {
        monthly_income: 50000,
        loan_amount: 10000000,
        annual_rate: 9,
        tenure_months: 240,
      });

      expect(result.is_affordable).toBe(false);
      expect(result.recommended_loan_amount).toBeLessThan(10000000);
    });
  });

  describe('run_monte_carlo_simulation', () => {
    it('should run Monte Carlo simulation', async () => {
      const result = await service.executeFunction('run_monte_carlo_simulation', {
        initial_investment: 1000000,
        annual_contribution: 100000,
        years: 10,
        expected_return: 12,
        volatility: 15,
        simulations: 1000,
      });

      expect(result).toHaveProperty('median_outcome');
      expect(result).toHaveProperty('percentile_10');
      expect(result).toHaveProperty('percentile_90');
      expect(result).toHaveProperty('probability_of_loss');
      expect(result.median_outcome).toBeGreaterThan(0);
      expect(result.percentile_90).toBeGreaterThan(result.percentile_10);
    });
  });

  describe('optimize_portfolio', () => {
    it('should optimize portfolio allocation', async () => {
      const result = await service.executeFunction('optimize_portfolio', {
        risk_tolerance: 'moderate',
        investment_horizon_years: 10,
        current_age: 30,
        monthly_income: 100000,
      });

      expect(result).toHaveProperty('asset_allocation');
      expect(result).toHaveProperty('recommended_instruments');
      expect(result.asset_allocation).toHaveProperty('equity');
      expect(result.asset_allocation).toHaveProperty('debt');
      expect(result.asset_allocation).toHaveProperty('gold');
      
      const total = 
        result.asset_allocation.equity +
        result.asset_allocation.debt +
        result.asset_allocation.gold;
      expect(total).toBeCloseTo(100, 1);
    });

    it('should adjust allocation for conservative investor', async () => {
      const result = await service.executeFunction('optimize_portfolio', {
        risk_tolerance: 'conservative',
        investment_horizon_years: 3,
        current_age: 55,
        monthly_income: 80000,
      });

      expect(result.asset_allocation.equity).toBeLessThan(50);
      expect(result.asset_allocation.debt).toBeGreaterThan(40);
    });

    it('should adjust allocation for aggressive investor', async () => {
      const result = await service.executeFunction('optimize_portfolio', {
        risk_tolerance: 'aggressive',
        investment_horizon_years: 20,
        current_age: 25,
        monthly_income: 120000,
      });

      expect(result.asset_allocation.equity).toBeGreaterThan(60);
    });
  });

  describe('calculate_retirement_corpus', () => {
    it('should calculate retirement corpus', async () => {
      const result = await service.executeFunction('calculate_retirement_corpus', {
        current_age: 30,
        retirement_age: 60,
        current_monthly_expenses: 50000,
        inflation_rate: 6,
        post_retirement_years: 25,
      });

      expect(result).toHaveProperty('required_corpus');
      expect(result).toHaveProperty('monthly_expenses_at_retirement');
      expect(result).toHaveProperty('monthly_sip_needed');
      expect(result.required_corpus).toBeGreaterThan(0);
      expect(result.monthly_expenses_at_retirement).toBeGreaterThan(50000);
    });
  });

  describe('compare_investment_options', () => {
    it('should compare multiple investment options', async () => {
      const result = await service.executeFunction('compare_investment_options', {
        investment_amount: 100000,
        tenure_years: 5,
        options: [
          {
            name: 'Fixed Deposit',
            annual_return: 6.5,
            tax_treatment: 'taxable',
            liquidity: 'high',
          },
          {
            name: 'Equity Mutual Fund',
            annual_return: 12,
            tax_treatment: 'ltcg',
            liquidity: 'high',
          },
          {
            name: 'PPF',
            annual_return: 7.1,
            tax_treatment: 'tax_free',
            liquidity: 'low',
          },
        ],
      });

      expect(result).toHaveProperty('comparison');
      expect(result).toHaveProperty('recommendation');
      expect(Array.isArray(result.comparison)).toBe(true);
      expect(result.comparison.length).toBe(3);
      expect(result.comparison[0]).toHaveProperty('name');
      expect(result.comparison[0]).toHaveProperty('final_amount');
      expect(result.comparison[0]).toHaveProperty('post_tax_returns');
    });
  });

  describe('get_asset_info', () => {
    it('should retrieve asset information', async () => {
      const result = await service.executeFunction('get_asset_info', {
        ticker: 'RELIANCE',
        exchange: 'NSE',
      });

      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('sector');
      expect(result).toHaveProperty('market_cap');
      expect(result).toHaveProperty('pe_ratio');
    });
  });

  describe('query_financial_graph', () => {
    it('should execute Cypher query', async () => {
      const result = await service.executeFunction('query_financial_graph', {
        cypher_query: 'MATCH (u:User {id: $userId}) RETURN u',
        parameters: { userId: 'test-123' },
      });

      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('summary');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid function name', async () => {
      await expect(
        service.executeFunction('invalid_function', {})
      ).rejects.toThrow('Function not found');
    });

    it('should handle missing required parameters', async () => {
      await expect(
        service.executeFunction('calculate_emi', {
          principal: 100000,
          // Missing annual_rate and tenure_months
        })
      ).rejects.toThrow();
    });

    it('should handle timeout', async () => {
      // Mock a long-running function
      jest.setTimeout(10000);
      
      // This should complete within timeout
      const result = await service.executeFunction('run_monte_carlo_simulation', {
        initial_investment: 100000,
        annual_contribution: 10000,
        years: 20,
        expected_return: 10,
        volatility: 15,
        simulations: 10000,
      });

      expect(result).toBeDefined();
    });
  });

  describe('Function Registry', () => {
    it('should have all 10 functions registered', () => {
      const tools = registry.getAllTools();
      expect(tools.length).toBe(10);
      
      const functionNames = tools.map(tool => tool.name);
      expect(functionNames).toContain('calculate_emi');
      expect(functionNames).toContain('calculate_sip_returns');
      expect(functionNames).toContain('calculate_tax');
      expect(functionNames).toContain('assess_loan_affordability');
      expect(functionNames).toContain('run_monte_carlo_simulation');
      expect(functionNames).toContain('optimize_portfolio');
      expect(functionNames).toContain('calculate_retirement_corpus');
      expect(functionNames).toContain('compare_investment_options');
      expect(functionNames).toContain('get_asset_info');
      expect(functionNames).toContain('query_financial_graph');
    });

    it('should have valid JSON schemas for all functions', () => {
      const tools = registry.getAllTools();
      tools.forEach(tool => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('parameters');
        expect(tool.parameters).toHaveProperty('type');
        expect(tool.parameters).toHaveProperty('properties');
        expect(tool.parameters).toHaveProperty('required');
      });
    });
  });
});
