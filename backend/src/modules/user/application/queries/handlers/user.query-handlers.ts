import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { GetUserQuery, GetUserByEmailQuery, GetUserByFirebaseUidQuery, GetAllUsersQuery } from '../user.queries';
import { User } from '../../../domain/entities/user.entity';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../../domain/repositories/user.repository.interface';
import { EntityNotFoundException } from '../../../../../core/exceptions/base.exception';

@QueryHandler(GetUserQuery)
export class GetUserHandler implements IQueryHandler<GetUserQuery> {
  private readonly logger = new Logger(GetUserHandler.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) { }

  async execute(query: GetUserQuery): Promise<User> {
    this.logger.debug(`Fetching user: ${query.userId}`);

    const user = await this.userRepository.findById(query.userId);

    if (!user) {
      throw new EntityNotFoundException('User', query.userId);
    }

    return user;
  }
}

@QueryHandler(GetUserByEmailQuery)
export class GetUserByEmailHandler implements IQueryHandler<GetUserByEmailQuery> {
  private readonly logger = new Logger(GetUserByEmailHandler.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) { }

  async execute(query: GetUserByEmailQuery): Promise<User> {
    this.logger.debug(`Fetching user by email: ${query.email}`);

    const user = await this.userRepository.findByEmail(query.email);

    if (!user) {
      throw new EntityNotFoundException('User', query.email);
    }

    return user;
  }
}

@QueryHandler(GetUserByFirebaseUidQuery)
export class GetUserByFirebaseUidHandler
  implements IQueryHandler<GetUserByFirebaseUidQuery> {
  private readonly logger = new Logger(GetUserByFirebaseUidHandler.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) { }

  async execute(query: GetUserByFirebaseUidQuery): Promise<User> {
    this.logger.debug(`Fetching user by Firebase UID: ${query.firebaseUid}`);

    const user = await this.userRepository.findByFirebaseUid(query.firebaseUid);

    if (!user) {
      throw new EntityNotFoundException('User', query.firebaseUid);
    }

    return user;
  }
}

@QueryHandler(GetAllUsersQuery)
export class GetAllUsersHandler implements IQueryHandler<GetAllUsersQuery> {
  private readonly logger = new Logger(GetAllUsersHandler.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) { }

  async execute(query: GetAllUsersQuery): Promise<{ users: User[]; total: number }> {
    this.logger.debug('Fetching all users');

    return await this.userRepository.findAll({
      skip: query.skip,
      take: query.take,
      isActive: query.isActive,
    });
  }
}
