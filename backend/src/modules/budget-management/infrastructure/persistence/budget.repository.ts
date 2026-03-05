import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../core/database/postgres/prisma.service';
import { IBudgetRepository } from '../../domain/repositories/budget.repository.interface';
import {
  Budget,
  BudgetPeriod,
  BudgetStatus,
} from '../../domain/entities/budget.entity';

@Injectable()
export class PrismaBudgetRepository implements IBudgetRepository {
  private readonly logger = new Logger(PrismaBudgetRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Private: Prisma → Domain ───────────────────────────────────────────────

  private toDomain(record: any): Budget {
    return new Budget(
      record.id,
      record.userId,
      record.name ?? record.category,          // name may be stored as category
      record.description ?? '',
      Number(record.amount),
      Number(record.currentSpending ?? 0),
      record.currency ?? 'INR',
      record.period as BudgetPeriod,
      record.startDate,
      record.endDate,
      record.isActive
        ? Number(record.currentSpending ?? 0) > Number(record.amount)
          ? BudgetStatus.EXCEEDED
          : BudgetStatus.ACTIVE
        : BudgetStatus.PAUSED,
      new Map(),           // categoryBudgets — not stored separately
      [50, 75, 90, 100],   // default alert thresholds
      new Set(),           // alertsSent
    ) as Budget;
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────────

  async save(budget: Budget): Promise<Budget> {
    const data = {
      userId: budget.userId,
      category: budget.name,
      amount: budget.totalLimit,
      currency: budget.currency,
      period: budget.period,
      startDate: budget.startDate,
      endDate: budget.endDate,
      alertThreshold:
        budget.alertThresholds?.length
          ? Math.max(...budget.alertThresholds)
          : 90,
      isRecurring: false,
      isActive: budget.status !== BudgetStatus.PAUSED,
      currentSpending: budget.totalSpent,
    };

    const record = await this.prisma.budget.upsert({
      where: { id: budget.id },
      update: data,
      create: { id: budget.id, ...data },
    });

    return this.toDomain(record);
  }

  async findById(id: string): Promise<Budget | null> {
    const record = await this.prisma.budget.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findByUserId(userId: string): Promise<Budget[]> {
    const records = await this.prisma.budget.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async findActiveByUserId(userId: string): Promise<Budget[]> {
    const records = await this.prisma.budget.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async findCurrentByUserAndPeriod(
    userId: string,
    period: BudgetPeriod,
  ): Promise<Budget | null> {
    const now = new Date();
    const record = await this.prisma.budget.findFirst({
      where: {
        userId,
        period,
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByStatus(userId: string, status: BudgetStatus): Promise<Budget[]> {
    // Map status to Prisma filter
    if (status === BudgetStatus.ACTIVE) {
      const records = await this.prisma.budget.findMany({
        where: {
          userId,
          isActive: true,
          // currentSpending < amount  (not exceeded)
        },
      });
      // Filter in JS since Prisma can't compare two columns directly
      return records
        .filter((r) => Number(r.currentSpending ?? 0) <= Number(r.amount))
        .map((r) => this.toDomain(r));
    }

    if (status === BudgetStatus.EXCEEDED) {
      const records = await this.prisma.budget.findMany({
        where: { userId, isActive: true },
      });
      return records
        .filter((r) => Number(r.currentSpending ?? 0) > Number(r.amount))
        .map((r) => this.toDomain(r));
    }

    if (status === BudgetStatus.PAUSED) {
      const records = await this.prisma.budget.findMany({
        where: { userId, isActive: false },
      });
      return records.map((r) => this.toDomain(r));
    }

    return [];
  }

  async findExceededBudgets(userId: string): Promise<Budget[]> {
    const records = await this.prisma.budget.findMany({
      where: { userId, isActive: true },
    });
    return records
      .filter((r) => Number(r.currentSpending ?? 0) > Number(r.amount))
      .map((r) => this.toDomain(r));
  }

  async findByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Budget[]> {
    const records = await this.prisma.budget.findMany({
      where: {
        userId,
        startDate: { gte: startDate },
        endDate: { lte: endDate },
      },
      orderBy: { startDate: 'asc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async delete(id: string): Promise<void> {
    await this.prisma.budget.delete({ where: { id } });
  }

  // ─── Extra helpers used by alert trigger engine ──────────────────────────────

  /**
   * Update currentSpending for a budget (called by transaction event handler)
   */
  async updateSpending(budgetId: string, newSpending: number): Promise<void> {
    await this.prisma.budget.update({
      where: { id: budgetId },
      data: { currentSpending: newSpending },
    });
  }

  /**
   * Find all active budgets whose spending is within ±5% of a threshold
   */
  async findBudgetsByThreshold(
    userId: string,
    thresholdPercent: number,
  ): Promise<Array<{ id: string; spending: number; limit: number }>> {
    const records = await this.prisma.budget.findMany({
      where: { userId, isActive: true },
    });
    return records
      .filter((r) => {
        const pct = (Number(r.currentSpending ?? 0) / Number(r.amount)) * 100;
        return pct >= thresholdPercent - 5 && pct <= thresholdPercent + 5;
      })
      .map((r) => ({
        id: r.id,
        spending: Number(r.currentSpending ?? 0),
        limit: Number(r.amount),
      }));
  }
}
