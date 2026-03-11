import { CreatePaymentDto } from "../dto/create-payment.dto";

export class CreatePaymentCommand {
  constructor(
    public readonly userId: string,
    public readonly createPaymentDto: CreatePaymentDto,
  ) {}
}
