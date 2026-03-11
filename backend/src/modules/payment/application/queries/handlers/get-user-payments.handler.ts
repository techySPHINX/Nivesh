import { QueryHandler, IQueryHandler } from "@nestjs/cqrs";
import { Inject } from "@nestjs/common";
import { GetUserPaymentsQuery } from "../get-user-payments.query";
import { PaymentResponseDto } from "../../dto/payment-response.dto";
import {
  IPaymentRepository,
  PAYMENT_REPOSITORY,
} from "../../../domain/repositories/payment.repository.interface";

@QueryHandler(GetUserPaymentsQuery)
export class GetUserPaymentsHandler implements IQueryHandler<GetUserPaymentsQuery> {
  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepository: IPaymentRepository,
  ) {}

  async execute(query: GetUserPaymentsQuery): Promise<{
    payments: PaymentResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { userId, page, limit } = query;
    const skip = (page - 1) * limit;

    const { payments, total } =
      await this.paymentRepository.findByUserIdPaginated(userId, skip, limit);

    return {
      payments: payments.map(PaymentResponseDto.fromEntity),
      total,
      page,
      limit,
    };
  }
}
