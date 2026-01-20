import { BaseEvent, EventType } from '../../../../core/messaging/events/base.event';

/**
 * User Created Event
 */
export class UserCreatedEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly phoneNumber: string | null,
  ) {
    super({
      eventType: EventType.USER_CREATED,
      aggregateId: userId,
      aggregateType: 'User',
    });
  }
}

/**
 * User Updated Event
 */
export class UserUpdatedEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    public readonly updates: Record<string, any>,
  ) {
    super({
      eventType: EventType.USER_UPDATED,
      aggregateId: userId,
      aggregateType: 'User',
    });
  }
}

/**
 * User Deleted Event
 */
export class UserDeletedEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
  ) {
    super({
      eventType: EventType.USER_DELETED,
      aggregateId: userId,
      aggregateType: 'User',
    });
  }
}
