import { QueryHandler, IQueryHandler } from "@nestjs/cqrs";
import { Inject } from "@nestjs/common";
import { GetPaymentsByStatusQuery } from "../get-payments-by-status.query";
import { PaymentResponseDto } from "../../dto/payment-response.dto";
import {
  IPaymentRepository,
  PAYMENT_REPOSITORY,
} from "../../../domain/repositories/payment.repository.interface";

@QueryHandler(GetPaymentsByStatusQuery)
export class GetPaymentsByStatusHandler implements IQueryHandler<GetPaymentsByStatusQuery> {
  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
  ) {}

  async execute(
    query: GetPaymentsByStatusQuery,
  ): Promise<PaymentResponseDto[]> {
    const { userId, status } = query;
    const payments = await this.paymentRepository.findByStatus(userId, status);
    return payments.map(PaymentResponseDto.fromEntity);
  }
}
