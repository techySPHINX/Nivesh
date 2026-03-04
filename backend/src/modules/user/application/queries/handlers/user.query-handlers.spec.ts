import { Test, TestingModule } from '@nestjs/testing';
import {
  GetUserHandler,
  GetUserByEmailHandler,
  GetUserByFirebaseUidHandler,
  GetAllUsersHandler,
} from './user.query-handlers';
import {
  GetUserQuery,
  GetUserByEmailQuery,
  GetUserByFirebaseUidQuery,
  GetAllUsersQuery,
} from '../user.queries';
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface';
import { EntityNotFoundException } from '../../../../../core/exceptions/base.exception';

const mockUser = {
  id: 'user-123',
  email: { getValue: () => 'test@example.com' },
  name: { getFirstName: () => 'John', getLastName: () => 'Doe' },
  isActive: true,
};

describe('User Query Handlers', () => {
  let userRepository: Record<string, jest.Mock>;

  beforeEach(() => {
    userRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByFirebaseUid: jest.fn(),
      findAll: jest.fn(),
    };
    jest.clearAllMocks();
  });

  // ─── GetUserHandler ───────────────────────────────────────────────────

  describe('GetUserHandler', () => {
    let handler: GetUserHandler;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GetUserHandler,
          { provide: USER_REPOSITORY, useValue: userRepository },
        ],
      }).compile();

      handler = module.get<GetUserHandler>(GetUserHandler);
    });

    it('should return a user by id', async () => {
      userRepository.findById.mockResolvedValue(mockUser);

      const result = await handler.execute(new GetUserQuery('user-123'));

      expect(result).toEqual(mockUser);
      expect(userRepository.findById).toHaveBeenCalledWith('user-123');
    });

    it('should throw EntityNotFoundException when user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(
        handler.execute(new GetUserQuery('nonexistent')),
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should propagate repository errors', async () => {
      userRepository.findById.mockRejectedValue(new Error('DB error'));

      await expect(
        handler.execute(new GetUserQuery('user-123')),
      ).rejects.toThrow('DB error');
    });
  });

  // ─── GetUserByEmailHandler ────────────────────────────────────────────

  describe('GetUserByEmailHandler', () => {
    let handler: GetUserByEmailHandler;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GetUserByEmailHandler,
          { provide: USER_REPOSITORY, useValue: userRepository },
        ],
      }).compile();

      handler = module.get<GetUserByEmailHandler>(GetUserByEmailHandler);
    });

    it('should return a user by email', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);

      const result = await handler.execute(
        new GetUserByEmailQuery('test@example.com'),
      );

      expect(result).toEqual(mockUser);
      expect(userRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should throw EntityNotFoundException when user not found by email', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(
        handler.execute(new GetUserByEmailQuery('no@user.com')),
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  // ─── GetUserByFirebaseUidHandler ──────────────────────────────────────

  describe('GetUserByFirebaseUidHandler', () => {
    let handler: GetUserByFirebaseUidHandler;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GetUserByFirebaseUidHandler,
          { provide: USER_REPOSITORY, useValue: userRepository },
        ],
      }).compile();

      handler = module.get<GetUserByFirebaseUidHandler>(
        GetUserByFirebaseUidHandler,
      );
    });

    it('should return a user by firebase uid', async () => {
      userRepository.findByFirebaseUid.mockResolvedValue(mockUser);

      const result = await handler.execute(
        new GetUserByFirebaseUidQuery('fb-uid-123'),
      );

      expect(result).toEqual(mockUser);
      expect(userRepository.findByFirebaseUid).toHaveBeenCalledWith('fb-uid-123');
    });

    it('should throw EntityNotFoundException when user not found by firebase uid', async () => {
      userRepository.findByFirebaseUid.mockResolvedValue(null);

      await expect(
        handler.execute(new GetUserByFirebaseUidQuery('bad-uid')),
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  // ─── GetAllUsersHandler ───────────────────────────────────────────────

  describe('GetAllUsersHandler', () => {
    let handler: GetAllUsersHandler;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GetAllUsersHandler,
          { provide: USER_REPOSITORY, useValue: userRepository },
        ],
      }).compile();

      handler = module.get<GetAllUsersHandler>(GetAllUsersHandler);
    });

    it('should return paginated users', async () => {
      const mockResult = { users: [mockUser], total: 1 };
      userRepository.findAll.mockResolvedValue(mockResult);

      const result = await handler.execute(new GetAllUsersQuery(0, 10, true));

      expect(result).toEqual(mockResult);
      expect(userRepository.findAll).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        isActive: true,
      });
    });

    it('should use default pagination values', async () => {
      const mockResult = { users: [], total: 0 };
      userRepository.findAll.mockResolvedValue(mockResult);

      const result = await handler.execute(new GetAllUsersQuery());

      expect(result).toEqual(mockResult);
      expect(userRepository.findAll).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        isActive: undefined,
      });
    });

    it('should propagate repository errors', async () => {
      userRepository.findAll.mockRejectedValue(new Error('DB down'));

      await expect(
        handler.execute(new GetAllUsersQuery()),
      ).rejects.toThrow('DB down');
    });
  });
});
