import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import {
  CreateAccountCommand,
  UpdateAccountCommand,
  DeleteAccountCommand,
  LinkAccountCommand,
} from '../account.commands';
import {
  IAccountRepository,
  ACCOUNT_REPOSITORY,
} from '../../../domain/repositories/account.repository.interface';
import { Account, AccountStatus } from '../../../domain/entities/account.entity';
import { AccountNumber } from '../../../domain/value-objects/account-number.vo';
import { IFSCCode } from '../../../domain/value-objects/ifsc-code.vo';
import { Money } from '../../../domain/value-objects/money.vo';
import {
  ConflictException,
  EntityNotFoundException,
  UnauthorizedException,
} from '../../../../../core/exceptions/base.exception';
import { AccountCreatedEvent, AccountUpdatedEvent } from '../../../domain/events/account.events';
import { KafkaProducerService } from '../../../../../core/messaging/kafka/kafka.producer';
import { KafkaTopics } from '../../../../../core/messaging/kafka/topics.enum';

@CommandHandler(CreateAccountCommand)
export class CreateAccountHandler implements ICommandHandler<CreateAccountCommand> {
  private readonly logger = new Logger(CreateAccountHandler.name);

  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: IAccountRepository,
    private readonly eventBus: EventBus,
    private readonly kafkaProducer: KafkaProducerService,
  ) { }

  async execute(command: CreateAccountCommand): Promise<Account> {
    this.logger.debug(`Creating account for user: ${command.userId}`);

    // Check if account number already exists
    const existingAccount = await this.accountRepository.existsByAccountNumber(
      command.accountNumber,
    );

    if (existingAccount) {
      throw new ConflictException('Account with this number already exists');
    }

    // Create value objects
    const accountNumber = new AccountNumber(command.accountNumber);
    const ifscCode = command.ifscCode ? new IFSCCode(command.ifscCode) : undefined;
    const balance = new Money(command.balance, command.currency);

    // Create account entity
    const account = Account.create({
      userId: command.userId,
      accountName: command.accountName,
      accountNumber,
      accountType: command.accountType,
      bankName: command.bankName,
      ifscCode,
      balance,
    });

    // Save to repository
    const savedAccount = await this.accountRepository.save(account);

    // Publish domain event
    const event = new AccountCreatedEvent(
      savedAccount.Id,
      savedAccount.UserId,
      savedAccount.AccountType,
      savedAccount.BankName,
      savedAccount.Balance.getAmount(),
    );

    this.eventBus.publish(event);

    // Publish to Kafka
    await this.kafkaProducer.publish(KafkaTopics.ACCOUNT_EVENTS, {
      eventType: event.eventType,
      data: event,
    });

    this.logger.log(`Account created: ${savedAccount.Id}`);

    return savedAccount;
  }
}

@CommandHandler(UpdateAccountCommand)
export class UpdateAccountHandler implements ICommandHandler<UpdateAccountCommand> {
  private readonly logger = new Logger(UpdateAccountHandler.name);

  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: IAccountRepository,
    private readonly eventBus: EventBus,
    private readonly kafkaProducer: KafkaProducerService,
  ) { }

  async execute(command: UpdateAccountCommand): Promise<Account> {
    this.logger.debug(`Updating account: ${command.accountId}`);

    const account = await this.accountRepository.findById(command.accountId);

    if (!account) {
      throw new EntityNotFoundException('Account', command.accountId);
    }

    if (account.UserId !== command.userId) {
      throw new UnauthorizedException('Not authorized to update this account');
    }

    // Apply updates
    if (command.updates.accountName) {
      account.rename(command.updates.accountName);
    }

    if (command.updates.balance !== undefined) {
      const newBalance = new Money(command.updates.balance, account.Balance.getCurrency());
      account.updateBalance(newBalance);
    }

    if (command.updates.status) {
      switch (command.updates.status) {
        case AccountStatus.ACTIVE:
          account.activate();
          break;
        case AccountStatus.INACTIVE:
          account.deactivate();
          break;
        case AccountStatus.FROZEN:
          account.freeze();
          break;
        case AccountStatus.CLOSED:
          account.close();
          break;
      }
    }

    const updatedAccount = await this.accountRepository.save(account);

    // Publish event
    const event = new AccountUpdatedEvent(
      updatedAccount.Id,
      updatedAccount.UserId,
      command.updates,
    );

    this.eventBus.publish(event);

    await this.kafkaProducer.publish(KafkaTopics.ACCOUNT_EVENTS, {
      eventType: event.eventType,
      data: event,
    });

    this.logger.log(`Account updated: ${updatedAccount.Id}`);

    return updatedAccount;
  }
}

@CommandHandler(DeleteAccountCommand)
export class DeleteAccountHandler implements ICommandHandler<DeleteAccountCommand> {
  private readonly logger = new Logger(DeleteAccountHandler.name);

  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: IAccountRepository,
  ) { }

  async execute(command: DeleteAccountCommand): Promise<void> {
    this.logger.debug(`Deleting account: ${command.accountId}`);

    const account = await this.accountRepository.findById(command.accountId);

    if (!account) {
      throw new EntityNotFoundException('Account', command.accountId);
    }

    if (account.UserId !== command.userId) {
      throw new UnauthorizedException('Not authorized to delete this account');
    }

    await this.accountRepository.delete(command.accountId);

    this.logger.log(`Account deleted: ${command.accountId}`);
  }
}

@CommandHandler(LinkAccountCommand)
export class LinkAccountHandler implements ICommandHandler<LinkAccountCommand> {
  private readonly logger = new Logger(LinkAccountHandler.name);

  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: IAccountRepository,
  ) { }

  async execute(command: LinkAccountCommand): Promise<Account> {
    this.logger.debug(`Linking account: ${command.accountId}`);

    const account = await this.accountRepository.findById(command.accountId);

    if (!account) {
      throw new EntityNotFoundException('Account', command.accountId);
    }

    if (account.UserId !== command.userId) {
      throw new UnauthorizedException('Not authorized to link this account');
    }

    account.linkAccount();

    const linkedAccount = await this.accountRepository.save(account);

    this.logger.log(`Account linked: ${linkedAccount.Id}`);

    return linkedAccount;
  }
}
