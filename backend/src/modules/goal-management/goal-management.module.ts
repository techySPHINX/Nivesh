import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DatabaseModule } from '../../core/database/database.module';

// Controllers
import { GoalController } from './presentation/goal.controller';

// Command Handlers
import { CreateGoalHandler } from './application/handlers/create-goal.handler';
import { UpdateGoalHandler } from './application/handlers/update-goal.handler';
import { AddContributionHandler } from './application/handlers/add-contribution.handler';
import { DeleteGoalHandler } from './application/handlers/delete-goal.handler';
import { PauseGoalHandler } from './application/handlers/pause-goal.handler';
import { ResumeGoalHandler } from './application/handlers/resume-goal.handler';
import { CancelGoalHandler } from './application/handlers/cancel-goal.handler';

// Query Handlers
import { GetGoalByIdHandler } from './application/handlers/get-goal-by-id.handler';
import { GetUserGoalsHandler } from './application/handlers/get-user-goals.handler';
import { GetGoalContributionsHandler } from './application/handlers/get-goal-contributions.handler';
import { GetGoalStatisticsHandler } from './application/handlers/get-goal-statistics.handler';

// Repositories
import { GoalRepository } from './infrastructure/repositories/goal.repository';
import { GoalContributionRepository } from './infrastructure/repositories/goal-contribution.repository';
import { GOAL_REPOSITORY } from './domain/repositories/goal.repository.interface';
import { GOAL_CONTRIBUTION_REPOSITORY } from './domain/repositories/goal-contribution.repository.interface';

const CommandHandlers = [
  CreateGoalHandler,
  UpdateGoalHandler,
  AddContributionHandler,
  DeleteGoalHandler,
  PauseGoalHandler,
  ResumeGoalHandler,
  CancelGoalHandler,
];

const QueryHandlers = [
  GetGoalByIdHandler,
  GetUserGoalsHandler,
  GetGoalContributionsHandler,
  GetGoalStatisticsHandler,
];

const Repositories = [
  {
    provide: GOAL_REPOSITORY,
    useClass: GoalRepository,
  },
  {
    provide: GOAL_CONTRIBUTION_REPOSITORY,
    useClass: GoalContributionRepository,
  },
];

@Module({
  imports: [CqrsModule, DatabaseModule],
  controllers: [GoalController],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    ...Repositories,
  ],
  exports: [GOAL_REPOSITORY, GOAL_CONTRIBUTION_REPOSITORY],
})
export class GoalManagementModule { }
