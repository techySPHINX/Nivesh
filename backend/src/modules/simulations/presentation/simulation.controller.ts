import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Request,
  HttpCode,
  HttpStatus,
  UseGuards,
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
import { RunSimulationDto, SimulationResponseDto } from '../application/dto';
import { RunSimulationCommand, DeleteSimulationCommand } from '../application/commands';
import { GetSimulationQuery, GetSimulationHistoryQuery } from '../application/queries';
import { JwtAuthGuard } from '../../../core/security/auth/guards/jwt-auth.guard';

@ApiTags('simulations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('simulations')
export class SimulationController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('run')
  @ApiOperation({ summary: 'Run a financial simulation (Monte Carlo, What-If, Stress Test)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Simulation executed successfully',
    type: SimulationResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input parameters' })
  async runSimulation(
    @Request() req,
    @Body() runSimulationDto: RunSimulationDto,
  ): Promise<SimulationResponseDto> {
    const userId = req.user.sub || req.user.userId;
    const command = new RunSimulationCommand(userId, runSimulationDto);
    return this.commandBus.execute(command);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get simulation history for the current user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: HttpStatus.OK, description: 'Simulation history retrieved' })
  async getSimulationHistory(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const userId = req.user.sub || req.user.userId;
    const query = new GetSimulationHistoryQuery(userId, page || 1, limit || 20);
    return this.queryBus.execute(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get simulation by ID' })
  @ApiParam({ name: 'id', description: 'Simulation ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Simulation retrieved',
    type: SimulationResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Simulation not found' })
  async getSimulation(
    @Request() req,
    @Param('id') simulationId: string,
  ): Promise<SimulationResponseDto> {
    const userId = req.user.sub || req.user.userId;
    const query = new GetSimulationQuery(simulationId, userId);
    return this.queryBus.execute(query);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a simulation' })
  @ApiParam({ name: 'id', description: 'Simulation ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Simulation deleted' })
  async deleteSimulation(
    @Request() req,
    @Param('id') simulationId: string,
  ): Promise<void> {
    const userId = req.user.sub || req.user.userId;
    const command = new DeleteSimulationCommand(simulationId, userId);
    await this.commandBus.execute(command);
  }
}
