import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetSimulationHistoryQuery } from '../get-simulation-history.query';
import { SimulationResponseDto } from '../../dto/simulation-response.dto';
import {
  ISimulationRepository,
  SIMULATION_REPOSITORY,
} from '../../../domain/repositories/simulation.repository.interface';

@QueryHandler(GetSimulationHistoryQuery)
export class GetSimulationHistoryHandler
  implements IQueryHandler<GetSimulationHistoryQuery>
{
  constructor(
    @Inject(SIMULATION_REPOSITORY)
    private readonly simulationRepository: ISimulationRepository,
  ) {}

  async execute(
    query: GetSimulationHistoryQuery,
  ): Promise<{ simulations: SimulationResponseDto[]; total: number; page: number; limit: number }> {
    const { userId, page, limit } = query;
    const skip = (page - 1) * limit;

    const { simulations, total } =
      await this.simulationRepository.findByUserIdPaginated(userId, skip, limit);

    return {
      simulations: simulations.map(SimulationResponseDto.fromEntity),
      total,
      page,
      limit,
    };
  }
}
