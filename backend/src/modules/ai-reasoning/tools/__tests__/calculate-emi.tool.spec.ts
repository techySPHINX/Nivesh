import { calculateEMITool } from '../calculate-emi.tool';

describe('Calculate EMI Tool', () => {
  describe('schema validation', () => {
    it('should validate correct input', () => {
      const input = {
        principal: 5000000, // ₹50 lakhs
        annualRate: 8.5,
        tenureMonths: 240, // 20 years
      };

      const isValid = calculateEMITool.validateInput(input);
      expect(isValid).toBe(true);
    });

    it('should reject principal below minimum', () => {
      const input = {
        principal: 500, // Below ₹1000 minimum
        annualRate: 8.5,
        tenureMonths: 240,
      };

      const isValid = calculateEMITool.validateInput(input);
      expect(isValid).toBe(false);
    });

    it('should reject tenure above maximum', () => {
      const input = {
        principal: 5000000,
        annualRate: 8.5,
        tenureMonths: 400, // Above 360 months maximum
      };

      const isValid = calculateEMITool.validateInput(input);
      expect(isValid).toBe(false);
    });

    it('should reject negative interest rate', () => {
      const input = {
        principal: 5000000,
        annualRate: -5,
        tenureMonths: 240,
      };

      const isValid = calculateEMITool.validateInput(input);
      expect(isValid).toBe(false);
    });
  });

  describe('execute', () => {
    it('should calculate EMI correctly for standard loan', async () => {
      const input = {
        principal: 5000000, // ₹50 lakhs
        annualRate: 8.5, // 8.5%
        tenureMonths: 240, // 20 years
      };

      const result = await calculateEMITool.execute(input);

      expect(result).toBeDefined();
      expect(result.emi).toBeGreaterThan(0);
      expect(result.totalPayment).toBeGreaterThan(input.principal);
      expect(result.totalInterest).toBeGreaterThan(0);
      expect(result.totalInterest).toBe(
        result.totalPayment - input.principal,
      );

      // EMI formula verification: EMI = [P × R × (1+R)^N] / [(1+R)^N-1]
      const monthlyRate = input.annualRate / 12 / 100;
      const expectedEMI =
        (input.principal *
          monthlyRate *
          Math.pow(1 + monthlyRate, input.tenureMonths)) /
        (Math.pow(1 + monthlyRate, input.tenureMonths) - 1);

      expect(result.emi).toBeCloseTo(expectedEMI, 2);
    });

    it('should generate amortization schedule', async () => {
      const input = {
        principal: 1000000, // ₹10 lakhs
        annualRate: 10,
        tenureMonths: 12, // 1 year
      };

      const result = await calculateEMITool.execute(input);

      expect(result.amortization).toBeDefined();
      expect(result.amortization.length).toBe(12);

      // Check first month
      const firstMonth = result.amortization[0];
      expect(firstMonth.month).toBe(1);
      expect(firstMonth.emi).toBe(result.emi);
      expect(firstMonth.principal).toBeGreaterThan(0);
      expect(firstMonth.interest).toBeGreaterThan(0);
      expect(firstMonth.principal + firstMonth.interest).toBeCloseTo(
        result.emi,
        2,
      );
      expect(firstMonth.balance).toBe(
        input.principal - firstMonth.principal,
      );

      // Check last month
      const lastMonth = result.amortization[11];
      expect(lastMonth.month).toBe(12);
      expect(lastMonth.balance).toBeCloseTo(0, 2);
    });

    it('should handle zero interest rate', async () => {
      const input = {
        principal: 1000000,
        annualRate: 0,
        tenureMonths: 12,
      };

      const result = await calculateEMITool.execute(input);

      expect(result.emi).toBeCloseTo(input.principal / input.tenureMonths, 2);
      expect(result.totalInterest).toBe(0);
    });

    it('should handle short tenure (1 month)', async () => {
      const input = {
        principal: 100000,
        annualRate: 12,
        tenureMonths: 1,
      };

      const result = await calculateEMITool.execute(input);

      expect(result.amortization.length).toBe(1);
      expect(result.amortization[0].balance).toBeCloseTo(0, 2);
    });

    it('should show increasing principal payment over time', async () => {
      const input = {
        principal: 5000000,
        annualRate: 9,
        tenureMonths: 120,
      };

      const result = await calculateEMITool.execute(input);

      const firstMonthPrincipal = result.amortization[0].principal;
      const midMonthPrincipal = result.amortization[60].principal;
      const lastMonthPrincipal =
        result.amortization[119].principal;

      // Principal payment should increase over time
      expect(midMonthPrincipal).toBeGreaterThan(firstMonthPrincipal);
      expect(lastMonthPrincipal).toBeGreaterThan(midMonthPrincipal);

      // Interest payment should decrease over time
      const firstMonthInterest = result.amortization[0].interest;
      const lastMonthInterest = result.amortization[119].interest;
      expect(lastMonthInterest).toBeLessThan(firstMonthInterest);
    });
  });

  describe('metadata', () => {
    it('should have correct tool metadata', () => {
      expect(calculateEMITool.name).toBe('calculate_emi');
      expect(calculateEMITool.description).toContain('EMI');
      expect(calculateEMITool.category).toBe('financial_calculation');
    });
  });
});
