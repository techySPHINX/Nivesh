import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Injectable, Inject, Logger } from '@nestjs/common';
import { BudgetExceededEvent, BudgetThresholdReachedEvent } from '../../domain/events/budget.events';
import { ALERT_REPOSITORY } from '../../../alerts/domain/repositories/alert.repository.interface';
import { IAlertRepository } from '../../../alerts/domain/repositories/alert.repository.interface';
import { Alert, AlertType, AlertSeverity } from '../../../alerts/domain/entities/alert.entity';

/**
 * BudgetAlertHandler
 *
 * Listens to budget domain events and creates Alert records
 * so the alert system reflects real budget violations.
 */

@EventsHandler(BudgetExceededEvent)
@Injectable()
export class BudgetExceededAlertHandler implements IEventHandler<BudgetExceededEvent> {
  private readonly logger = new Logger(BudgetExceededAlertHandler.name);

  constructor(
    @Inject(ALERT_REPOSITORY)
    private readonly alertRepository: IAlertRepository,
  ) {}

  async handle(event: BudgetExceededEvent): Promise<void> {
    this.logger.log(
      `Budget exceeded for user ${event.userId}: budget ${event.budgetId} — spent ${event.totalSpent} / ${event.totalLimit}`,
    );

    const pct = Math.round((event.totalSpent / event.totalLimit) * 100);

    const alert = Alert.create({
      id: crypto.randomUUID(),
      userId: event.userId,
      alertType: AlertType.OVERSPENDING,
      severity: AlertSeverity.CRITICAL,
      title: `Budget Exceeded: ${event.name}`,
      message: `You have exceeded your ${event.name} budget. Spent ₹${event.totalSpent.toLocaleString('en-IN')} (${pct}%) of ₹${event.totalLimit.toLocaleString('en-IN')} limit.`,
      actionable: true,
      actionUrl: `/dashboard/budgets/${event.budgetId}`,
      metadata: {
        budgetId: event.budgetId,
        totalSpent: event.totalSpent,
        totalLimit: event.totalLimit,
        percentage: pct,
        exceededAt: event.exceededAt,
      },
    });

    try {
      await this.alertRepository.save(alert);
    } catch (err) {
      this.logger.error('Failed to create budget exceeded alert', err);
    }
  }
}

@EventsHandler(BudgetThresholdReachedEvent)
@Injectable()
export class BudgetThresholdAlertHandler implements IEventHandler<BudgetThresholdReachedEvent> {
  private readonly logger = new Logger(BudgetThresholdAlertHandler.name);

  constructor(
    @Inject(ALERT_REPOSITORY)
    private readonly alertRepository: IAlertRepository,
  ) {}

  async handle(event: BudgetThresholdReachedEvent): Promise<void> {
    this.logger.log(
      `Budget threshold ${event.threshold}% reached for user ${event.userId}: ${event.budgetId}`,
    );

    const pct = Math.round(event.spendingPercentage);

    const alert = Alert.create({
      id: crypto.randomUUID(),
      userId: event.userId,
      alertType: AlertType.BUDGET_THRESHOLD,
      severity: event.threshold >= 100 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
      title: `Budget Alert (${pct}%): ${event.name}`,
      message: `You have used ${pct}% of your ${event.name} budget. Spent ₹${event.totalSpent.toLocaleString('en-IN')} of ₹${event.totalLimit.toLocaleString('en-IN')}.`,
      actionable: true,
      actionUrl: `/dashboard/budgets/${event.budgetId}`,
      metadata: {
        budgetId: event.budgetId,
        threshold: event.threshold,
        spendingPercentage: pct,
        totalSpent: event.totalSpent,
        totalLimit: event.totalLimit,
      },
    });

    try {
      await this.alertRepository.save(alert);
    } catch (err) {
      this.logger.error('Failed to create budget threshold alert', err);
    }
  }
}

/** Barrel export used by the module */
export const BudgetAlertHandler = [BudgetExceededAlertHandler, BudgetThresholdAlertHandler];
