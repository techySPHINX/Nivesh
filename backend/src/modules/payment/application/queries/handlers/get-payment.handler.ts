import { QueryHandler, IQueryHandler } from "@nestjs/cqrs";
import { Inject, NotFoundException, ForbiddenException } from "@nestjs/common";
import { GetPaymentQuery } from "../get-payment.query";
import { PaymentResponseDto } from "../../dto/payment-response.dto";
import {
  IPaymentRepository,
  PAYMENT_REPOSITORY,
} from "../../../domain/repositories/payment.repository.interface";

@QueryHandler(GetPaymentQuery)
export class GetPaymentHandler implements IQueryHandler<GetPaymentQuery> {
  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
  ) {}

  async execute(query: GetPaymentQuery): Promise<PaymentResponseDto> {
    const { paymentId, userId } = query;

    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }
    if (payment.userId !== userId) {
      throw new ForbiddenException("Access denied to this payment");
    }

    return PaymentResponseDto.fromEntity(payment);
  }
}
