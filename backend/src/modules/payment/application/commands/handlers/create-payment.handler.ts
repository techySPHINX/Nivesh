import { CommandHandler, ICommandHandler, EventBus } from "@nestjs/cqrs";
import { Inject, Logger, BadRequestException } from "@nestjs/common";
import { CreatePaymentCommand } from "../create-payment.command";
import { PaymentResponseDto } from "../../dto/payment-response.dto";
import {
  IPaymentRepository,
  PAYMENT_REPOSITORY,
} from "../../../domain/repositories/payment.repository.interface";
import { Payment } from "../../../domain/entities/payment.entity";
import { PaymentCreatedEvent } from "../../../domain/events/payment.events";

@CommandHandler(CreatePaymentCommand)
export class CreatePaymentHandler implements ICommandHandler<CreatePaymentCommand> {
  private readonly logger = new Logger(CreatePaymentHandler.name);

  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreatePaymentCommand): Promise<PaymentResponseDto> {
    const { userId, createPaymentDto } = command;

    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const payment = Payment.create({
      id: crypto.randomUUID(),
      userId,
      orderId,
      amount: createPaymentDto.amount,
      currency: createPaymentDto.currency || "INR",
      description: createPaymentDto.description,
      customerEmail: createPaymentDto.customerEmail,
      customerPhone: createPaymentDto.customerPhone,
      metadata: createPaymentDto.metadata,
    });

    const savedPayment = await this.paymentRepository.save(payment);

    this.eventBus.publish(
      new PaymentCreatedEvent(
        savedPayment.id,
        savedPayment.userId,
        savedPayment.orderId,
        savedPayment.amount,
        savedPayment.currency,
        savedPayment.description,
      ),
    );

    this.logger.log(`Payment created: ${savedPayment.id} for user ${userId}`);
    return PaymentResponseDto.fromEntity(savedPayment);
  }
}
