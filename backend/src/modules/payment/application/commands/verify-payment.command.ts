import { VerifyPaymentDto } from "../dto/verify-payment.dto";

export class VerifyPaymentCommand {
  constructor(
    public readonly paymentId: string,
    public readonly userId: string,
    public readonly verifyPaymentDto: VerifyPaymentDto,
  ) {}
}
