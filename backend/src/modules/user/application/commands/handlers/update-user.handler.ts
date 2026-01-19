import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { UpdateUserCommand } from '../update-user.command';
import { User, RiskProfile } from '../../../domain/entities/user.entity';
import { PhoneNumber } from '../../../domain/value-objects/phone-number.vo';
import { UserName } from '../../../domain/value-objects/user-name.vo';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../../domain/repositories/user.repository.interface';
import { EntityNotFoundException } from '../../../../../core/exceptions/base.exception';
import { UserUpdatedEvent } from '../../../../../core/messaging/events/domain.events';
import { KafkaProducerService } from '../../../../../core/messaging/kafka/kafka.producer';
import { KafkaTopic } from '../../../../../core/messaging/kafka/topics.enum';

@CommandHandler(UpdateUserCommand)
export class UpdateUserHandler implements ICommandHandler<UpdateUserCommand> {
  private readonly logger = new Logger(UpdateUserHandler.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly eventBus: EventBus,
    private readonly kafkaProducer: KafkaProducerService,
  ) { }

  async execute(command: UpdateUserCommand): Promise<User> {
    this.logger.log(`Updating user: ${command.userId}`);

    // Find user
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new EntityNotFoundException('User', command.userId);
    }

    const updates: any = {};

    // Update name if provided
    if (command.updates.firstName || command.updates.lastName) {
      const firstName = command.updates.firstName || user.name.getFirstName();
      const lastName = command.updates.lastName || user.name.getLastName();
      updates.name = new UserName(firstName, lastName);
    }

    // Update phone number if provided
    if (command.updates.phoneNumber) {
      updates.phoneNumber = new PhoneNumber(command.updates.phoneNumber);
    }

    // Update other fields
    if (command.updates.dateOfBirth) {
      updates.dateOfBirth = command.updates.dateOfBirth;
    }

    if (command.updates.profilePicture !== undefined) {
      updates.profilePicture = command.updates.profilePicture;
    }

    // Apply updates
    user.updateProfile(updates);

    // Update risk profile if provided
    if (command.updates.riskProfile) {
      user.updateRiskProfile(command.updates.riskProfile as RiskProfile);
    }

    // Save updated user
    const updatedUser = await this.userRepository.save(user);

    // Publish domain event
    const event = new UserUpdatedEvent(updatedUser.id, command.updates);

    this.eventBus.publish(event);

    await this.kafkaProducer.publish(
      KafkaTopic.USER_UPDATED,
      event,
      updatedUser.id,
    );

    this.logger.log(`User updated successfully: ${updatedUser.id}`);

    return updatedUser;
  }
}
