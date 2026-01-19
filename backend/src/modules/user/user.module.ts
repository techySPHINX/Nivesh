import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

// Controllers
import { UserController } from './presentation/user.controller';

// Command Handlers
import { CreateUserHandler } from './application/commands/handlers/create-user.handler';
import { UpdateUserHandler } from './application/commands/handlers/update-user.handler';

// Query Handlers
import {
  GetUserHandler,
  GetUserByEmailHandler,
  GetUserByFirebaseUidHandler,
  GetAllUsersHandler,
} from './application/queries/handlers/user.query-handlers';

// Repository
import { UserRepository } from './infrastructure/persistence/user.repository';
import { USER_REPOSITORY } from './domain/repositories/user.repository.interface';

// Core modules
import { DatabaseModule } from '../../core/database/database.module';
import { MessagingModule } from '../../core/messaging/messaging.module';

const CommandHandlers = [CreateUserHandler, UpdateUserHandler];

const QueryHandlers = [
  GetUserHandler,
  GetUserByEmailHandler,
  GetUserByFirebaseUidHandler,
  GetAllUsersHandler,
];

@Module({
  imports: [CqrsModule, DatabaseModule, MessagingModule],
  controllers: [UserController],
  providers: [
    // Repository
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
    // Handlers
    ...CommandHandlers,
    ...QueryHandlers,
  ],
  exports: [USER_REPOSITORY],
})
export class UserModule { }
