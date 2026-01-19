/**
 * Test Helper Utilities
 * Provides common test utilities, factories, and helpers
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * UUID Generator for testing
 */
export class TestIdGenerator {
  static generate(): string {
    return uuidv4();
  }

  static generateMultiple(count: number): string[] {
    return Array.from({ length: count }, () => uuidv4());
  }
}

/**
 * Date utilities for testing
 */
export class TestDateHelper {
  static now(): Date {
    return new Date();
  }

  static daysAgo(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }

  static daysFromNow(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  static monthsAgo(months: number): Date {
    const date = new Date();
    date.setMonth(date.getMonth() - months);
    return date;
  }

  static startOfMonth(date: Date = new Date()): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  static endOfMonth(date: Date = new Date()): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  }
}

/**
 * Random data generator for testing
 */
export class TestDataGenerator {
  static randomString(length: number = 10): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static randomNumber(min: number = 0, max: number = 1000000): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static randomDecimal(min: number = 0, max: number = 100000, decimals: number = 2): number {
    const value = Math.random() * (max - min) + min;
    return parseFloat(value.toFixed(decimals));
  }

  static randomEmail(): string {
    return `test-${this.randomString(8)}@example.com`;
  }

  static randomPhoneNumber(): string {
    return `+91${this.randomNumber(6000000000, 9999999999)}`;
  }

  static randomAccountNumber(): string {
    return this.randomNumber(100000000000, 999999999999999999).toString();
  }

  static randomIFSCCode(): string {
    const bankCode = this.randomString(4).toUpperCase();
    const branchCode = this.randomString(6).toUpperCase();
    return `${bankCode}0${branchCode}`;
  }

  static randomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }
}

/**
 * Test assertion helpers
 */
export class TestAssertions {
  static assertDefined<T>(value: T | undefined | null, message?: string): asserts value is T {
    if (value === undefined || value === null) {
      throw new Error(message || 'Expected value to be defined');
    }
  }

  static assertUUID(value: string, message?: string): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      throw new Error(message || `Expected "${value}" to be a valid UUID`);
    }
  }

  static assertDateInRange(date: Date, start: Date, end: Date, message?: string): void {
    if (date < start || date > end) {
      throw new Error(
        message ||
        `Expected date ${date.toISOString()} to be between ${start.toISOString()} and ${end.toISOString()}`,
      );
    }
  }
}

/**
 * Mock factory base class
 */
export abstract class MockFactory<T> {
  abstract build(overrides?: Partial<T>): T;

  buildMany(count: number, overrides?: Partial<T>): T[] {
    return Array.from({ length: count }, () => this.build(overrides));
  }
}

/**
 * Test cleanup helper
 */
export class TestCleanup {
  private cleanupFunctions: Array<() => Promise<void> | void> = [];

  addCleanup(fn: () => Promise<void> | void): void {
    this.cleanupFunctions.push(fn);
  }

  async cleanup(): Promise<void> {
    for (const fn of this.cleanupFunctions.reverse()) {
      await fn();
    }
    this.cleanupFunctions = [];
  }
}

/**
 * Test timeout helper
 */
export class TestTimeout {
  static async wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  static async waitForCondition(
    condition: () => boolean | Promise<boolean>,
    timeoutMs: number = 5000,
    intervalMs: number = 100,
  ): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      if (await condition()) {
        return;
      }
      await this.wait(intervalMs);
    }
    throw new Error(`Timeout waiting for condition after ${timeoutMs}ms`);
  }
}
