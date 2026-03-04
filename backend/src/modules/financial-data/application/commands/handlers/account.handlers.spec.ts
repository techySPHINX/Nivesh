import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import {
  CreateAccountHandler,
  UpdateAccountHandler,
  DeleteAccountHandler,
  LinkAccountHandler,
} from './account.handlers';
import {
  CreateAccountCommand,
  UpdateAccountCommand,
  DeleteAccountCommand,
  LinkAccountCommand,
} from '../account.commands';
import { ACCOUNT_REPOSITORY } from '../../../domain/repositories/account.repository.interface';
import { KafkaProducerService } from '../../../../../core/messaging/kafka/kafka.producer';
import {
  ConflictException,
  EntityNotFoundException,
  UnauthorizedException,
} from '../../../../../core/exceptions/base.exception';
import { AccountStatus } from '../../../domain/entities/account.entity';

describe('Account Command Handlers', () => {
  let accountRepository: Record<string, jest.Mock>;
  let eventBus: { publish: jest.Mock };
  let kafkaProducer: { publish: jest.Mock };

  beforeEach(() => {
    accountRepository = {
      existsByAccountNumber: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
      delete: jest.fn(),
    };
    eventBus = { publish: jest.fn() };
    kafkaProducer = { publish: jest.fn().mockResolvedValue(undefined) };
    jest.clearAllMocks();
  });

  // ─── CreateAccountHandler ─────────────────────────────────────────────

  describe('CreateAccountHandler', () => {
    let handler: CreateAccountHandler;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CreateAccountHandler,
          { provide: ACCOUNT_REPOSITORY, useValue: accountRepository },
          { provide: EventBus, useValue: eventBus },
          { provide: KafkaProducerService, useValue: kafkaProducer },
        ],
      }).compile();

      handler = module.get<CreateAccountHandler>(CreateAccountHandler);
    });

    it('should create an account successfully', async () => {
      accountRepository.existsByAccountNumber.mockResolvedValue(false);

      const savedAccount = {
        Id: 'acc-123',
        UserId: 'user-1',
        AccountType: 'SAVINGS',
        BankName: 'SBI',
        Balance: { getAmount: () => 10000, getCurrency: () => 'INR' },
      };
      accountRepository.save.mockResolvedValue(savedAccount);

      const command = new CreateAccountCommand(
        'user-1',
        'My Savings',
        '1234567890',
        'SAVINGS' as any,
        'SBI',
        10000,
        'INR' as any,
        'SBIN0001234',
      );

      const result = await handler.execute(command);

      expect(result).toEqual(savedAccount);
      expect(accountRepository.existsByAccountNumber).toHaveBeenCalledWith('1234567890');
      expect(accountRepository.save).toHaveBeenCalledTimes(1);
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      expect(kafkaProducer.publish).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException if account number already exists', async () => {
      accountRepository.existsByAccountNumber.mockResolvedValue(true);

      const command = new CreateAccountCommand(
        'user-1',
        'Dup Account',
        '1234567890',
        'SAVINGS' as any,
        'SBI',
        5000,
        'INR' as any,
      );

      await expect(handler.execute(command)).rejects.toThrow(ConflictException);
      expect(accountRepository.save).not.toHaveBeenCalled();
    });

    it('should propagate repository errors', async () => {
      accountRepository.existsByAccountNumber.mockResolvedValue(false);
      accountRepository.save.mockRejectedValue(new Error('DB error'));

      const command = new CreateAccountCommand(
        'user-1',
        'Acc',
        '9999999999',
        'SAVINGS' as any,
        'SBI',
        0,
        'INR' as any,
      );

      await expect(handler.execute(command)).rejects.toThrow('DB error');
    });
  });

  // ─── UpdateAccountHandler ─────────────────────────────────────────────

  describe('UpdateAccountHandler', () => {
    let handler: UpdateAccountHandler;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          UpdateAccountHandler,
          { provide: ACCOUNT_REPOSITORY, useValue: accountRepository },
          { provide: EventBus, useValue: eventBus },
          { provide: KafkaProducerService, useValue: kafkaProducer },
        ],
      }).compile();

      handler = module.get<UpdateAccountHandler>(UpdateAccountHandler);
    });

    it('should update an account successfully', async () => {
      const existingAccount = {
        Id: 'acc-1',
        UserId: 'user-1',
        Balance: { getCurrency: () => 'INR' },
        rename: jest.fn(),
        updateBalance: jest.fn(),
        activate: jest.fn(),
        deactivate: jest.fn(),
        freeze: jest.fn(),
        close: jest.fn(),
      };
      accountRepository.findById.mockResolvedValue(existingAccount);
      accountRepository.save.mockResolvedValue({ ...existingAccount, Id: 'acc-1', UserId: 'user-1' });

      const command = new UpdateAccountCommand('acc-1', 'user-1', {
        accountName: 'Renamed Account',
      });

      const result = await handler.execute(command);

      expect(result).toBeDefined();
      expect(existingAccount.rename).toHaveBeenCalledWith('Renamed Account');
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('should throw EntityNotFoundException when account not found', async () => {
      accountRepository.findById.mockResolvedValue(null);

      const command = new UpdateAccountCommand('nonexistent', 'user-1', {});

      await expect(handler.execute(command)).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw UnauthorizedException when user does not own the account', async () => {
      accountRepository.findById.mockResolvedValue({
        Id: 'acc-1',
        UserId: 'other-user',
      });

      const command = new UpdateAccountCommand('acc-1', 'user-1', {});

      await expect(handler.execute(command)).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── DeleteAccountHandler ─────────────────────────────────────────────

  describe('DeleteAccountHandler', () => {
    let handler: DeleteAccountHandler;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DeleteAccountHandler,
          { provide: ACCOUNT_REPOSITORY, useValue: accountRepository },
        ],
      }).compile();

      handler = module.get<DeleteAccountHandler>(DeleteAccountHandler);
    });

    it('should delete an account successfully', async () => {
      accountRepository.findById.mockResolvedValue({
        Id: 'acc-1',
        UserId: 'user-1',
      });
      accountRepository.delete.mockResolvedValue(undefined);

      await handler.execute(new DeleteAccountCommand('acc-1', 'user-1'));

      expect(accountRepository.delete).toHaveBeenCalledWith('acc-1');
    });

    it('should throw EntityNotFoundException when account not found', async () => {
      accountRepository.findById.mockResolvedValue(null);

      await expect(
        handler.execute(new DeleteAccountCommand('nonexistent', 'user-1')),
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw UnauthorizedException when user does not own the account', async () => {
      accountRepository.findById.mockResolvedValue({
        Id: 'acc-1',
        UserId: 'other-user',
      });

      await expect(
        handler.execute(new DeleteAccountCommand('acc-1', 'user-1')),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── LinkAccountHandler ───────────────────────────────────────────────

  describe('LinkAccountHandler', () => {
    let handler: LinkAccountHandler;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          LinkAccountHandler,
          { provide: ACCOUNT_REPOSITORY, useValue: accountRepository },
        ],
      }).compile();

      handler = module.get<LinkAccountHandler>(LinkAccountHandler);
    });

    it('should link an account successfully', async () => {
      const account = {
        Id: 'acc-1',
        UserId: 'user-1',
        linkAccount: jest.fn(),
      };
      accountRepository.findById.mockResolvedValue(account);
      accountRepository.save.mockResolvedValue({ ...account, Id: 'acc-1' });

      const result = await handler.execute(new LinkAccountCommand('acc-1', 'user-1'));

      expect(result).toBeDefined();
      expect(account.linkAccount).toHaveBeenCalled();
      expect(accountRepository.save).toHaveBeenCalled();
    });

    it('should throw EntityNotFoundException when account not found', async () => {
      accountRepository.findById.mockResolvedValue(null);

      await expect(
        handler.execute(new LinkAccountCommand('nonexistent', 'user-1')),
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw UnauthorizedException when user does not own the account', async () => {
      accountRepository.findById.mockResolvedValue({
        Id: 'acc-1',
        UserId: 'other-user',
      });

      await expect(
        handler.execute(new LinkAccountCommand('acc-1', 'user-1')),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
