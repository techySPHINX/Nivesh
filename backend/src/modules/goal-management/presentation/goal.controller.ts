import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../user-management/presentation/guards/jwt-auth.guard';

// Commands
import { CreateGoalCommand } from '../application/commands/create-goal.command';
import { UpdateGoalCommand } from '../application/commands/update-goal.command';
import { AddContributionCommand } from '../application/commands/add-contribution.command';
import { DeleteGoalCommand } from '../application/commands/delete-goal.command';
import { PauseGoalCommand } from '../application/commands/pause-goal.command';
import { ResumeGoalCommand } from '../application/commands/resume-goal.command';
import { CancelGoalCommand } from '../application/commands/cancel-goal.command';

// Queries
import { GetGoalByIdQuery } from '../application/queries/get-goal-by-id.query';
import { GetUserGoalsQuery } from '../application/queries/get-user-goals.query';
import { GetGoalContributionsQuery } from '../application/queries/get-goal-contributions.query';
import { GetGoalStatisticsQuery } from '../application/queries/get-goal-statistics.query';

// DTOs
import { CreateGoalDto } from '../application/dto/create-goal.dto';
import { UpdateGoalDto } from '../application/dto/update-goal.dto';
import { AddContributionDto } from '../application/dto/add-contribution.dto';
import { GoalResponseDto } from '../application/dto/goal-response.dto';
import { ContributionResponseDto } from '../application/dto/contribution-response.dto';
import { GoalStatus, GoalCategory } from '../domain/entities/goal.entity';

@ApiTags('Goals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('goals')
export class GoalController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) { }

  @Post()
  @ApiOperation({ summary: 'Create a new financial goal' })
  @ApiResponse({ status: 201, description: 'Goal created successfully', type: GoalResponseDto })
  async createGoal(@Request() req, @Body() dto: CreateGoalDto): Promise<GoalResponseDto> {
    const command = new CreateGoalCommand(req.user.userId, dto);
    return this.commandBus.execute(command);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get all goals for current user' })
  @ApiResponse({ status: 200, description: 'Goals retrieved successfully', type: [GoalResponseDto] })
  async getUserGoals(
    @Request() req,
    @Query('status') status?: GoalStatus,
    @Query('category') category?: GoalCategory,
    @Query('includeCompleted') includeCompleted?: string,
  ): Promise<GoalResponseDto[]> {
    const query = new GetUserGoalsQuery(
      req.user.userId,
      status,
      category,
      includeCompleted === 'true',
    );
    return this.queryBus.execute(query);
  }

  @Get('me/statistics')
  @ApiOperation({ summary: 'Get goal statistics for current user' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStatistics(@Request() req): Promise<any> {
    const query = new GetGoalStatisticsQuery(req.user.userId);
    return this.queryBus.execute(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get goal by ID' })
  @ApiResponse({ status: 200, description: 'Goal retrieved successfully', type: GoalResponseDto })
  @ApiResponse({ status: 404, description: 'Goal not found' })
  async getGoalById(@Request() req, @Param('id') id: string): Promise<GoalResponseDto> {
    const query = new GetGoalByIdQuery(req.user.userId, id);
    return this.queryBus.execute(query);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update goal' })
  @ApiResponse({ status: 200, description: 'Goal updated successfully', type: GoalResponseDto })
  @ApiResponse({ status: 404, description: 'Goal not found' })
  async updateGoal(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateGoalDto,
  ): Promise<GoalResponseDto> {
    const command = new UpdateGoalCommand(req.user.userId, id, dto);
    return this.commandBus.execute(command);
  }

  @Post(':id/contributions')
  @ApiOperation({ summary: 'Add contribution to goal' })
  @ApiResponse({ status: 201, description: 'Contribution added successfully', type: ContributionResponseDto })
  async addContribution(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: AddContributionDto,
  ): Promise<ContributionResponseDto> {
    const command = new AddContributionCommand(req.user.userId, id, dto);
    return this.commandBus.execute(command);
  }

  @Get(':id/contributions')
  @ApiOperation({ summary: 'Get contributions for a goal' })
  @ApiResponse({ status: 200, description: 'Contributions retrieved successfully', type: [ContributionResponseDto] })
  async getGoalContributions(
    @Request() req,
    @Param('id') id: string,
  ): Promise<ContributionResponseDto[]> {
    const query = new GetGoalContributionsQuery(req.user.userId, id);
    return this.queryBus.execute(query);
  }

  @Patch(':id/pause')
  @ApiOperation({ summary: 'Pause a goal' })
  @ApiResponse({ status: 200, description: 'Goal paused successfully', type: GoalResponseDto })
  async pauseGoal(@Request() req, @Param('id') id: string): Promise<GoalResponseDto> {
    const command = new PauseGoalCommand(req.user.userId, id);
    return this.commandBus.execute(command);
  }

  @Patch(':id/resume')
  @ApiOperation({ summary: 'Resume a paused goal' })
  @ApiResponse({ status: 200, description: 'Goal resumed successfully', type: GoalResponseDto })
  async resumeGoal(@Request() req, @Param('id') id: string): Promise<GoalResponseDto> {
    const command = new ResumeGoalCommand(req.user.userId, id);
    return this.commandBus.execute(command);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a goal' })
  @ApiResponse({ status: 200, description: 'Goal cancelled successfully', type: GoalResponseDto })
  async cancelGoal(@Request() req, @Param('id') id: string): Promise<GoalResponseDto> {
    const command = new CancelGoalCommand(req.user.userId, id);
    return this.commandBus.execute(command);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a goal' })
  @ApiResponse({ status: 204, description: 'Goal deleted successfully' })
  @ApiResponse({ status: 404, description: 'Goal not found' })
  async deleteGoal(@Request() req, @Param('id') id: string): Promise<void> {
    const command = new DeleteGoalCommand(req.user.userId, id);
    return this.commandBus.execute(command);
  }
}
