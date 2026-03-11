import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  Max,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SimulationType } from "../../domain/entities/simulation.entity";

export class RunSimulationDto {
  @ApiProperty({
    description: "Simulation name",
    example: "Retirement Planning 2050",
  })
  @IsString()
  name: string;

  @ApiProperty({ enum: SimulationType, example: SimulationType.MONTE_CARLO })
  @IsEnum(SimulationType)
  type: SimulationType;

  @ApiPropertyOptional({ description: "Scenario description" })
  @IsString()
  @IsOptional()
  scenario?: string;

  @ApiProperty({ description: "Initial investment amount", example: 100000 })
  @IsNumber()
  @Min(0)
  initialAmount: number;

  @ApiProperty({ description: "Monthly contribution", example: 10000 })
  @IsNumber()
  @Min(0)
  monthlyContribution: number;

  @ApiProperty({ description: "Investment duration in months", example: 120 })
  @IsNumber()
  @Min(1)
  @Max(600)
  durationMonths: number;

  @ApiProperty({
    description: "Expected annual return rate (decimal)",
    example: 0.12,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  expectedAnnualReturn: number;

  @ApiProperty({
    description: "Risk level",
    enum: ["conservative", "moderate", "aggressive"],
    example: "moderate",
  })
  @IsString()
  riskLevel: "conservative" | "moderate" | "aggressive";

  @ApiPropertyOptional({
    description: "Annual inflation rate (decimal)",
    example: 0.06,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(0.5)
  inflationRate?: number;

  @ApiPropertyOptional({
    description: "Number of Monte Carlo iterations",
    example: 1000,
  })
  @IsNumber()
  @IsOptional()
  @Min(100)
  @Max(10000)
  iterations?: number;
}
