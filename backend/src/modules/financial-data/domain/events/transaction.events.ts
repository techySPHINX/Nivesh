import { BaseEvent, EventType } from '../../../../core/messaging/events/base.event';
import { TransactionType, TransactionCategory } from '../entities/transaction.entity';

export class TransactionCreatedEvent extends BaseEvent {
  constructor(
    public readonly transactionId: string,
    public readonly userId: string,
    public readonly accountId: string,
    public readonly type: TransactionType,
    public readonly amount: number,
    public readonly category: TransactionCategory,
  ) {
    super({
      eventType: EventType.TRANSACTION_CREATED,
      aggregateId: transactionId,
      aggregateType: 'Transaction',
    });
  }
}

export class TransactionUpdatedEvent extends BaseEvent {
  constructor(
    public readonly transactionId: string,
    public readonly userId: string,
    public readonly updates: Record<string, any>,
  ) {
    super({
      eventType: EventType.TRANSACTION_UPDATED,
      aggregateId: transactionId,
      aggregateType: 'Transaction',
    });
  }
}

export class TransactionDeletedEvent extends BaseEvent {
  constructor(
    public readonly transactionId: string,
    public readonly userId: string,
  ) {
    super({
      eventType: EventType.TRANSACTION_DELETED,
      aggregateId: transactionId,
      aggregateType: 'Transaction',
    });
  }
}
