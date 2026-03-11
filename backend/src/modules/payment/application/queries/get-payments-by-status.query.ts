import { PaymentStatus } from "../../domain/entities/payment.entity";

export class GetPaymentsByStatusQuery {
  constructor(
    public readonly userId: string,
    public readonly status: PaymentStatus,
  ) {}
}
