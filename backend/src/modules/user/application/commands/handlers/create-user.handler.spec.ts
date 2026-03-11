import { Test, TestingModule } from "@nestjs/testing";
import { EventBus } from "@nestjs/cqrs";
import { CreateUserHandler } from "./create-user.handler";
import { CreateUserCommand } from "../create-user.command";
import { USER_REPOSITORY } from "../../../domain/repositories/user.repository.interface";
import { KafkaProducerService } from "../../../../../core/messaging/kafka/kafka.producer";
import { ConflictException } from "../../../../../core/exceptions/base.exception";

describe("CreateUserHandler", () => {
  let handler: CreateUserHandler;
  let userRepository: Record<string, jest.Mock>;
  let eventBus: { publish: jest.Mock };
  let kafkaProducer: { publish: jest.Mock };

  beforeEach(async () => {
    userRepository = {
      findByEmail: jest.fn(),
      existsByPhoneNumber: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
    };

    eventBus = { publish: jest.fn() };
    kafkaProducer = { publish: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateUserHandler,
        { provide: USER_REPOSITORY, useValue: userRepository },
        { provide: EventBus, useValue: eventBus },
        { provide: KafkaProducerService, useValue: kafkaProducer },
      ],
    }).compile();

    handler = module.get<CreateUserHandler>(CreateUserHandler);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(handler).toBeDefined();
  });

  describe("execute", () => {
    const command = new CreateUserCommand(
      "test@example.com",
      "John",
      "Doe",
      "+919876543210",
      new Date("1990-01-01"),
      "firebase-uid-123",
    );

    it("should create a user successfully", async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.existsByPhoneNumber.mockResolvedValue(false);

      const savedUser = {
        id: "user-uuid",
        email: { getValue: () => "test@example.com" },
        name: { getFirstName: () => "John", getLastName: () => "Doe" },
      };
      userRepository.save.mockResolvedValue(savedUser);

      const result = await handler.execute(command);

      expect(result).toEqual(savedUser);
      expect(userRepository.findByEmail).toHaveBeenCalledWith(
        "test@example.com",
      );
      expect(userRepository.existsByPhoneNumber).toHaveBeenCalledWith(
        "+919876543210",
      );
      expect(userRepository.save).toHaveBeenCalledTimes(1);
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      expect(kafkaProducer.publish).toHaveBeenCalledTimes(1);
    });

    it("should throw ConflictException when email already exists", async () => {
      userRepository.findByEmail.mockResolvedValue({ id: "existing-user" });

      await expect(handler.execute(command)).rejects.toThrow(ConflictException);
      expect(userRepository.save).not.toHaveBeenCalled();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it("should throw ConflictException when phone number already exists", async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.existsByPhoneNumber.mockResolvedValue(true);

      await expect(handler.execute(command)).rejects.toThrow(ConflictException);
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it("should create user without phone number when not provided", async () => {
      const commandNoPhone = new CreateUserCommand(
        "test@example.com",
        "John",
        "Doe",
        undefined,
        undefined,
        "firebase-uid-123",
      );

      userRepository.findByEmail.mockResolvedValue(null);

      const savedUser = {
        id: "user-uuid",
        email: { getValue: () => "test@example.com" },
        name: { getFirstName: () => "John", getLastName: () => "Doe" },
      };
      userRepository.save.mockResolvedValue(savedUser);

      const result = await handler.execute(commandNoPhone);

      expect(result).toEqual(savedUser);
      expect(userRepository.existsByPhoneNumber).not.toHaveBeenCalled();
    });

    it("should propagate repository errors", async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.existsByPhoneNumber.mockResolvedValue(false);
      userRepository.save.mockRejectedValue(new Error("DB connection lost"));

      await expect(handler.execute(command)).rejects.toThrow(
        "DB connection lost",
      );
      expect(eventBus.publish).not.toHaveBeenCalled();
      expect(kafkaProducer.publish).not.toHaveBeenCalled();
    });
  });
});
