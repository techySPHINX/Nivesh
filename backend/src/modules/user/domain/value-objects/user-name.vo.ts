import { ValidationException } from '../../../../core/exceptions/base.exception';

export class UserName {
  private readonly firstName: string;
  private readonly lastName: string;

  constructor(firstName: string, lastName: string) {
    this.validate(firstName, lastName);
    this.firstName = this.normalize(firstName);
    this.lastName = this.normalize(lastName);
  }

  private validate(firstName: string, lastName: string): void {
    if (!firstName || !lastName) {
      throw new ValidationException('First name and last name are required');
    }

    if (firstName.length < 2 || firstName.length > 50) {
      throw new ValidationException('First name must be between 2 and 50 characters');
    }

    if (lastName.length < 2 || lastName.length > 50) {
      throw new ValidationException('Last name must be between 2 and 50 characters');
    }

    // Only letters, spaces, hyphens, and apostrophes allowed
    const nameRegex = /^[a-zA-Z\s'-]+$/;
    if (!nameRegex.test(firstName) || !nameRegex.test(lastName)) {
      throw new ValidationException('Names can only contain letters, spaces, hyphens, and apostrophes');
    }
  }

  private normalize(name: string): string {
    // Trim and capitalize first letter of each word
    return name
      .trim()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  getFirstName(): string {
    return this.firstName;
  }

  getLastName(): string {
    return this.lastName;
  }

  getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  equals(other: UserName): boolean {
    return this.firstName === other.firstName && this.lastName === other.lastName;
  }

  toString(): string {
    return this.getFullName();
  }
}
