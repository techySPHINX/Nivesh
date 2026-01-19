import { IQuery } from '@nestjs/cqrs';

export class GetUserQuery implements IQuery {
  constructor(public readonly userId: string) { }
}

export class GetUserByEmailQuery implements IQuery {
  constructor(public readonly email: string) { }
}

export class GetUserByFirebaseUidQuery implements IQuery {
  constructor(public readonly firebaseUid: string) { }
}

export class GetAllUsersQuery implements IQuery {
  constructor(
    public readonly skip: number = 0,
    public readonly take: number = 10,
    public readonly isActive?: boolean,
  ) { }
}
