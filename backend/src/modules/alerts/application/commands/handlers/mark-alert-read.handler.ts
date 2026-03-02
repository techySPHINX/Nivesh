import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { MarkAlertReadCommand } from '../mark-alert-read.command';
import { AlertResponseDto } from '../../dto/alert-response.dto';
import {
  IAlertRepository,
  ALERT_REPOSITORY,
} from '../../../domain/repositories/alert.repository.interface';
import { AlertReadEvent } from '../../../domain/events/alert.events';

@CommandHandler(MarkAlertReadCommand)
export class MarkAlertReadHandler implements ICommandHandler<MarkAlertReadCommand> {
  private readonly logger = new Logger(MarkAlertReadHandler.name);

  constructor(
    @Inject(ALERT_REPOSITORY)
    private readonly alertRepository: IAlertRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: MarkAlertReadCommand): Promise<AlertResponseDto> {
    const { alertId, userId } = command;

    const alert = await this.alertRepository.findById(alertId);
    if (!alert) {
      throw new NotFoundException(`Alert ${alertId} not found`);
    }
    if (alert.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    alert.markRead();
    const savedAlert = await this.alertRepository.save(alert);

    this.eventBus.publish(new AlertReadEvent(alertId, userId));

    this.logger.log(`Alert marked as read: ${alertId}`);
    return AlertResponseDto.fromEntity(savedAlert);
  }
}
