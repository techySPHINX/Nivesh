import { AccountType } from '../../domain/entities/account.entity';
import { Currency } from '../../domain/value-objects/money.vo';

export class CreateAccountCommand {
  constructor(
    public readonly userId: string,
    public readonly accountName: string,
    public readonly accountNumber: string,
    public readonly accountType: AccountType,
    public readonly bankName: string,
    public readonly balance: number,
    public readonly currency: Currency,
    public readonly ifscCode?: string,
  ) { }
}

export class UpdateAccountCommand {
  constructor(
    public readonly accountId: string,
    public readonly userId: string,
    public readonly updates: {
      accountName?: string;
      balance?: number;
      status?: string;
    },
  ) { }
}

export class DeleteAccountCommand {
  constructor(
    public readonly accountId: string,
    public readonly userId: string,
  ) { }
}

export class LinkAccountCommand {
  constructor(
    public readonly accountId: string,
    public readonly userId: string,
  ) { }
}
