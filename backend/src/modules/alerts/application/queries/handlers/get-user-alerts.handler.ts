import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetUserAlertsQuery } from '../get-user-alerts.query';
import { AlertResponseDto } from '../../dto/alert-response.dto';
import {
  IAlertRepository,
  ALERT_REPOSITORY,
} from '../../../domain/repositories/alert.repository.interface';

@QueryHandler(GetUserAlertsQuery)
export class GetUserAlertsHandler implements IQueryHandler<GetUserAlertsQuery> {
  constructor(
    @Inject(ALERT_REPOSITORY)
    private readonly alertRepository: IAlertRepository,
  ) {}

  async execute(
    query: GetUserAlertsQuery,
  ): Promise<{ data: AlertResponseDto[]; total: number; page: number; limit: number }> {
    const { userId, page, limit, type, severity } = query;
    const skip = (page - 1) * limit;

    const [alerts, total] = await Promise.all([
      this.alertRepository.findByUserId(userId, skip, limit, { type, severity }),
      this.alertRepository.countByUserId(userId, { type, severity }),
    ]);

    return {
      data: alerts.map(AlertResponseDto.fromEntity),
      total,
      page,
      limit,
    };
  }
}
