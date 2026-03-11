import { CommandHandler, ICommandHandler, EventBus } from "@nestjs/cqrs";
import {
  Inject,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { RefundPaymentCommand } from "../refund-payment.command";
import { PaymentResponseDto } from "../../dto/payment-response.dto";
import {
  IPaymentRepository,
  PAYMENT_REPOSITORY,
} from "../../../domain/repositories/payment.repository.interface";
import { PaymentRefundedEvent } from "../../../domain/events/payment.events";

@CommandHandler(RefundPaymentCommand)
export class RefundPaymentHandler implements ICommandHandler<RefundPaymentCommand> {
  private readonly logger = new Logger(RefundPaymentHandler.name);

  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: RefundPaymentCommand): Promise<PaymentResponseDto> {
    const { paymentId, userId, isPartial } = command;

    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }
    if (payment.userId !== userId) {
      throw new ForbiddenException("Access denied to this payment");
    }

    if (!payment.canBeRefunded()) {
      throw new BadRequestException(
        `Payment ${paymentId} cannot be refunded in ${payment.status} status`,
      );
    }

    payment.refund(isPartial);
    const savedPayment = await this.paymentRepository.save(payment);

    this.eventBus.publish(
      new PaymentRefundedEvent(
        payment.id,
        payment.userId,
        payment.amount,
        isPartial,
        new Date(),
      ),
    );

    this.logger.log(
      `Payment ${isPartial ? "partially " : ""}refunded: ${paymentId}`,
    );
    return PaymentResponseDto.fromEntity(savedPayment);
  }
}
