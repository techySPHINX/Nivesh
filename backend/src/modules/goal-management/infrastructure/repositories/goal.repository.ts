import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/database/postgres/prisma.service';
import { IGoalRepository } from '../../domain/repositories/goal.repository.interface';
import { Goal, GoalStatus, GoalCategory } from '../../domain/entities/goal.entity';

@Injectable()
export class GoalRepository implements IGoalRepository {
  constructor(private readonly prisma: PrismaService) { }

  async save(goal: Goal): Promise<Goal> {
    // Convert GoalPriority enum to number for Prisma
    const priorityMap = {
      'LOW': 1,
      'MEDIUM': 2,
      'HIGH': 3,
      'CRITICAL': 4,
    };

    const data = {
      id: goal.id,
      userId: goal.userId,
      name: goal.name,
      description: goal.description,
      category: goal.category,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      currency: goal.currency,
      startDate: goal.startDate,
      targetDate: goal.targetDate,
      status: goal.status,
      priority: priorityMap[goal.priority] || 2,
      linkedAccountId: goal.linkedAccountId,
      autoContribute: goal.autoContribute,
      contributionAmount: goal.contributionAmount,
      contributionFrequency: goal.contributionFrequency,
      metadata: goal.metadata || undefined,
      updatedAt: goal.updatedAt,
    };

    const result = await this.prisma.goal.upsert({
      where: { id: goal.id },
      update: data,
      create: { ...data, createdAt: goal.createdAt },
    });

    return Goal.fromPersistence(result);
  }

  async findById(id: string): Promise<Goal | null> {
    const result = await this.prisma.goal.findUnique({
      where: { id },
    });

    return result ? Goal.fromPersistence(result) : null;
  }

  async findByUserId(userId: string): Promise<Goal[]> {
    const results = await this.prisma.goal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return results.map(r => Goal.fromPersistence(r));
  }

  async findActiveByUserId(userId: string): Promise<Goal[]> {
    const results = await this.prisma.goal.findMany({
      where: {
        userId,
        status: GoalStatus.ACTIVE,
      },
      orderBy: { targetDate: 'asc' },
    });

    return results.map(r => Goal.fromPersistence(r));
  }

  async findByStatus(userId: string, status: GoalStatus): Promise<Goal[]> {
    const results = await this.prisma.goal.findMany({
      where: {
        userId,
        status,
      },
      orderBy: { createdAt: 'desc' },
    });

    return results.map(r => Goal.fromPersistence(r));
  }

  async findByCategory(userId: string, category: GoalCategory): Promise<Goal[]> {
    const results = await this.prisma.goal.findMany({
      where: {
        userId,
        category,
      },
      orderBy: { createdAt: 'desc' },
    });

    return results.map(r => Goal.fromPersistence(r));
  }

  async findOverdueGoals(userId: string): Promise<Goal[]> {
    const now = new Date();
    const results = await this.prisma.goal.findMany({
      where: {
        userId,
        status: GoalStatus.ACTIVE,
        targetDate: {
          lt: now,
        },
      },
      orderBy: { targetDate: 'asc' },
    });

    return results.map(r => Goal.fromPersistence(r));
  }

  async findAutoContributionGoals(userId: string): Promise<Goal[]> {
    const results = await this.prisma.goal.findMany({
      where: {
        userId,
        status: GoalStatus.ACTIVE,
        autoContribute: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return results.map(r => Goal.fromPersistence(r));
  }

  async findByLinkedAccount(accountId: string): Promise<Goal[]> {
    const results = await this.prisma.goal.findMany({
      where: {
        linkedAccountId: accountId,
      },
      orderBy: { createdAt: 'desc' },
    });

    return results.map(r => Goal.fromPersistence(r));
  }

  async getTotalTargetAmount(userId: string): Promise<number> {
    const result = await this.prisma.goal.aggregate({
      where: {
        userId,
        status: {
          in: [GoalStatus.ACTIVE, GoalStatus.PAUSED],
        },
      },
      _sum: {
        targetAmount: true,
      },
    });

    return result._sum.targetAmount ? Number(result._sum.targetAmount) : 0;
  }

  async getTotalCurrentAmount(userId: string): Promise<number> {
    const result = await this.prisma.goal.aggregate({
      where: {
        userId,
        status: {
          in: [GoalStatus.ACTIVE, GoalStatus.PAUSED],
        },
      },
      _sum: {
        currentAmount: true,
      },
    });

    return result._sum.currentAmount ? Number(result._sum.currentAmount) : 0;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.goal.delete({
      where: { id },
    });
  }
}
