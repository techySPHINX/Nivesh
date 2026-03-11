import {
  BaseEvent,
  EventType,
} from "../../../../core/messaging/events/base.event";
import { PaymentMethod, PaymentStatus } from "../entities/payment.entity";

export class PaymentCreatedEvent extends BaseEvent {
  constructor(
    public readonly paymentId: string,
    public readonly userId: string,
    public readonly orderId: string,
    public readonly amount: number,
    public readonly currency: string,
    public readonly description: string,
  ) {
    super({
      eventType: "payment.created",
      aggregateId: paymentId,
      aggregateType: "Payment",
    });
  }
}

export class PaymentAuthorizedEvent extends BaseEvent {
  constructor(
    public readonly paymentId: string,
    public readonly userId: string,
    public readonly gatewayPaymentId: string,
    public readonly method: PaymentMethod,
  ) {
    super({
      eventType: "payment.authorized",
      aggregateId: paymentId,
      aggregateType: "Payment",
    });
  }
}

export class PaymentCapturedEvent extends BaseEvent {
  constructor(
    public readonly paymentId: string,
    public readonly userId: string,
    public readonly amount: number,
    public readonly method: PaymentMethod,
    public readonly capturedAt: Date,
  ) {
    super({
      eventType: "payment.captured",
      aggregateId: paymentId,
      aggregateType: "Payment",
    });
  }
}

export class PaymentFailedEvent extends BaseEvent {
  constructor(
    public readonly paymentId: string,
    public readonly userId: string,
    public readonly errorCode: string,
    public readonly errorDescription: string,
  ) {
    super({
      eventType: "payment.failed",
      aggregateId: paymentId,
      aggregateType: "Payment",
    });
  }
}

export class PaymentRefundedEvent extends BaseEvent {
  constructor(
    public readonly paymentId: string,
    public readonly userId: string,
    public readonly amount: number,
    public readonly isPartial: boolean,
    public readonly refundedAt: Date,
  ) {
    super({
      eventType: "payment.refunded",
      aggregateId: paymentId,
      aggregateType: "Payment",
    });
  }
}

export class PaymentCancelledEvent extends BaseEvent {
  constructor(
    public readonly paymentId: string,
    public readonly userId: string,
    public readonly cancelledAt: Date,
  ) {
    super({
      eventType: "payment.cancelled",
      aggregateId: paymentId,
      aggregateType: "Payment",
    });
  }
}
