import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import {
  CreateTransactionHandler,
  UpdateTransactionHandler,
  DeleteTransactionHandler,
} from './transaction.handlers';
import {
  CreateTransactionCommand,
  UpdateTransactionCommand,
  DeleteTransactionCommand,
} from '../transaction.commands';
import { TRANSACTION_REPOSITORY } from '../../../domain/repositories/transaction.repository.interface';
import { ACCOUNT_REPOSITORY } from '../../../domain/repositories/account.repository.interface';
import { KafkaProducerService } from '../../../../../core/messaging/kafka/kafka.producer';
import {
  EntityNotFoundException,
  UnauthorizedException,
  ValidationException,
} from '../../../../../core/exceptions/base.exception';

describe('Transaction Command Handlers', () => {
  let transactionRepository: Record<string, jest.Mock>;
  let accountRepository: Record<string, jest.Mock>;
  let eventBus: { publish: jest.Mock };
  let kafkaProducer: { publish: jest.Mock };

  beforeEach(() => {
    transactionRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    accountRepository = {
      findById: jest.fn(),
      save: jest.fn(),
    };
    eventBus = { publish: jest.fn() };
    kafkaProducer = { publish: jest.fn().mockResolvedValue(undefined) };
    jest.clearAllMocks();
  });

  // ─── CreateTransactionHandler ─────────────────────────────────────────

  describe('CreateTransactionHandler', () => {
    let handler: CreateTransactionHandler;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CreateTransactionHandler,
          { provide: TRANSACTION_REPOSITORY, useValue: transactionRepository },
          { provide: ACCOUNT_REPOSITORY, useValue: accountRepository },
          { provide: EventBus, useValue: eventBus },
          { provide: KafkaProducerService, useValue: kafkaProducer },
        ],
      }).compile();

      handler = module.get<CreateTransactionHandler>(CreateTransactionHandler);
    });

    const baseCommand = () =>
      new CreateTransactionCommand(
        'user-1',
        'acc-1',
        'DEBIT' as any,
        5000,
        'INR' as any,
        'FOOD' as any,
        'Grocery shopping',
        new Date('2026-03-01'),
        'BigBazaar',
        'REF001',
      );

    it('should create a transaction successfully', async () => {
      const account = {
        UserId: 'user-1',
        Balance: { getCurrency: () => 'INR' },
        canTransact: jest.fn().mockReturnValue(true),
        debit: jest.fn(),
        credit: jest.fn(),
      };
      accountRepository.findById.mockResolvedValue(account);

      const savedTx = {
        Id: 'tx-1',
        UserId: 'user-1',
        AccountId: 'acc-1',
        Type: 'DEBIT',
        Amount: { getAmount: () => 5000 },
        Category: 'FOOD',
      };
      transactionRepository.save.mockResolvedValue(savedTx);
      accountRepository.save.mockResolvedValue(account);

      const result = await handler.execute(baseCommand());

      expect(result).toEqual(savedTx);
      expect(accountRepository.findById).toHaveBeenCalledWith('acc-1');
      expect(transactionRepository.save).toHaveBeenCalledTimes(1);
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      expect(kafkaProducer.publish).toHaveBeenCalledTimes(1);
    });

    it('should throw EntityNotFoundException when account does not exist', async () => {
      accountRepository.findById.mockResolvedValue(null);

      await expect(handler.execute(baseCommand())).rejects.toThrow(
        EntityNotFoundException,
      );
      expect(transactionRepository.save).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user does not own the account', async () => {
      accountRepository.findById.mockResolvedValue({
        UserId: 'other-user',
        Balance: { getCurrency: () => 'INR' },
        canTransact: jest.fn().mockReturnValue(true),
      });

      await expect(handler.execute(baseCommand())).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw ValidationException when account cannot transact', async () => {
      accountRepository.findById.mockResolvedValue({
        UserId: 'user-1',
        Balance: { getCurrency: () => 'INR' },
        canTransact: jest.fn().mockReturnValue(false),
      });

      await expect(handler.execute(baseCommand())).rejects.toThrow(
        ValidationException,
      );
    });

    it('should throw ValidationException when currency mismatch', async () => {
      accountRepository.findById.mockResolvedValue({
        UserId: 'user-1',
        Balance: { getCurrency: () => 'USD' },
        canTransact: jest.fn().mockReturnValue(true),
      });

      await expect(handler.execute(baseCommand())).rejects.toThrow(
        ValidationException,
      );
    });
  });

  // ─── UpdateTransactionHandler ─────────────────────────────────────────

  describe('UpdateTransactionHandler', () => {
    let handler: UpdateTransactionHandler;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          UpdateTransactionHandler,
          { provide: TRANSACTION_REPOSITORY, useValue: transactionRepository },
          { provide: EventBus, useValue: eventBus },
          { provide: KafkaProducerService, useValue: kafkaProducer },
        ],
      }).compile();

      handler = module.get<UpdateTransactionHandler>(UpdateTransactionHandler);
    });

    it('should update a transaction successfully', async () => {
      const existingTx = {
        Id: 'tx-1',
        UserId: 'user-1',
        updateCategory: jest.fn(),
        updateDescription: jest.fn(),
      };
      transactionRepository.findById.mockResolvedValue(existingTx);
      transactionRepository.save.mockResolvedValue({
        ...existingTx,
        Id: 'tx-1',
        UserId: 'user-1',
      });

      const command = new UpdateTransactionCommand('tx-1', 'user-1', {
        category: 'ENTERTAINMENT' as any,
        description: 'Updated desc',
      });

      const result = await handler.execute(command);

      expect(result).toBeDefined();
      expect(existingTx.updateCategory).toHaveBeenCalledWith('ENTERTAINMENT');
      expect(existingTx.updateDescription).toHaveBeenCalledWith('Updated desc');
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('should throw EntityNotFoundException when transaction not found', async () => {
      transactionRepository.findById.mockResolvedValue(null);

      const command = new UpdateTransactionCommand('nonexistent', 'user-1', {});

      await expect(handler.execute(command)).rejects.toThrow(
        EntityNotFoundException,
      );
    });

    it('should throw UnauthorizedException when user does not own the transaction', async () => {
      transactionRepository.findById.mockResolvedValue({
        Id: 'tx-1',
        UserId: 'other-user',
      });

      const command = new UpdateTransactionCommand('tx-1', 'user-1', {});

      await expect(handler.execute(command)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ─── DeleteTransactionHandler ─────────────────────────────────────────

  describe('DeleteTransactionHandler', () => {
    let handler: DeleteTransactionHandler;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DeleteTransactionHandler,
          { provide: TRANSACTION_REPOSITORY, useValue: transactionRepository },
        ],
      }).compile();

      handler = module.get<DeleteTransactionHandler>(DeleteTransactionHandler);
    });

    it('should delete a transaction successfully', async () => {
      transactionRepository.findById.mockResolvedValue({
        Id: 'tx-1',
        UserId: 'user-1',
      });
      transactionRepository.delete.mockResolvedValue(undefined);

      await handler.execute(new DeleteTransactionCommand('tx-1', 'user-1'));

      expect(transactionRepository.delete).toHaveBeenCalledWith('tx-1');
    });

    it('should throw EntityNotFoundException when transaction not found', async () => {
      transactionRepository.findById.mockResolvedValue(null);

      await expect(
        handler.execute(new DeleteTransactionCommand('nonexistent', 'user-1')),
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw UnauthorizedException when user does not own the transaction', async () => {
      transactionRepository.findById.mockResolvedValue({
        Id: 'tx-1',
        UserId: 'other-user',
      });

      await expect(
        handler.execute(new DeleteTransactionCommand('tx-1', 'user-1')),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
