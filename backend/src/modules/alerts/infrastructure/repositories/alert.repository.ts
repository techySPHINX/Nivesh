import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../core/database/postgres/prisma.service';
import { IAlertRepository } from '../../domain/repositories/alert.repository.interface';
import { Alert, AlertType, AlertSeverity } from '../../domain/entities/alert.entity';

@Injectable()
export class PrismaAlertRepository implements IAlertRepository {
  private readonly logger = new Logger(PrismaAlertRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Alert | null> {
    const record = await this.prisma.alert.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findByUserId(
    userId: string,
    skip: number = 0,
    take: number = 20,
    filters?: { type?: string; severity?: string },
  ): Promise<Alert[]> {
    const where: any = { userId };
    if (filters?.type) where.alertType = filters.type;
    if (filters?.severity) where.severity = filters.severity;

    const records = await this.prisma.alert.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r) => this.toDomain(r));
  }

  async findActiveByUserId(userId: string, skip: number = 0, take: number = 20): Promise<Alert[]> {
    const records = await this.prisma.alert.findMany({
      where: { userId, isDismissed: false },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r) => this.toDomain(r));
  }

  async countByUserId(userId: string, filters?: { type?: string; severity?: string }): Promise<number> {
    const where: any = { userId };
    if (filters?.type) where.alertType = filters.type;
    if (filters?.severity) where.severity = filters.severity;

    return this.prisma.alert.count({ where });
  }

  async countActiveByUserId(userId: string): Promise<number> {
    return this.prisma.alert.count({
      where: { userId, isDismissed: false },
    });
  }

  async countUnreadByUserId(userId: string): Promise<number> {
    return this.prisma.alert.count({
      where: { userId, isRead: false, isDismissed: false },
    });
  }

  async save(alert: Alert): Promise<Alert> {
    const data = this.toPersistence(alert);

    const record = await this.prisma.alert.upsert({
      where: { id: alert.id },
      update: data,
      create: { id: alert.id, ...data },
    });

    return this.toDomain(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.alert.delete({ where: { id } });
  }

  async markAllReadByUserId(userId: string): Promise<number> {
    const result = await this.prisma.alert.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return result.count;
  }

  private toDomain(record: any): Alert {
    return Alert.create({
      id: record.id,
      userId: record.userId,
      alertType: record.alertType as AlertType,
      severity: record.severity as AlertSeverity,
      title: record.title,
      message: record.message,
      actionable: record.actionable,
      actionUrl: record.actionUrl,
      isRead: record.isRead,
      readAt: record.readAt,
      isDismissed: record.isDismissed,
      dismissedAt: record.dismissedAt,
      metadata: record.metadata,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  private toPersistence(alert: Alert): any {
    return {
      userId: alert.userId,
      alertType: alert.alertType,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      actionable: alert.actionable,
      actionUrl: alert.actionUrl,
      isRead: alert.isRead,
      readAt: alert.readAt,
      isDismissed: alert.isDismissed,
      dismissedAt: alert.dismissedAt,
      metadata: alert.metadata,
    };
  }
}
