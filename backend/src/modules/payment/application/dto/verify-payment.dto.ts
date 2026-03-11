import { IsString, IsEnum } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { PaymentMethod } from "../../domain/entities/payment.entity";

export class VerifyPaymentDto {
  @ApiProperty({ description: "Gateway payment ID", example: "pay_ABC123" })
  @IsString()
  gatewayPaymentId: string;

  @ApiProperty({ description: "Gateway order ID", example: "order_XYZ789" })
  @IsString()
  gatewayOrderId: string;

  @ApiProperty({
    description: "Gateway signature for verification",
    example: "sig_hash",
  })
  @IsString()
  gatewaySignature: string;

  @ApiProperty({
    description: "Payment method used",
    enum: PaymentMethod,
    example: PaymentMethod.UPI,
  })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;
}
