import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../../core/database/postgres/prisma.service";
import { IPaymentRepository } from "../../domain/repositories/payment.repository.interface";
import {
  Payment,
  PaymentStatus,
  PaymentMethod,
} from "../../domain/entities/payment.entity";

@Injectable()
export class PaymentRepository implements IPaymentRepository {
  private readonly logger = new Logger(PaymentRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async save(payment: Payment): Promise<Payment> {
    const data = {
      id: payment.id,
      userId: payment.userId,
      orderId: payment.orderId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      method: payment.method,
      gatewayPaymentId: payment.gatewayPaymentId,
      gatewayOrderId: payment.gatewayOrderId,
      gatewaySignature: payment.gatewaySignature,
      description: payment.description,
      customerEmail: payment.customerEmail,
      customerPhone: payment.customerPhone,
      metadata: payment.metadata || undefined,
      errorCode: payment.errorCode,
      errorDescription: payment.errorDescription,
    };

    const result = await this.prisma.payment.upsert({
      where: { id: payment.id },
      create: data,
      update: data,
    });

    return Payment.fromPersistence(result);
  }

  async findById(id: string): Promise<Payment | null> {
    const result = await this.prisma.payment.findUnique({ where: { id } });
    return result ? Payment.fromPersistence(result) : null;
  }

  async findByOrderId(orderId: string): Promise<Payment | null> {
    const result = await this.prisma.payment.findUnique({ where: { orderId } });
    return result ? Payment.fromPersistence(result) : null;
  }

  async findByUserId(userId: string): Promise<Payment[]> {
    const results = await this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return results.map(Payment.fromPersistence);
  }

  async findByUserIdPaginated(
    userId: string,
    skip: number,
    take: number,
  ): Promise<{ payments: Payment[]; total: number }> {
    const [results, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      this.prisma.payment.count({ where: { userId } }),
    ]);

    return {
      payments: results.map(Payment.fromPersistence),
      total,
    };
  }

  async findByStatus(
    userId: string,
    status: PaymentStatus,
  ): Promise<Payment[]> {
    const results = await this.prisma.payment.findMany({
      where: { userId, status },
      orderBy: { createdAt: "desc" },
    });
    return results.map(Payment.fromPersistence);
  }

  async findByMethod(
    userId: string,
    method: PaymentMethod,
  ): Promise<Payment[]> {
    const results = await this.prisma.payment.findMany({
      where: { userId, method },
      orderBy: { createdAt: "desc" },
    });
    return results.map(Payment.fromPersistence);
  }

  async findByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Payment[]> {
    const results = await this.prisma.payment.findMany({
      where: {
        userId,
        createdAt: { gte: startDate, lte: endDate },
      },
      orderBy: { createdAt: "desc" },
    });
    return results.map(Payment.fromPersistence);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.payment.delete({ where: { id } });
  }
}
