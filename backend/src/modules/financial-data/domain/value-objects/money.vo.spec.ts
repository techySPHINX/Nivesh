/**
 * Money Value Object Unit Tests
 * Tests for Money value object business logic and validation
 */

import { Money, Currency } from './money.vo';
import { DomainException } from '../../../../core/exceptions/base.exception';

describe('Money Value Object', () => {
  describe('Creation', () => {
    it('should create money with valid amount and currency', () => {
      const money = new Money(100, Currency.INR);

      expect(money.getAmount()).toBe(100);
      expect(money.getCurrency()).toBe(Currency.INR);
    });

    it('should create money with zero amount', () => {
      const money = new Money(0, Currency.USD);

      expect(money.getAmount()).toBe(0);
    });

    it('should throw error for negative amount', () => {
      expect(() => new Money(-100, Currency.INR)).toThrow(DomainException);
      expect(() => new Money(-100, Currency.INR)).toThrow('Money amount cannot be negative');
    });

    it('should throw error for amount exceeding maximum', () => {
      expect(() => new Money(1000000001, Currency.INR)).toThrow(DomainException);
      expect(() => new Money(1000000001, Currency.INR)).toThrow('Money amount cannot exceed 1 billion');
    });

    it('should throw error for invalid currency', () => {
      expect(() => new Money(100, 'INVALID' as Currency)).toThrow(DomainException);
      expect(() => new Money(100, 'INVALID' as Currency)).toThrow('Invalid currency');
    });

    it('should support all valid currencies', () => {
      expect(() => new Money(100, Currency.INR)).not.toThrow();
      expect(() => new Money(100, Currency.USD)).not.toThrow();
      expect(() => new Money(100, Currency.EUR)).not.toThrow();
      expect(() => new Money(100, Currency.GBP)).not.toThrow();
    });
  });

  describe('Arithmetic Operations', () => {
    describe('Addition', () => {
      it('should add two money objects with same currency', () => {
        const money1 = new Money(100, Currency.INR);
        const money2 = new Money(50, Currency.INR);

        const result = money1.add(money2);

        expect(result.getAmount()).toBe(150);
        expect(result.getCurrency()).toBe(Currency.INR);
      });

      it('should throw error when adding different currencies', () => {
        const money1 = new Money(100, Currency.INR);
        const money2 = new Money(50, Currency.USD);

        expect(() => money1.add(money2)).toThrow(DomainException);
        expect(() => money1.add(money2)).toThrow('Currency mismatch');
      });

      it('should handle decimal additions correctly', () => {
        const money1 = new Money(10.50, Currency.INR);
        const money2 = new Money(20.75, Currency.INR);

        const result = money1.add(money2);

        expect(result.getAmount()).toBe(31.25);
      });

      it('should not mutate original money objects', () => {
        const money1 = new Money(100, Currency.INR);
        const money2 = new Money(50, Currency.INR);

        money1.add(money2);

        expect(money1.getAmount()).toBe(100);
        expect(money2.getAmount()).toBe(50);
      });
    });

    describe('Subtraction', () => {
      it('should subtract two money objects with same currency', () => {
        const money1 = new Money(100, Currency.INR);
        const money2 = new Money(30, Currency.INR);

        const result = money1.subtract(money2);

        expect(result.getAmount()).toBe(70);
        expect(result.getCurrency()).toBe(Currency.INR);
      });

      it('should throw error when subtracting different currencies', () => {
        const money1 = new Money(100, Currency.INR);
        const money2 = new Money(30, Currency.USD);

        expect(() => money1.subtract(money2)).toThrow(DomainException);
      });

      it('should throw error when result is negative', () => {
        const money1 = new Money(50, Currency.INR);
        const money2 = new Money(100, Currency.INR);

        expect(() => money1.subtract(money2)).toThrow(DomainException);
        expect(() => money1.subtract(money2)).toThrow('Result would be negative');
      });

      it('should allow subtraction resulting in zero', () => {
        const money1 = new Money(100, Currency.INR);
        const money2 = new Money(100, Currency.INR);

        const result = money1.subtract(money2);

        expect(result.getAmount()).toBe(0);
      });
    });

    describe('Multiplication', () => {
      it('should multiply money by a positive number', () => {
        const money = new Money(100, Currency.INR);

        const result = money.multiply(2.5);

        expect(result.getAmount()).toBe(250);
        expect(result.getCurrency()).toBe(Currency.INR);
      });

      it('should throw error when multiplying by negative number', () => {
        const money = new Money(100, Currency.INR);

        expect(() => money.multiply(-2)).toThrow(DomainException);
      });

      it('should allow multiplication by zero', () => {
        const money = new Money(100, Currency.INR);

        const result = money.multiply(0);

        expect(result.getAmount()).toBe(0);
      });

      it('should round to 2 decimal places', () => {
        const money = new Money(10, Currency.INR);

        const result = money.multiply(1.333);

        expect(result.getAmount()).toBe(13.33);
      });
    });

    describe('Division', () => {
      it('should divide money by a positive number', () => {
        const money = new Money(100, Currency.INR);

        const result = money.divide(4);

        expect(result.getAmount()).toBe(25);
        expect(result.getCurrency()).toBe(Currency.INR);
      });

      it('should throw error when dividing by zero', () => {
        const money = new Money(100, Currency.INR);

        expect(() => money.divide(0)).toThrow(DomainException);
      });

      it('should throw error when dividing by negative number', () => {
        const money = new Money(100, Currency.INR);

        expect(() => money.divide(-2)).toThrow(DomainException);
      });

      it('should round to 2 decimal places', () => {
        const money = new Money(100, Currency.INR);

        const result = money.divide(3);

        expect(result.getAmount()).toBe(33.33);
      });
    });
  });

  describe('Comparison Operations', () => {
    it('should check if two money objects are equal', () => {
      const money1 = new Money(100, Currency.INR);
      const money2 = new Money(100, Currency.INR);
      const money3 = new Money(50, Currency.INR);

      expect(money1.equals(money2)).toBe(true);
      expect(money1.equals(money3)).toBe(false);
    });

    it('should throw error when comparing different currencies', () => {
      const money1 = new Money(100, Currency.INR);
      const money2 = new Money(100, Currency.USD);

      expect(() => money1.equals(money2)).toThrow(DomainException);
    });

    it('should check if money is greater than another', () => {
      const money1 = new Money(100, Currency.INR);
      const money2 = new Money(50, Currency.INR);

      expect(money1.greaterThan(money2)).toBe(true);
      expect(money2.greaterThan(money1)).toBe(false);
    });

    it('should check if money is greater than or equal to another', () => {
      const money1 = new Money(100, Currency.INR);
      const money2 = new Money(100, Currency.INR);
      const money3 = new Money(50, Currency.INR);

      expect(money1.greaterThanOrEqual(money2)).toBe(true);
      expect(money1.greaterThanOrEqual(money3)).toBe(true);
      expect(money3.greaterThanOrEqual(money1)).toBe(false);
    });

    it('should check if money is less than another', () => {
      const money1 = new Money(50, Currency.INR);
      const money2 = new Money(100, Currency.INR);

      expect(money1.lessThan(money2)).toBe(true);
      expect(money2.lessThan(money1)).toBe(false);
    });

    it('should check if money is less than or equal to another', () => {
      const money1 = new Money(100, Currency.INR);
      const money2 = new Money(100, Currency.INR);
      const money3 = new Money(150, Currency.INR);

      expect(money1.lessThanOrEqual(money2)).toBe(true);
      expect(money1.lessThanOrEqual(money3)).toBe(true);
      expect(money3.lessThanOrEqual(money1)).toBe(false);
    });

    it('should check if amount is zero', () => {
      const zero = new Money(0, Currency.INR);
      const nonZero = new Money(100, Currency.INR);

      expect(zero.isZero()).toBe(true);
      expect(nonZero.isZero()).toBe(false);
    });

    it('should check if amount is positive', () => {
      const zero = new Money(0, Currency.INR);
      const positive = new Money(100, Currency.INR);

      expect(positive.isPositive()).toBe(true);
      expect(zero.isPositive()).toBe(false);
    });
  });

  describe('Formatting', () => {
    it('should format amount for INR', () => {
      const money = new Money(1234.56, Currency.INR);

      expect(money.formatAmount()).toBe('₹1,234.56');
    });

    it('should format amount for USD', () => {
      const money = new Money(1234.56, Currency.USD);

      expect(money.formatAmount()).toBe('$1,234.56');
    });

    it('should format amount for EUR', () => {
      const money = new Money(1234.56, Currency.EUR);

      expect(money.formatAmount()).toBe('€1,234.56');
    });

    it('should format amount for GBP', () => {
      const money = new Money(1234.56, Currency.GBP);

      expect(money.formatAmount()).toBe('£1,234.56');
    });

    it('should handle zero formatting', () => {
      const money = new Money(0, Currency.INR);

      expect(money.formatAmount()).toBe('₹0.00');
    });

    it('should handle large numbers', () => {
      const money = new Money(1000000, Currency.INR);

      expect(money.formatAmount()).toBe('₹1,000,000.00');
    });
  });

  describe('Serialization', () => {
    it('should convert to JSON', () => {
      const money = new Money(100, Currency.INR);

      const json = money.toJSON();

      expect(json).toEqual({
        amount: 100,
        currency: 'INR',
      });
    });

    it('should convert to string representation', () => {
      const money = new Money(100, Currency.INR);

      const str = money.toString();

      expect(str).toBe('100 INR');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small decimal values', () => {
      const money = new Money(0.01, Currency.INR);

      expect(money.getAmount()).toBe(0.01);
      expect(money.formatAmount()).toBe('₹0.01');
    });

    it('should handle maximum allowed amount', () => {
      const money = new Money(1000000000, Currency.INR);

      expect(money.getAmount()).toBe(1000000000);
    });

    it('should handle floating point precision issues', () => {
      const money1 = new Money(0.1, Currency.INR);
      const money2 = new Money(0.2, Currency.INR);

      const result = money1.add(money2);

      expect(result.getAmount()).toBe(0.3);
    });

    it('should be immutable', () => {
      const money = new Money(100, Currency.INR);
      const currency = money.getCurrency();

      // Try to modify (should not affect original)
      const doubled = money.multiply(2);

      expect(money.getAmount()).toBe(100);
      expect(doubled.getAmount()).toBe(200);
    });
  });
});
