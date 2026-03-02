import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DeleteSimulationCommand } from '../delete-simulation.command';
import {
  ISimulationRepository,
  SIMULATION_REPOSITORY,
} from '../../../domain/repositories/simulation.repository.interface';

@CommandHandler(DeleteSimulationCommand)
export class DeleteSimulationHandler implements ICommandHandler<DeleteSimulationCommand> {
  private readonly logger = new Logger(DeleteSimulationHandler.name);

  constructor(
    @Inject(SIMULATION_REPOSITORY)
    private readonly simulationRepository: ISimulationRepository,
  ) {}

  async execute(command: DeleteSimulationCommand): Promise<void> {
    const { simulationId, userId } = command;

    const simulation = await this.simulationRepository.findById(simulationId);
    if (!simulation) {
      throw new NotFoundException(`Simulation ${simulationId} not found`);
    }
    if (simulation.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    await this.simulationRepository.delete(simulationId);
    this.logger.log(`Simulation deleted: ${simulationId}`);
  }
}
