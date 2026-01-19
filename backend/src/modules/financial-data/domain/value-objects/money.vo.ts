import { DomainException } from '../../../../core/exceptions/base.exception';

export enum Currency {
  INR = 'INR',
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
}

export class Money {
  private readonly amount: number;
  private readonly currency: Currency;

  constructor(amount: number, currency: Currency = Currency.INR) {
    this.validate(amount);
    this.amount = Math.round(amount * 100) / 100; // Round to 2 decimals
    this.currency = currency;
  }

  private validate(amount: number): void {
    if (amount === null || amount === undefined) {
      throw new DomainException('Amount cannot be null or undefined');
    }

    if (isNaN(amount)) {
      throw new DomainException('Amount must be a valid number');
    }

    if (amount < 0) {
      throw new DomainException('Amount cannot be negative');
    }

    // Max amount: 1 billion (for safety)
    if (amount > 1_000_000_000) {
      throw new DomainException('Amount exceeds maximum limit');
    }
  }

  getAmount(): number {
    return this.amount;
  }

  getCurrency(): Currency {
    return this.currency;
  }

  // Arithmetic operations
  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    const newAmount = this.amount - other.amount;
    if (newAmount < 0) {
      throw new DomainException('Subtraction results in negative amount');
    }
    return new Money(newAmount, this.currency);
  }

  multiply(factor: number): Money {
    if (factor < 0) {
      throw new DomainException('Factor cannot be negative');
    }
    return new Money(this.amount * factor, this.currency);
  }

  // Comparison operations
  isGreaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount > other.amount;
  }

  isLessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount < other.amount;
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  isZero(): boolean {
    return this.amount === 0;
  }

  // Format for display
  format(): string {
    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: this.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return formatter.format(this.amount);
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new DomainException(
        `Cannot perform operation on different currencies: ${this.currency} and ${other.currency}`,
      );
    }
  }

  // Serialization
  toJSON(): { amount: number; currency: string } {
    return {
      amount: this.amount,
      currency: this.currency,
    };
  }

  static fromJSON(data: { amount: number; currency: string }): Money {
    return new Money(data.amount, data.currency as Currency);
  }
}
