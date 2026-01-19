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
  CreateTransactionDto,
  UpdateTransactionDto,
  TransactionResponseDto,
} from '../application/dto/transaction.dto';
import {
  CreateTransactionCommand,
  UpdateTransactionCommand,
  DeleteTransactionCommand,
} from '../application/commands/transaction.commands';
import {
  GetTransactionQuery,
  GetTransactionsByAccountQuery,
  GetTransactionsByUserQuery,
  GetAllTransactionsQuery,
  GetRecentTransactionsQuery,
} from '../application/queries/transaction.queries';
import { Transaction, TransactionCategory } from '../domain/entities/transaction.entity';
import { JwtAuthGuard } from '../../../core/security/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/security/auth/decorators/current-user.decorator';
import { Currency } from '../domain/value-objects/money.vo';

@ApiTags('transactions')
@Controller('transactions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransactionController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new transaction' })
  @ApiResponse({ status: 201, type: TransactionResponseDto })
  async createTransaction(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateTransactionDto,
  ): Promise<TransactionResponseDto> {
    const command = new CreateTransactionCommand(
      userId,
      dto.accountId,
      dto.type,
      dto.amount,
      dto.currency || Currency.INR,
      dto.category,
      dto.description,
      new Date(dto.transactionDate),
      dto.merchantName,
      dto.referenceNumber,
    );

    const transaction = await this.commandBus.execute<CreateTransactionCommand, Transaction>(
      command,
    );
    return this.toResponse(transaction);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user transactions' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: [TransactionResponseDto] })
  async getMyTransactions(
    @CurrentUser('userId') userId: string,
    @Query('limit') limit?: number,
  ): Promise<TransactionResponseDto[]> {
    const query = new GetTransactionsByUserQuery(userId, limit || 50);
    const transactions = await this.queryBus.execute<
      GetTransactionsByUserQuery,
      Transaction[]
    >(query);
    return transactions.map((t) => this.toResponse(t));
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent transactions' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: [TransactionResponseDto] })
  async getRecentTransactions(
    @CurrentUser('userId') userId: string,
    @Query('days') days?: number,
    @Query('limit') limit?: number,
  ): Promise<TransactionResponseDto[]> {
    const query = new GetRecentTransactionsQuery(userId, days || 7, limit || 20);
    const transactions = await this.queryBus.execute<
      GetRecentTransactionsQuery,
      Transaction[]
    >(query);
    return transactions.map((t) => this.toResponse(t));
  }

  @Get('account/:accountId')
  @ApiOperation({ summary: 'Get transactions by account' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: [TransactionResponseDto] })
  async getAccountTransactions(
    @Param('accountId') accountId: string,
    @Query('limit') limit?: number,
  ): Promise<TransactionResponseDto[]> {
    const query = new GetTransactionsByAccountQuery(accountId, limit || 50);
    const transactions = await this.queryBus.execute<
      GetTransactionsByAccountQuery,
      Transaction[]
    >(query);
    return transactions.map((t) => this.toResponse(t));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction by ID' })
  @ApiResponse({ status: 200, type: TransactionResponseDto })
  async getTransaction(@Param('id') id: string): Promise<TransactionResponseDto> {
    const query = new GetTransactionQuery(id);
    const transaction = await this.queryBus.execute<GetTransactionQuery, Transaction>(query);
    return this.toResponse(transaction);
  }

  @Get()
  @ApiOperation({ summary: 'Get all transactions with filters' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'accountId', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, enum: TransactionCategory })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, type: [TransactionResponseDto] })
  async getAllTransactions(
    @CurrentUser('userId') userId: string,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('accountId') accountId?: string,
    @Query('category') category?: TransactionCategory,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<{ transactions: TransactionResponseDto[]; total: number }> {
    const query = new GetAllTransactionsQuery(
      skip || 0,
      take || 50,
      userId,
      accountId,
      category,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );

    const result = await this.queryBus.execute<
      GetAllTransactionsQuery,
      { transactions: Transaction[]; total: number }
    >(query);

    return {
      transactions: result.transactions.map((t) => this.toResponse(t)),
      total: result.total,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update transaction' })
  @ApiResponse({ status: 200, type: TransactionResponseDto })
  async updateTransaction(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
  ): Promise<TransactionResponseDto> {
    const command = new UpdateTransactionCommand(id, userId, dto);
    const transaction = await this.commandBus.execute<UpdateTransactionCommand, Transaction>(
      command,
    );
    return this.toResponse(transaction);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete transaction' })
  @ApiResponse({ status: 204 })
  async deleteTransaction(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<void> {
    const command = new DeleteTransactionCommand(id, userId);
    await this.commandBus.execute(command);
  }

  private toResponse(transaction: Transaction): TransactionResponseDto {
    return {
      id: transaction.Id,
      userId: transaction.UserId,
      accountId: transaction.AccountId,
      type: transaction.Type,
      amount: transaction.Amount.getAmount(),
      formattedAmount: transaction.Amount.format(),
      currency: transaction.Amount.getCurrency(),
      category: transaction.Category,
      description: transaction.Description,
      merchantName: transaction.MerchantName,
      transactionDate: transaction.TransactionDate,
      referenceNumber: transaction.ReferenceNumber,
      status: transaction.Status,
      isDebit: transaction.isDebit(),
      isCredit: transaction.isCredit(),
      isIncome: transaction.isIncome(),
      isExpense: transaction.isExpense(),
      createdAt: transaction.CreatedAt,
      updatedAt: transaction.UpdatedAt,
    };
  }
}
