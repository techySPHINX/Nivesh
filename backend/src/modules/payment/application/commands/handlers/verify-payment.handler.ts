import { CommandHandler, ICommandHandler, EventBus } from "@nestjs/cqrs";
import {
  Inject,
  Logger,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { VerifyPaymentCommand } from "../verify-payment.command";
import { PaymentResponseDto } from "../../dto/payment-response.dto";
import {
  IPaymentRepository,
  PAYMENT_REPOSITORY,
} from "../../../domain/repositories/payment.repository.interface";
import {
  PaymentAuthorizedEvent,
  PaymentCapturedEvent,
} from "../../../domain/events/payment.events";

@CommandHandler(VerifyPaymentCommand)
export class VerifyPaymentHandler implements ICommandHandler<VerifyPaymentCommand> {
  private readonly logger = new Logger(VerifyPaymentHandler.name);

  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: VerifyPaymentCommand): Promise<PaymentResponseDto> {
    const { paymentId, userId, verifyPaymentDto } = command;

    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }
    if (payment.userId !== userId) {
      throw new ForbiddenException("Access denied to this payment");
    }

    // Step 1: Authorize with gateway details
    payment.authorize(
      verifyPaymentDto.gatewayPaymentId,
      verifyPaymentDto.gatewayOrderId,
      verifyPaymentDto.method,
    );

    this.eventBus.publish(
      new PaymentAuthorizedEvent(
        payment.id,
        payment.userId,
        verifyPaymentDto.gatewayPaymentId,
        verifyPaymentDto.method,
      ),
    );

    // Step 2: Capture with signature verification
    payment.capture(verifyPaymentDto.gatewaySignature);

    const savedPayment = await this.paymentRepository.save(payment);

    this.eventBus.publish(
      new PaymentCapturedEvent(
        payment.id,
        payment.userId,
        payment.amount,
        verifyPaymentDto.method,
        new Date(),
      ),
    );

    this.logger.log(`Payment verified & captured: ${paymentId}`);
    return PaymentResponseDto.fromEntity(savedPayment);
  }
}
