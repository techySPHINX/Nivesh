import { BaseEvent, EventType } from '../../../../core/messaging/events/base.event';
import { AccountType } from '../entities/account.entity';

export class AccountCreatedEvent extends BaseEvent {
  constructor(
    public readonly accountId: string,
    public readonly userId: string,
    public readonly accountType: AccountType,
    public readonly bankName: string,
    public readonly initialBalance: number,
  ) {
    super({
      eventType: EventType.ACCOUNT_CREATED,
      aggregateId: accountId,
      aggregateType: 'Account',
    });
  }
}

export class AccountUpdatedEvent extends BaseEvent {
  constructor(
    public readonly accountId: string,
    public readonly userId: string,
    public readonly updates: Record<string, any>,
  ) {
    super({
      eventType: EventType.ACCOUNT_UPDATED,
      aggregateId: accountId,
      aggregateType: 'Account',
    });
  }
}

export class AccountDeletedEvent extends BaseEvent {
  constructor(
    public readonly accountId: string,
    public readonly userId: string,
  ) {
    super({
      eventType: EventType.ACCOUNT_DELETED,
      aggregateId: accountId,
      aggregateType: 'Account',
    });
  }
}
