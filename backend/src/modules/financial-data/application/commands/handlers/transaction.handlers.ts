import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import {
  CreateTransactionCommand,
  UpdateTransactionCommand,
  DeleteTransactionCommand,
} from '../transaction.commands';
import {
  ITransactionRepository,
  TRANSACTION_REPOSITORY,
} from '../../../domain/repositories/transaction.repository.interface';
import {
  IAccountRepository,
  ACCOUNT_REPOSITORY,
} from '../../../domain/repositories/account.repository.interface';
import { Transaction, TransactionStatus } from '../../../domain/entities/transaction.entity';
import { Money } from '../../../domain/value-objects/money.vo';
import {
  EntityNotFoundException,
  UnauthorizedException,
  ValidationException,
} from '../../../../../core/exceptions/base.exception';
import {
  TransactionCreatedEvent,
  TransactionUpdatedEvent,
} from '../../../domain/events/transaction.events';
import { KafkaProducerService } from '../../../../../core/messaging/kafka/kafka.producer';
import { KafkaTopics } from '../../../../../core/messaging/kafka/topics.enum';

@CommandHandler(CreateTransactionCommand)
export class CreateTransactionHandler implements ICommandHandler<CreateTransactionCommand> {
  private readonly logger = new Logger(CreateTransactionHandler.name);

  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: ITransactionRepository,
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: IAccountRepository,
    private readonly eventBus: EventBus,
    private readonly kafkaProducer: KafkaProducerService,
  ) { }

  async execute(command: CreateTransactionCommand): Promise<Transaction> {
    this.logger.debug(`Creating transaction for account: ${command.accountId}`);

    // Verify account exists and belongs to user
    const account = await this.accountRepository.findById(command.accountId);

    if (!account) {
      throw new EntityNotFoundException('Account', command.accountId);
    }

    if (account.UserId !== command.userId) {
      throw new UnauthorizedException('Not authorized to access this account');
    }

    if (!account.canTransact()) {
      throw new ValidationException('Account is not active for transactions');
    }

    // Create money value object
    const amount = new Money(command.amount, command.currency);

    // Verify currency matches account
    if (amount.getCurrency() !== account.Balance.getCurrency()) {
      throw new ValidationException('Transaction currency does not match account currency');
    }

    // Create transaction entity
    const transaction = Transaction.create({
      userId: command.userId,
      accountId: command.accountId,
      type: command.type,
      amount,
      category: command.category,
      description: command.description,
      transactionDate: command.transactionDate,
      merchantName: command.merchantName,
      referenceNumber: command.referenceNumber,
    });

    // Complete the transaction
    transaction.complete();

    // Update account balance
    if (transaction.isDebit()) {
      account.debit(amount);
    } else {
      account.credit(amount);
    }

    // Save both transaction and account
    const [savedTransaction] = await Promise.all([
      this.transactionRepository.save(transaction),
      this.accountRepository.save(account),
    ]);

    // Publish events
    const event = new TransactionCreatedEvent(
      savedTransaction.Id,
      savedTransaction.UserId,
      savedTransaction.AccountId,
      savedTransaction.Type,
      savedTransaction.Amount.getAmount(),
      savedTransaction.Category,
    );

    this.eventBus.publish(event);

    await this.kafkaProducer.publish(KafkaTopics.TRANSACTION_EVENTS, {
      eventType: event.eventType,
      data: event,
    });

    this.logger.log(`Transaction created: ${savedTransaction.Id}`);

    return savedTransaction;
  }
}

@CommandHandler(UpdateTransactionCommand)
export class UpdateTransactionHandler implements ICommandHandler<UpdateTransactionCommand> {
  private readonly logger = new Logger(UpdateTransactionHandler.name);

  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: ITransactionRepository,
    private readonly eventBus: EventBus,
    private readonly kafkaProducer: KafkaProducerService,
  ) { }

  async execute(command: UpdateTransactionCommand): Promise<Transaction> {
    this.logger.debug(`Updating transaction: ${command.transactionId}`);

    const transaction = await this.transactionRepository.findById(command.transactionId);

    if (!transaction) {
      throw new EntityNotFoundException('Transaction', command.transactionId);
    }

    if (transaction.UserId !== command.userId) {
      throw new UnauthorizedException('Not authorized to update this transaction');
    }

    // Apply updates
    if (command.updates.category) {
      transaction.updateCategory(command.updates.category);
    }

    if (command.updates.description) {
      transaction.updateDescription(command.updates.description);
    }

    if (command.updates.status) {
      // Handle status changes
      switch (command.updates.status) {
        case TransactionStatus.FAILED:
          transaction.fail();
          break;
        case TransactionStatus.REVERSED:
          transaction.reverse();
          break;
        case TransactionStatus.COMPLETED:
          transaction.complete();
          break;
      }
    }

    const updatedTransaction = await this.transactionRepository.save(transaction);

    // Publish event
    const event = new TransactionUpdatedEvent(
      updatedTransaction.Id,
      updatedTransaction.UserId,
      command.updates,
    );

    this.eventBus.publish(event);

    await this.kafkaProducer.publish(KafkaTopics.TRANSACTION_EVENTS, {
      eventType: event.eventType,
      data: event,
    });

    this.logger.log(`Transaction updated: ${updatedTransaction.Id}`);

    return updatedTransaction;
  }
}

@CommandHandler(DeleteTransactionCommand)
export class DeleteTransactionHandler implements ICommandHandler<DeleteTransactionCommand> {
  private readonly logger = new Logger(DeleteTransactionHandler.name);

  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: ITransactionRepository,
  ) { }

  async execute(command: DeleteTransactionCommand): Promise<void> {
    this.logger.debug(`Deleting transaction: ${command.transactionId}`);

    const transaction = await this.transactionRepository.findById(command.transactionId);

    if (!transaction) {
      throw new EntityNotFoundException('Transaction', command.transactionId);
    }

    if (transaction.UserId !== command.userId) {
      throw new UnauthorizedException('Not authorized to delete this transaction');
    }

    await this.transactionRepository.delete(command.transactionId);

    this.logger.log(`Transaction deleted: ${command.transactionId}`);
  }
}
