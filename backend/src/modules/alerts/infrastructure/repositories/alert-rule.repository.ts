import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../../core/database/postgres/prisma.service";
import { IAlertRuleRepository } from "../../domain/repositories/alert-rule.repository.interface";
import {
  AlertRule,
  AlertRuleType,
} from "../../domain/entities/alert-rule.entity";

@Injectable()
export class PrismaAlertRuleRepository implements IAlertRuleRepository {
  private readonly logger = new Logger(PrismaAlertRuleRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<AlertRule | null> {
    const record = await this.prisma.alertRule.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findByUserId(userId: string): Promise<AlertRule[]> {
    const records = await this.prisma.alertRule.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return records.map((r) => this.toDomain(r));
  }

  async findActiveByUserId(userId: string): Promise<AlertRule[]> {
    const records = await this.prisma.alertRule.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: "desc" },
    });
    return records.map((r) => this.toDomain(r));
  }

  async findByType(
    userId: string,
    ruleType: AlertRuleType,
  ): Promise<AlertRule[]> {
    const records = await this.prisma.alertRule.findMany({
      where: { userId, ruleType: ruleType as string, isActive: true },
    });
    return records.map((r) => this.toDomain(r));
  }

  async save(rule: AlertRule): Promise<AlertRule> {
    const data = this.toPersistence(rule);

    const record = await this.prisma.alertRule.upsert({
      where: { id: rule.id },
      update: data,
      create: { id: rule.id, ...data },
    });

    return this.toDomain(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.alertRule.delete({ where: { id } });
  }

  private toDomain(record: any): AlertRule {
    return AlertRule.fromPersistence(record);
  }

  private toPersistence(rule: AlertRule): any {
    return {
      userId: rule.userId,
      name: rule.name,
      ruleType: rule.ruleType,
      conditions: rule.conditions,
      actions: rule.actions,
      isActive: rule.isActive,
      lastTriggeredAt: rule.lastTriggeredAt,
      triggerCount: rule.triggerCount,
      metadata: rule.metadata,
    };
  }
}
