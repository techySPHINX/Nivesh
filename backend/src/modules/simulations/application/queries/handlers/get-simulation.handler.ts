import { QueryHandler, IQueryHandler } from "@nestjs/cqrs";
import { Inject, NotFoundException, ForbiddenException } from "@nestjs/common";
import { GetSimulationQuery } from "../get-simulation.query";
import { SimulationResponseDto } from "../../dto/simulation-response.dto";
import {
  ISimulationRepository,
  SIMULATION_REPOSITORY,
} from "../../../domain/repositories/simulation.repository.interface";

@QueryHandler(GetSimulationQuery)
export class GetSimulationHandler implements IQueryHandler<GetSimulationQuery> {
  constructor(
    @Inject(SIMULATION_REPOSITORY)
    private readonly simulationRepository: ISimulationRepository,
  ) {}

  async execute(query: GetSimulationQuery): Promise<SimulationResponseDto> {
    const { simulationId, userId } = query;

    const simulation = await this.simulationRepository.findById(simulationId);
    if (!simulation) {
      throw new NotFoundException(`Simulation ${simulationId} not found`);
    }
    if (simulation.userId !== userId) {
      throw new ForbiddenException("Access denied");
    }

    return SimulationResponseDto.fromEntity(simulation);
  }
}
