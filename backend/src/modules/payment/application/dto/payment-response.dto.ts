import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  PaymentStatus,
  PaymentMethod,
  Payment,
} from "../../domain/entities/payment.entity";

export class PaymentResponseDto {
  @ApiProperty({ example: "uuid-string" })
  id: string;

  @ApiProperty({ example: "user-uuid" })
  userId: string;

  @ApiProperty({ example: "order-uuid" })
  orderId: string;

  @ApiProperty({ example: 1500.0 })
  amount: number;

  @ApiProperty({ example: "INR" })
  currency: string;

  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.CREATED })
  status: PaymentStatus;

  @ApiPropertyOptional({ enum: PaymentMethod })
  method: PaymentMethod | null;

  @ApiProperty({ example: "SIP Investment - March 2026" })
  description: string;

  @ApiPropertyOptional({ example: "pay_ABC123" })
  gatewayPaymentId: string | null;

  @ApiPropertyOptional({ example: "order_XYZ789" })
  gatewayOrderId: string | null;

  @ApiPropertyOptional()
  errorCode: string | null;

  @ApiPropertyOptional()
  errorDescription: string | null;

  @ApiProperty({ example: true })
  isSuccessful: boolean;

  @ApiProperty({ example: false })
  canBeRefunded: boolean;

  @ApiProperty({ example: "2026-03-01T10:00:00.000Z" })
  createdAt: Date;

  @ApiProperty({ example: "2026-03-01T10:00:00.000Z" })
  updatedAt: Date;

  static fromEntity(payment: Payment): PaymentResponseDto {
    const dto = new PaymentResponseDto();
    dto.id = payment.id;
    dto.userId = payment.userId;
    dto.orderId = payment.orderId;
    dto.amount = payment.amount;
    dto.currency = payment.currency;
    dto.status = payment.status;
    dto.method = payment.method;
    dto.description = payment.description;
    dto.gatewayPaymentId = payment.gatewayPaymentId;
    dto.gatewayOrderId = payment.gatewayOrderId;
    dto.errorCode = payment.errorCode;
    dto.errorDescription = payment.errorDescription;
    dto.isSuccessful = payment.isSuccessful();
    dto.canBeRefunded = payment.canBeRefunded();
    dto.createdAt = payment.createdAt;
    dto.updatedAt = payment.updatedAt;
    return dto;
  }
}
