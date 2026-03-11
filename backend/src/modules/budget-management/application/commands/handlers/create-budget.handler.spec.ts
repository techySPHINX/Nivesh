import { Test, TestingModule } from "@nestjs/testing";
import { EventBus } from "@nestjs/cqrs";
import { CreateBudgetHandler } from "./create-budget.handler";
import { CreateBudgetCommand } from "../create-budget.command";
import { PrismaService } from "../../../../../core/database/postgres/prisma.service";
import { BudgetResponseDto } from "../../dto";

describe("CreateBudgetHandler", () => {
  let handler: CreateBudgetHandler;
  let prisma: { budget: { create: jest.Mock } };
  let eventBus: { publish: jest.Mock };

  beforeEach(async () => {
    prisma = {
      budget: {
        create: jest.fn(),
      },
    };
    eventBus = { publish: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateBudgetHandler,
        { provide: PrismaService, useValue: prisma },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get<CreateBudgetHandler>(CreateBudgetHandler);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(handler).toBeDefined();
  });

  describe("execute", () => {
    const makeCommand = (overrides: Record<string, any> = {}) =>
      new CreateBudgetCommand("user-1", {
        category: "FOOD",
        amount: 50000,
        currency: "INR",
        period: "MONTHLY",
        startDate: "2026-03-01T00:00:00.000Z",
        endDate: "2026-03-31T23:59:59.999Z",
        alertThreshold: 90,
        isRecurring: false,
        ...overrides,
      } as any);

    it("should create a budget successfully", async () => {
      const createdBudget = {
        id: "budget-1",
        userId: "user-1",
        category: "FOOD",
        amount: 50000,
        currency: "INR",
        period: "MONTHLY",
        startDate: new Date("2026-03-01"),
        endDate: new Date("2026-03-31T23:59:59.999Z"),
        isActive: true,
        isRecurring: false,
        alertThreshold: 90,
        currentSpending: 0,
        lastCalculatedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.budget.create.mockResolvedValue(createdBudget);

      const result = await handler.execute(makeCommand());

      expect(result).toBeDefined();
      expect(result.id).toBe("budget-1");
      expect(result.category).toBe("FOOD");
      expect(result.amount).toBe(50000);
      expect(result.remainingAmount).toBe(50000);
      expect(result.spendingPercentage).toBe(0);
      expect(result.isExceeded).toBe(false);
      expect(prisma.budget.create).toHaveBeenCalledTimes(1);
      expect(prisma.budget.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user-1",
          category: "FOOD",
          amount: 50000,
          currency: "INR",
          isActive: true,
          currentSpending: 0,
        }),
      });
    });

    it("should use default currency INR when not provided", async () => {
      const command = makeCommand({ currency: undefined });

      const createdBudget = {
        id: "budget-2",
        userId: "user-1",
        category: "FOOD",
        amount: 50000,
        currency: "INR",
        period: "MONTHLY",
        startDate: new Date("2026-03-01"),
        endDate: new Date("2026-03-31"),
        isActive: true,
        isRecurring: false,
        alertThreshold: 90,
        currentSpending: 0,
        lastCalculatedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.budget.create.mockResolvedValue(createdBudget);

      await handler.execute(command);

      expect(prisma.budget.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          currency: "INR",
        }),
      });
    });

    it("should use default alertThreshold of 90 when not provided", async () => {
      const command = makeCommand({ alertThreshold: undefined });

      const createdBudget = {
        id: "budget-3",
        userId: "user-1",
        category: "FOOD",
        amount: 50000,
        currency: "INR",
        period: "MONTHLY",
        startDate: new Date("2026-03-01"),
        endDate: new Date("2026-03-31"),
        isActive: true,
        isRecurring: false,
        alertThreshold: 90,
        currentSpending: 0,
        lastCalculatedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.budget.create.mockResolvedValue(createdBudget);

      await handler.execute(command);

      expect(prisma.budget.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          alertThreshold: 90,
        }),
      });
    });

    it("should propagate database errors", async () => {
      prisma.budget.create.mockRejectedValue(
        new Error("Unique constraint violation"),
      );

      await expect(handler.execute(makeCommand())).rejects.toThrow(
        "Unique constraint violation",
      );
    });

    it("should correctly convert BudgetResponseDto from entity", async () => {
      const createdBudget = {
        id: "budget-4",
        userId: "user-1",
        category: "TRANSPORT",
        amount: 10000,
        currency: "INR",
        period: "WEEKLY",
        startDate: new Date("2026-03-01"),
        endDate: new Date("2026-03-07"),
        isActive: true,
        isRecurring: true,
        alertThreshold: 80,
        currentSpending: 7500,
        lastCalculatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.budget.create.mockResolvedValue(createdBudget);

      const result = await handler.execute(
        makeCommand({
          category: "TRANSPORT",
          amount: 10000,
          period: "WEEKLY",
          isRecurring: true,
          alertThreshold: 80,
        }),
      );

      expect(result.remainingAmount).toBe(2500);
      expect(result.spendingPercentage).toBe(75);
      expect(result.isExceeded).toBe(false);
    });
  });
});
