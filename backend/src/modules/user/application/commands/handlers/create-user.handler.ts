import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { CreateUserCommand } from '../create-user.command';
import { User } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/email.vo';
import { PhoneNumber } from '../../../domain/value-objects/phone-number.vo';
import { UserName } from '../../../domain/value-objects/user-name.vo';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../../domain/repositories/user.repository.interface';
import { ConflictException } from '../../../../../core/exceptions/base.exception';
import { UserCreatedEvent } from '../../../../../core/messaging/events/domain.events';
import { KafkaProducerService } from '../../../../../core/messaging/kafka/kafka.producer';
import { KafkaTopic } from '../../../../../core/messaging/kafka/topics.enum';

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  private readonly logger = new Logger(CreateUserHandler.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly eventBus: EventBus,
    private readonly kafkaProducer: KafkaProducerService,
  ) { }

  async execute(command: CreateUserCommand): Promise<User> {
    this.logger.log(`Creating user with email: ${command.email}`);

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(command.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists', {
        email: command.email,
      });
    }

    // Check phone number uniqueness if provided
    if (command.phoneNumber) {
      const phoneExists = await this.userRepository.existsByPhoneNumber(
        command.phoneNumber,
      );
      if (phoneExists) {
        throw new ConflictException('User with this phone number already exists');
      }
    }

    // Create value objects
    const email = new Email(command.email);
    const name = new UserName(command.firstName, command.lastName);
    const phoneNumber = command.phoneNumber
      ? new PhoneNumber(command.phoneNumber)
      : undefined;

    // Create user entity
    const user = User.create(
      crypto.randomUUID(),
      email,
      name,
      command.firebaseUid,
    );

    // Update additional fields if provided
    if (phoneNumber || command.dateOfBirth) {
      user.updateProfile({
        phoneNumber,
        dateOfBirth: command.dateOfBirth,
      });
    }

    // Persist user
    const savedUser = await this.userRepository.save(user);

    // Publish domain event
    const event = new UserCreatedEvent(
      savedUser.id,
      savedUser.email.getValue(),
      savedUser.name.getFirstName(),
      savedUser.name.getLastName(),
    );

    // Publish to event bus (in-memory)
    this.eventBus.publish(event);

    // Publish to Kafka (external)
    await this.kafkaProducer.publish(
      KafkaTopic.USER_CREATED,
      event,
      savedUser.id,
    );

    this.logger.log(`User created successfully: ${savedUser.id}`);

    return savedUser;
  }
}
