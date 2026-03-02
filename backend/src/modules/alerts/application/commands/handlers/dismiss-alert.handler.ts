import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { DismissAlertCommand } from '../dismiss-alert.command';
import { AlertResponseDto } from '../../dto/alert-response.dto';
import {
  IAlertRepository,
  ALERT_REPOSITORY,
} from '../../../domain/repositories/alert.repository.interface';
import { AlertDismissedEvent } from '../../../domain/events/alert.events';

@CommandHandler(DismissAlertCommand)
export class DismissAlertHandler implements ICommandHandler<DismissAlertCommand> {
  private readonly logger = new Logger(DismissAlertHandler.name);

  constructor(
    @Inject(ALERT_REPOSITORY)
    private readonly alertRepository: IAlertRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: DismissAlertCommand): Promise<AlertResponseDto> {
    const { alertId, userId } = command;

    const alert = await this.alertRepository.findById(alertId);
    if (!alert) {
      throw new NotFoundException(`Alert ${alertId} not found`);
    }
    if (alert.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    alert.dismiss();
    const savedAlert = await this.alertRepository.save(alert);

    this.eventBus.publish(new AlertDismissedEvent(alertId, userId));

    this.logger.log(`Alert dismissed: ${alertId}`);
    return AlertResponseDto.fromEntity(savedAlert);
  }
}
