import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { UpdateGoalHandler } from './update-goal.handler';
import { UpdateGoalCommand } from '../commands/update-goal.command';
import { GOAL_REPOSITORY } from '../../domain/repositories/goal.repository.interface';

describe('UpdateGoalHandler', () => {
  let handler: UpdateGoalHandler;
  let goalRepository: Record<string, jest.Mock>;
  let eventBus: { publish: jest.Mock };

  beforeEach(async () => {
    goalRepository = {
      findById: jest.fn(),
      save: jest.fn(),
    };
    eventBus = { publish: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateGoalHandler,
        { provide: GOAL_REPOSITORY, useValue: goalRepository },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get<UpdateGoalHandler>(UpdateGoalHandler);
    jest.clearAllMocks();
  });

  const makeMockGoal = (overrides: Record<string, any> = {}) => ({
    id: 'goal-1',
    userId: 'user-1',
    name: 'Emergency Fund',
    description: 'Save for emergencies',
    category: 'SAVINGS',
    targetAmount: 300000,
    currentAmount: 50000,
    currency: 'INR',
    startDate: new Date('2026-01-01'),
    targetDate: new Date('2027-01-01'),
    status: 'ACTIVE',
    priority: 'HIGH',
    linkedAccountId: 'acc-1',
    autoContribute: true,
    contributionAmount: 25000,
    contributionFrequency: 'MONTHLY',
    getProgressPercentage: jest.fn().mockReturnValue(16.67),
    getRemainingAmount: jest.fn().mockReturnValue(250000),
    getDaysRemaining: jest.fn().mockReturnValue(305),
    isOnTrack: jest.fn().mockReturnValue(true),
    isOverdue: jest.fn().mockReturnValue(false),
    getRequiredMonthlyContribution: jest.fn().mockReturnValue(25000),
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    updateDetails: jest.fn(),
    enableAutoContribution: jest.fn(),
    disableAutoContribution: jest.fn(),
    ...overrides,
  });

  describe('execute', () => {
    it('should update a goal successfully', async () => {
      const goal = makeMockGoal();
      goalRepository.findById.mockResolvedValue(goal);
      goalRepository.save.mockResolvedValue(goal);

      const command = new UpdateGoalCommand('user-1', 'goal-1', {
        name: 'Updated Fund',
        targetAmount: 400000,
      } as any);

      const result = await handler.execute(command);

      expect(result).toBeDefined();
      expect(result.id).toBe('goal-1');
      expect(goal.updateDetails).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Updated Fund', targetAmount: 400000 }),
      );
      expect(goalRepository.save).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when goal not found', async () => {
      goalRepository.findById.mockResolvedValue(null);

      const command = new UpdateGoalCommand('user-1', 'nonexistent', {
        name: 'X',
      } as any);

      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
      expect(goalRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user does not own the goal', async () => {
      const goal = makeMockGoal({ userId: 'other-user' });
      goalRepository.findById.mockResolvedValue(goal);

      const command = new UpdateGoalCommand('user-1', 'goal-1', {
        name: 'hack',
      } as any);

      await expect(handler.execute(command)).rejects.toThrow(ForbiddenException);
    });

    it('should enable auto-contribution when all fields provided', async () => {
      const goal = makeMockGoal();
      goalRepository.findById.mockResolvedValue(goal);
      goalRepository.save.mockResolvedValue(goal);

      const command = new UpdateGoalCommand('user-1', 'goal-1', {
        autoContribute: true,
        contributionAmount: 30000,
        contributionFrequency: 'MONTHLY',
        linkedAccountId: 'acc-2',
      } as any);

      await handler.execute(command);

      expect(goal.enableAutoContribution).toHaveBeenCalledWith(
        30000,
        'MONTHLY',
        'acc-2',
      );
    });

    it('should disable auto-contribution when autoContribute is false', async () => {
      const goal = makeMockGoal();
      goalRepository.findById.mockResolvedValue(goal);
      goalRepository.save.mockResolvedValue(goal);

      const command = new UpdateGoalCommand('user-1', 'goal-1', {
        autoContribute: false,
      } as any);

      await handler.execute(command);

      expect(goal.disableAutoContribution).toHaveBeenCalled();
    });

    it('should propagate repository errors', async () => {
      const goal = makeMockGoal();
      goalRepository.findById.mockResolvedValue(goal);
      goalRepository.save.mockRejectedValue(new Error('Save failed'));

      const command = new UpdateGoalCommand('user-1', 'goal-1', {
        name: 'X',
      } as any);

      await expect(handler.execute(command)).rejects.toThrow('Save failed');
    });
  });
});
