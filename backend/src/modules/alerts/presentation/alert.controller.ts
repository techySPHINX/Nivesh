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
  ParseUUIDPipe,
  Logger,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { CreateAlertRuleDto } from '../application/dto/create-alert-rule.dto';
import { AlertResponseDto } from '../application/dto/alert-response.dto';
import { AlertRuleResponseDto } from '../application/dto/alert-rule-response.dto';
import { CreateAlertRuleCommand } from '../application/commands/create-alert-rule.command';
import { MarkAlertReadCommand } from '../application/commands/mark-alert-read.command';
import { DismissAlertCommand } from '../application/commands/dismiss-alert.command';
import { DeleteAlertRuleCommand } from '../application/commands/delete-alert-rule.command';
import { GetActiveAlertsQuery } from '../application/queries/get-active-alerts.query';
import { GetUserAlertsQuery } from '../application/queries/get-user-alerts.query';
import { GetAlertRulesQuery } from '../application/queries/get-alert-rules.query';
import { GetUnreadCountQuery } from '../application/queries/get-unread-count.query';

@ApiTags('alerts')
@ApiBearerAuth()
@Controller('alerts')
export class AlertController {
  private readonly logger = new Logger(AlertController.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  // ─── Alert Rule Endpoints ─────────────────────────────────

  @Post('rules')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new alert rule' })
  @ApiResponse({ status: 201, description: 'Alert rule created', type: AlertRuleResponseDto })
  async createRule(
    @Body() dto: CreateAlertRuleDto,
    @Query('userId') userId: string,
  ): Promise<AlertRuleResponseDto> {
    return this.commandBus.execute(new CreateAlertRuleCommand(userId, dto));
  }

  @Get('rules')
  @ApiOperation({ summary: 'Get all alert rules for a user' })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Alert rules retrieved', type: [AlertRuleResponseDto] })
  async getRules(
    @Query('userId') userId: string,
    @Query('activeOnly') activeOnly?: string,
  ): Promise<AlertRuleResponseDto[]> {
    return this.queryBus.execute(
      new GetAlertRulesQuery(userId, activeOnly === 'true'),
    );
  }

  @Delete('rules/:ruleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an alert rule' })
  @ApiResponse({ status: 204, description: 'Alert rule deleted' })
  async deleteRule(
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
    @Query('userId') userId: string,
  ): Promise<void> {
    return this.commandBus.execute(new DeleteAlertRuleCommand(ruleId, userId));
  }

  // ─── Alert Endpoints ──────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Get all alerts for a user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'severity', required: false, type: String })
  @ApiResponse({ status: 200, description: 'User alerts retrieved' })
  async getUserAlerts(
    @Query('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('severity') severity?: string,
  ) {
    return this.queryBus.execute(
      new GetUserAlertsQuery(
        userId,
        page ? parseInt(page, 10) : 1,
        limit ? parseInt(limit, 10) : 20,
        type,
        severity,
      ),
    );
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active (non-dismissed) alerts' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Active alerts retrieved' })
  async getActiveAlerts(
    @Query('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.queryBus.execute(
      new GetActiveAlertsQuery(
        userId,
        page ? parseInt(page, 10) : 1,
        limit ? parseInt(limit, 10) : 20,
      ),
    );
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get count of unread alerts' })
  @ApiResponse({ status: 200, description: 'Unread count retrieved' })
  async getUnreadCount(@Query('userId') userId: string) {
    return this.queryBus.execute(new GetUnreadCountQuery(userId));
  }

  @Patch(':alertId/read')
  @ApiOperation({ summary: 'Mark an alert as read' })
  @ApiResponse({ status: 200, description: 'Alert marked as read', type: AlertResponseDto })
  async markRead(
    @Param('alertId', ParseUUIDPipe) alertId: string,
    @Query('userId') userId: string,
  ): Promise<AlertResponseDto> {
    return this.commandBus.execute(new MarkAlertReadCommand(alertId, userId));
  }

  @Patch(':alertId/dismiss')
  @ApiOperation({ summary: 'Dismiss an alert' })
  @ApiResponse({ status: 200, description: 'Alert dismissed', type: AlertResponseDto })
  async dismiss(
    @Param('alertId', ParseUUIDPipe) alertId: string,
    @Query('userId') userId: string,
  ): Promise<AlertResponseDto> {
    return this.commandBus.execute(new DismissAlertCommand(alertId, userId));
  }
}
