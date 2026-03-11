import {
  IsString,
  IsNumber,
  IsOptional,
  IsEmail,
  Min,
  IsEnum,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreatePaymentDto {
  @ApiProperty({ description: "Payment amount", example: 1500.0 })
  @IsNumber()
  @Min(1, { message: "Payment amount must be at least 1" })
  amount: number;

  @ApiPropertyOptional({
    description: "Currency code",
    example: "INR",
    default: "INR",
  })
  @IsString()
  @IsOptional()
  currency?: string = "INR";

  @ApiProperty({
    description: "Payment description",
    example: "SIP Investment - March 2026",
  })
  @IsString()
  description: string;

  @ApiPropertyOptional({
    description: "Customer email",
    example: "user@example.com",
  })
  @IsEmail()
  @IsOptional()
  customerEmail?: string;

  @ApiPropertyOptional({
    description: "Customer phone",
    example: "+919876543210",
  })
  @IsString()
  @IsOptional()
  customerPhone?: string;

  @ApiPropertyOptional({ description: "Additional metadata" })
  @IsOptional()
  metadata?: Record<string, any>;
}
