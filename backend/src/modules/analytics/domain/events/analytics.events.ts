import { BaseEvent } from '../../../../core/messaging/events/base.event';

export class SpendingTrendsQueriedEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    public readonly granularity: string,
    public readonly periodFrom: string,
    public readonly periodTo: string,
  ) {
    super('analytics.spending-trends.queried');
  }
}

export class CategoryBreakdownQueriedEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    public readonly periodFrom: string,
    public readonly periodTo: string,
  ) {
    super('analytics.category-breakdown.queried');
  }
}

export class NetWorthHistoryQueriedEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    public readonly periodFrom: string,
    public readonly periodTo: string,
  ) {
    super('analytics.net-worth-history.queried');
  }
}
