import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/database/postgres/prisma.service';
import { IGoalContributionRepository } from '../../domain/repositories/goal-contribution.repository.interface';
import { GoalContribution } from '../../domain/entities/goal-contribution.entity';

@Injectable()
export class GoalContributionRepository implements IGoalContributionRepository {
  constructor(private readonly prisma: PrismaService) { }

  async save(contribution: GoalContribution): Promise<GoalContribution> {
    const data = {
      id: contribution.id,
      goalId: contribution.goalId,
      userId: contribution.userId,
      amount: contribution.amount,
      currency: contribution.currency,
      type: contribution.type,
      transactionId: contribution.transactionId,
      accountId: contribution.accountId,
      notes: contribution.notes,
      metadata: contribution.metadata,
      createdAt: contribution.createdAt,
    };

    const result = await this.prisma.goalContribution.create({
      data,
    });

    return GoalContribution.fromPersistence(result);
  }

  async findById(id: string): Promise<GoalContribution | null> {
    const result = await this.prisma.goalContribution.findUnique({
      where: { id },
    });

    return result ? GoalContribution.fromPersistence(result) : null;
  }

  async findByGoalId(goalId: string): Promise<GoalContribution[]> {
    const results = await this.prisma.goalContribution.findMany({
      where: { goalId },
      orderBy: { createdAt: 'desc' },
    });

    return results.map(r => GoalContribution.fromPersistence(r));
  }

  async findByUserId(userId: string): Promise<GoalContribution[]> {
    const results = await this.prisma.goalContribution.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return results.map(r => GoalContribution.fromPersistence(r));
  }

  async getTotalContributionsByGoal(goalId: string): Promise<number> {
    const result = await this.prisma.goalContribution.aggregate({
      where: { goalId },
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount || 0;
  }

  async getRecentContributions(userId: string, limit: number): Promise<GoalContribution[]> {
    const results = await this.prisma.goalContribution.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return results.map(r => GoalContribution.fromPersistence(r));
  }

  async findByDateRange(userId: string, startDate: Date, endDate: Date): Promise<GoalContribution[]> {
    const results = await this.prisma.goalContribution.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return results.map(r => GoalContribution.fromPersistence(r));
  }

  async delete(id: string): Promise<void> {
    await this.prisma.goalContribution.delete({
      where: { id },
    });
  }
}
