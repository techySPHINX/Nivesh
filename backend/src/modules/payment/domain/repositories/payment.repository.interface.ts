import {
  Payment,
  PaymentStatus,
  PaymentMethod,
} from "../entities/payment.entity";

export interface IPaymentRepository {
  save(payment: Payment): Promise<Payment>;
  findById(id: string): Promise<Payment | null>;
  findByOrderId(orderId: string): Promise<Payment | null>;
  findByUserId(userId: string): Promise<Payment[]>;
  findByUserIdPaginated(
    userId: string,
    skip: number,
    take: number,
  ): Promise<{ payments: Payment[]; total: number }>;
  findByStatus(userId: string, status: PaymentStatus): Promise<Payment[]>;
  findByMethod(userId: string, method: PaymentMethod): Promise<Payment[]>;
  findByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Payment[]>;
  delete(id: string): Promise<void>;
}

export const PAYMENT_REPOSITORY = Symbol("PAYMENT_REPOSITORY");
