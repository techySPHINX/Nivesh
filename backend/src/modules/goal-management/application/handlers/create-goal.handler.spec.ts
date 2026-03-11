import { Test, TestingModule } from "@nestjs/testing";
import { EventBus } from "@nestjs/cqrs";
import { CreateGoalHandler } from "./create-goal.handler";
import { CreateGoalCommand } from "../commands/create-goal.command";
import { GOAL_REPOSITORY } from "../../domain/repositories/goal.repository.interface";

describe("CreateGoalHandler", () => {
  let handler: CreateGoalHandler;
  let goalRepository: Record<string, jest.Mock>;
  let eventBus: { publish: jest.Mock };

  beforeEach(async () => {
    goalRepository = {
      save: jest.fn(),
      findById: jest.fn(),
    };
    eventBus = { publish: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateGoalHandler,
        { provide: GOAL_REPOSITORY, useValue: goalRepository },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get<CreateGoalHandler>(CreateGoalHandler);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(handler).toBeDefined();
  });

  describe("execute", () => {
    const makeCommand = () =>
      new CreateGoalCommand("user-1", {
        name: "Emergency Fund",
        description: "Build 6-month emergency fund",
        category: "SAVINGS" as any,
        targetAmount: 300000,
        currency: "INR",
        startDate: "2026-03-01",
        targetDate: "2027-03-01",
        priority: "HIGH" as any,
        linkedAccountId: "acc-1",
        autoContribute: true,
        contributionAmount: 25000,
        contributionFrequency: "MONTHLY" as any,
        metadata: {},
      } as any);

    it("should create a goal and return response DTO", async () => {
      const savedGoal = {
        id: "goal-uuid",
        userId: "user-1",
        name: "Emergency Fund",
        description: "Build 6-month emergency fund",
        category: "SAVINGS",
        targetAmount: 300000,
        currentAmount: 0,
        currency: "INR",
        startDate: new Date("2026-03-01"),
        targetDate: new Date("2027-03-01"),
        status: "ACTIVE",
        priority: "HIGH",
        linkedAccountId: "acc-1",
        autoContribute: true,
        contributionAmount: 25000,
        contributionFrequency: "MONTHLY",
        getProgressPercentage: jest.fn().mockReturnValue(0),
        getRemainingAmount: jest.fn().mockReturnValue(300000),
        getDaysRemaining: jest.fn().mockReturnValue(365),
        isOnTrack: jest.fn().mockReturnValue(true),
        isOverdue: jest.fn().mockReturnValue(false),
        getRequiredMonthlyContribution: jest.fn().mockReturnValue(25000),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      goalRepository.save.mockResolvedValue(savedGoal);

      const result = await handler.execute(makeCommand());

      expect(result).toBeDefined();
      expect(result.id).toBe("goal-uuid");
      expect(result.name).toBe("Emergency Fund");
      expect(result.progressPercentage).toBe(0);
      expect(goalRepository.save).toHaveBeenCalledTimes(1);
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it("should publish a GoalCreatedEvent after saving", async () => {
      const savedGoal = {
        id: "goal-2",
        userId: "user-1",
        name: "Vacation",
        description: "",
        category: "TRAVEL",
        targetAmount: 50000,
        currentAmount: 0,
        currency: "INR",
        startDate: new Date(),
        targetDate: new Date("2027-06-01"),
        status: "ACTIVE",
        priority: "MEDIUM",
        linkedAccountId: null,
        autoContribute: false,
        contributionAmount: null,
        contributionFrequency: null,
        getProgressPercentage: jest.fn().mockReturnValue(0),
        getRemainingAmount: jest.fn().mockReturnValue(50000),
        getDaysRemaining: jest.fn().mockReturnValue(457),
        isOnTrack: jest.fn().mockReturnValue(true),
        isOverdue: jest.fn().mockReturnValue(false),
        getRequiredMonthlyContribution: jest.fn().mockReturnValue(3334),
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      goalRepository.save.mockResolvedValue(savedGoal);

      await handler.execute(makeCommand());

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          goalId: "goal-2",
          userId: "user-1",
        }),
      );
    });

    it("should propagate repository errors", async () => {
      goalRepository.save.mockRejectedValue(new Error("DB write failed"));

      await expect(handler.execute(makeCommand())).rejects.toThrow(
        "DB write failed",
      );
      expect(eventBus.publish).not.toHaveBeenCalled();
    });
  });
});
