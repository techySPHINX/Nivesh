import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DatabaseModule } from '../../core/database/database.module';
import { SimulationController } from './presentation/simulation.controller';
import {
  RunSimulationHandler,
  DeleteSimulationHandler,
} from './application/commands/handlers';
import {
  GetSimulationHandler,
  GetSimulationHistoryHandler,
} from './application/queries/handlers';
import { SimulationRepository } from './infrastructure/repositories/simulation.repository';
import { SIMULATION_REPOSITORY } from './domain/repositories/simulation.repository.interface';

const CommandHandlers = [RunSimulationHandler, DeleteSimulationHandler];
const QueryHandlers = [GetSimulationHandler, GetSimulationHistoryHandler];
const Repositories = [
  { provide: SIMULATION_REPOSITORY, useClass: SimulationRepository },
];

@Module({
  imports: [CqrsModule, DatabaseModule],
  controllers: [SimulationController],
  providers: [...CommandHandlers, ...QueryHandlers, ...Repositories],
  exports: [SIMULATION_REPOSITORY],
})
export class SimulationsModule {}
