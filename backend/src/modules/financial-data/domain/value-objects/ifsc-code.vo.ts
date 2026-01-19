import { DomainException } from '../../../../core/exceptions/base.exception';

export class IFSCCode {
  private readonly value: string;

  constructor(ifscCode: string) {
    this.validate(ifscCode);
    this.value = ifscCode.toUpperCase();
  }

  private validate(ifscCode: string): void {
    if (!ifscCode || ifscCode.trim().length === 0) {
      throw new DomainException('IFSC code cannot be empty');
    }

    const cleaned = ifscCode.trim().toUpperCase();

    // IFSC format: 4 letters (bank code) + 0 + 6 alphanumeric (branch code)
    // Example: HDFC0001234, SBIN0001234
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleaned)) {
      throw new DomainException(
        'Invalid IFSC code format. Expected format: XXXX0XXXXXX',
      );
    }
  }

  getValue(): string {
    return this.value;
  }

  getBankCode(): string {
    return this.value.substring(0, 4);
  }

  getBranchCode(): string {
    return this.value.substring(5);
  }

  equals(other: IFSCCode): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
