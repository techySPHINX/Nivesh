import { ValidationException } from '../../../../core/exceptions/base.exception';

export class PhoneNumber {
  private readonly value: string;

  constructor(phoneNumber: string) {
    this.validate(phoneNumber);
    this.value = this.normalize(phoneNumber);
  }

  private validate(phoneNumber: string): void {
    if (!phoneNumber) {
      throw new ValidationException('Phone number is required');
    }

    // Remove all non-digit characters for validation
    const digitsOnly = phoneNumber.replace(/\D/g, '');

    // Indian phone numbers: 10 digits (can have +91 prefix)
    if (digitsOnly.length < 10 || digitsOnly.length > 13) {
      throw new ValidationException('Invalid phone number length');
    }

    // Basic format validation
    const phoneRegex = /^(\+?\d{1,3})?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/;
    if (!phoneRegex.test(phoneNumber)) {
      throw new ValidationException('Invalid phone number format');
    }
  }

  private normalize(phoneNumber: string): string {
    // Remove all non-digit characters
    let normalized = phoneNumber.replace(/\D/g, '');

    // Add +91 if not present for Indian numbers
    if (normalized.length === 10) {
      normalized = '91' + normalized;
    }

    // Remove leading + if present
    if (normalized.startsWith('+')) {
      normalized = normalized.substring(1);
    }

    return '+' + normalized;
  }

  getValue(): string {
    return this.value;
  }

  equals(other: PhoneNumber): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
