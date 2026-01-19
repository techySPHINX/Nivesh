import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import {
  CreateAccountDto,
  UpdateAccountDto,
  AccountResponseDto,
} from '../application/dto/account.dto';
import {
  CreateAccountCommand,
  UpdateAccountCommand,
  DeleteAccountCommand,
  LinkAccountCommand,
} from '../application/commands/account.commands';
import {
  GetAccountQuery,
  GetAccountsByUserQuery,
  GetAllAccountsQuery,
} from '../application/queries/account.queries';
import { Account } from '../domain/entities/account.entity';
import { JwtAuthGuard } from '../../../core/security/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/security/auth/decorators/current-user.decorator';
import { Currency } from '../domain/value-objects/money.vo';

@ApiTags('accounts')
@Controller('accounts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AccountController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new account' })
  @ApiResponse({ status: 201, description: 'Account created', type: AccountResponseDto })
  async createAccount(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateAccountDto,
  ): Promise<AccountResponseDto> {
    const command = new CreateAccountCommand(
      userId,
      dto.accountName,
      dto.accountNumber,
      dto.accountType,
      dto.bankName,
      dto.balance,
      dto.currency || Currency.INR,
      dto.ifscCode,
    );

    const account = await this.commandBus.execute<CreateAccountCommand, Account>(command);
    return this.toResponse(account);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user accounts' })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: [AccountResponseDto] })
  async getMyAccounts(
    @CurrentUser('userId') userId: string,
    @Query('activeOnly') activeOnly?: boolean,
  ): Promise<AccountResponseDto[]> {
    const query = new GetAccountsByUserQuery(userId, activeOnly === true);
    const accounts = await this.queryBus.execute<GetAccountsByUserQuery, Account[]>(query);
    return accounts.map((a) => this.toResponse(a));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get account by ID' })
  @ApiResponse({ status: 200, type: AccountResponseDto })
  async getAccount(@Param('id') id: string): Promise<AccountResponseDto> {
    const query = new GetAccountQuery(id);
    const account = await this.queryBus.execute<GetAccountQuery, Account>(query);
    return this.toResponse(account);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update account' })
  @ApiResponse({ status: 200, type: AccountResponseDto })
  async updateAccount(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
  ): Promise<AccountResponseDto> {
    const command = new UpdateAccountCommand(id, userId, dto);
    const account = await this.commandBus.execute<UpdateAccountCommand, Account>(command);
    return this.toResponse(account);
  }

  @Post(':id/link')
  @ApiOperation({ summary: 'Link account for auto-sync' })
  @ApiResponse({ status: 200, type: AccountResponseDto })
  async linkAccount(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<AccountResponseDto> {
    const command = new LinkAccountCommand(id, userId);
    const account = await this.commandBus.execute<LinkAccountCommand, Account>(command);
    return this.toResponse(account);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete account' })
  @ApiResponse({ status: 204 })
  async deleteAccount(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<void> {
    const command = new DeleteAccountCommand(id, userId);
    await this.commandBus.execute(command);
  }

  private toResponse(account: Account): AccountResponseDto {
    return {
      id: account.Id,
      userId: account.UserId,
      accountName: account.AccountName,
      accountNumber: account.AccountNumber.getValue(),
      maskedAccountNumber: account.AccountNumber.getMasked(),
      accountType: account.AccountType,
      bankName: account.BankName,
      ifscCode: account.IFSCCode?.getValue(),
      balance: account.Balance.getAmount(),
      formattedBalance: account.Balance.format(),
      currency: account.Balance.getCurrency(),
      status: account.Status,
      isLinked: account.IsLinked,
      isActive: account.isActive(),
      lastSyncedAt: account.LastSyncedAt,
      createdAt: account.CreatedAt,
      updatedAt: account.UpdatedAt,
    };
  }
}
