import { DomainException } from '../../../../core/exceptions/base.exception';

export class AccountNumber {
  private readonly value: string;

  constructor(accountNumber: string) {
    this.validate(accountNumber);
    this.value = accountNumber;
  }

  private validate(accountNumber: string): void {
    if (!accountNumber || accountNumber.trim().length === 0) {
      throw new DomainException('Account number cannot be empty');
    }

    // Remove spaces and hyphens for validation
    const cleaned = accountNumber.replace(/[\s-]/g, '');

    // Account number should be 9-18 digits (standard Indian banking)
    if (!/^\d{9,18}$/.test(cleaned)) {
      throw new DomainException(
        'Account number must be 9-18 digits',
      );
    }
  }

  getValue(): string {
    return this.value;
  }

  equals(other: AccountNumber): boolean {
    return this.value === other.value;
  }

  // Format for display (e.g., "XXXX XXXX 1234")
  getMasked(): string {
    const cleaned = this.value.replace(/[\s-]/g, '');
    const lastFour = cleaned.slice(-4);
    const masked = 'X'.repeat(cleaned.length - 4);
    return `${masked} ${lastFour}`;
  }
}
