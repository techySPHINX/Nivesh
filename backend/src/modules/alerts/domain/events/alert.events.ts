import { BaseEvent } from "../../../../core/messaging/events/base.event";
import { AlertType, AlertSeverity } from "../entities/alert.entity";

export class AlertCreatedEvent extends BaseEvent {
  constructor(
    public readonly alertId: string,
    public readonly userId: string,
    public readonly alertType: AlertType,
    public readonly severity: AlertSeverity,
    public readonly title: string,
  ) {
    super({
      eventType: "alert.created",
      aggregateId: alertId,
      aggregateType: "Alert",
    });
  }
}

export class AlertReadEvent extends BaseEvent {
  constructor(
    public readonly alertId: string,
    public readonly userId: string,
  ) {
    super({
      eventType: "alert.read",
      aggregateId: alertId,
      aggregateType: "Alert",
    });
  }
}

export class AlertDismissedEvent extends BaseEvent {
  constructor(
    public readonly alertId: string,
    public readonly userId: string,
  ) {
    super({
      eventType: "alert.dismissed",
      aggregateId: alertId,
      aggregateType: "Alert",
    });
  }
}

export class AlertRuleCreatedEvent extends BaseEvent {
  constructor(
    public readonly ruleId: string,
    public readonly userId: string,
    public readonly ruleType: string,
    public readonly name: string,
  ) {
    super({
      eventType: "alert.rule.created",
      aggregateId: ruleId,
      aggregateType: "AlertRule",
    });
  }
}

export class AlertRuleTriggeredEvent extends BaseEvent {
  constructor(
    public readonly ruleId: string,
    public readonly userId: string,
    public readonly alertId: string,
  ) {
    super({
      eventType: "alert.rule.triggered",
      aggregateId: ruleId,
      aggregateType: "AlertRule",
    });
  }
}
