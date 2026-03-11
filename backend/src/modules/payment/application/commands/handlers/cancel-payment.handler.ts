import { CommandHandler, ICommandHandler, EventBus } from "@nestjs/cqrs";
import {
  Inject,
  Logger,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { CancelPaymentCommand } from "../cancel-payment.command";
import {
  IPaymentRepository,
  PAYMENT_REPOSITORY,
} from "../../../domain/repositories/payment.repository.interface";
import { PaymentCancelledEvent } from "../../../domain/events/payment.events";

@CommandHandler(CancelPaymentCommand)
export class CancelPaymentHandler implements ICommandHandler<CancelPaymentCommand> {
  private readonly logger = new Logger(CancelPaymentHandler.name);

  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CancelPaymentCommand): Promise<void> {
    const { paymentId, userId } = command;

    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }
    if (payment.userId !== userId) {
      throw new ForbiddenException("Access denied to this payment");
    }

    payment.cancel();
    await this.paymentRepository.save(payment);

    this.eventBus.publish(
      new PaymentCancelledEvent(payment.id, payment.userId, new Date()),
    );

    this.logger.log(`Payment cancelled: ${paymentId}`);
  }
}
