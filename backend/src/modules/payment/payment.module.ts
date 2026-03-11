import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { DatabaseModule } from "../../core/database/database.module";
import { PaymentController } from "./presentation/payment.controller";
import {
  CreatePaymentHandler,
  VerifyPaymentHandler,
  CancelPaymentHandler,
  RefundPaymentHandler,
} from "./application/commands/handlers";
import {
  GetPaymentHandler,
  GetUserPaymentsHandler,
  GetPaymentsByStatusHandler,
} from "./application/queries/handlers";
import { PaymentRepository } from "./infrastructure/repositories/payment.repository";
import { PAYMENT_REPOSITORY } from "./domain/repositories/payment.repository.interface";

const CommandHandlers = [
  CreatePaymentHandler,
  VerifyPaymentHandler,
  CancelPaymentHandler,
  RefundPaymentHandler,
];

const QueryHandlers = [
  GetPaymentHandler,
  GetUserPaymentsHandler,
  GetPaymentsByStatusHandler,
];

const Repositories = [
  { provide: PAYMENT_REPOSITORY, useClass: PaymentRepository },
];

@Module({
  imports: [CqrsModule, DatabaseModule],
  controllers: [PaymentController],
  providers: [...CommandHandlers, ...QueryHandlers, ...Repositories],
  exports: [PAYMENT_REPOSITORY],
})
export class PaymentModule {}
