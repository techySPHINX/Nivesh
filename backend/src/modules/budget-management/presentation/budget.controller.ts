import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import {
  CreateBudgetDto,
  UpdateBudgetDto,
  BudgetResponseDto,
  BudgetSpendingDto,
} from '../application/dto';
import {
  CreateBudgetCommand,
  UpdateBudgetCommand,
  DeleteBudgetCommand,
} from '../application/commands';
import {
  GetBudgetQuery,
  GetUserBudgetsQuery,
  GetBudgetSpendingQuery,
} from '../application/queries';
import { JwtAuthGuard } from '../../core/security/guards/jwt-auth.guard';

@ApiTags('Budgets')
@ApiBearerAuth()
@Controller('budgets')
@UseGuards(JwtAuthGuard)
export class BudgetController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new budget' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Budget created successfully',
    type: BudgetResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  async createBudget(
    @Request() req,
    @Body() createBudgetDto: CreateBudgetDto,
  ): Promise<BudgetResponseDto> {
    const userId = req.user.sub || req.user.userId;
    const command = new CreateBudgetCommand(userId, createBudgetDto);
    return this.commandBus.execute(command);
  }

  @Get()
  @ApiOperation({ summary: 'Get all budgets for the current user' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Budgets retrieved successfully',
    type: [BudgetResponseDto],
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  async getUserBudgets(
    @Request() req,
    @Query('isActive') isActive?: string,
  ): Promise<BudgetResponseDto[]> {
    const userId = req.user.sub || req.user.userId;
    const isActiveBoolean = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    const query = new GetUserBudgetsQuery(userId, isActiveBoolean);
    return this.queryBus.execute(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get budget by ID' })
  @ApiParam({ name: 'id', description: 'Budget ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Budget retrieved successfully',
    type: BudgetResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Budget not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Access denied' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  async getBudget(
    @Request() req,
    @Param('id') budgetId: string,
  ): Promise<BudgetResponseDto> {
    const userId = req.user.sub || req.user.userId;
    const query = new GetBudgetQuery(budgetId, userId);
    return this.queryBus.execute(query);
  }

  @Get(':id/spending')
  @ApiOperation({ summary: 'Get budget spending analysis' })
  @ApiParam({ name: 'id', description: 'Budget ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Budget spending retrieved successfully',
    type: BudgetSpendingDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Budget not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Access denied' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  async getBudgetSpending(
    @Request() req,
    @Param('id') budgetId: string,
  ): Promise<BudgetSpendingDto> {
    const userId = req.user.sub || req.user.userId;
    const query = new GetBudgetSpendingQuery(budgetId, userId);
    return this.queryBus.execute(query);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update budget' })
  @ApiParam({ name: 'id', description: 'Budget ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Budget updated successfully',
    type: BudgetResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Budget not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Access denied' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  async updateBudget(
    @Request() req,
    @Param('id') budgetId: string,
    @Body() updateBudgetDto: UpdateBudgetDto,
  ): Promise<BudgetResponseDto> {
    const userId = req.user.sub || req.user.userId;
    const command = new UpdateBudgetCommand(budgetId, userId, updateBudgetDto);
    return this.commandBus.execute(command);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete budget' })
  @ApiParam({ name: 'id', description: 'Budget ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Budget deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Budget not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Access denied' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  async deleteBudget(
    @Request() req,
    @Param('id') budgetId: string,
  ): Promise<void> {
    const userId = req.user.sub || req.user.userId;
    const command = new DeleteBudgetCommand(budgetId, userId);
    await this.commandBus.execute(command);
  }
}
