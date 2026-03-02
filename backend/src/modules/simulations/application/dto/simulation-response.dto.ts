import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Simulation,
  SimulationType,
  SimulationStatus,
  SimulationResults,
} from '../../domain/entities/simulation.entity';

export class SimulationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: SimulationType })
  type: SimulationType;

  @ApiPropertyOptional()
  scenario: string | null;

  @ApiProperty()
  inputParameters: Record<string, any>;

  @ApiPropertyOptional()
  results: SimulationResults | null;

  @ApiProperty({ enum: SimulationStatus })
  status: SimulationStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  completedAt: Date | null;

  static fromEntity(simulation: Simulation): SimulationResponseDto {
    const dto = new SimulationResponseDto();
    dto.id = simulation.id;
    dto.userId = simulation.userId;
    dto.name = simulation.name;
    dto.type = simulation.type;
    dto.scenario = simulation.scenario;
    dto.inputParameters = simulation.inputParameters;
    dto.results = simulation.results;
    dto.status = simulation.status;
    dto.createdAt = simulation.createdAt;
    dto.completedAt = simulation.completedAt;
    return dto;
  }
}
