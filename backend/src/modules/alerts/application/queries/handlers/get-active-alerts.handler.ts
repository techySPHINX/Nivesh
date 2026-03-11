import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { Inject } from "@nestjs/common";
import { GetActiveAlertsQuery } from "../get-active-alerts.query";
import { AlertResponseDto } from "../../dto/alert-response.dto";
import {
  IAlertRepository,
  ALERT_REPOSITORY,
} from "../../../domain/repositories/alert.repository.interface";

@QueryHandler(GetActiveAlertsQuery)
export class GetActiveAlertsHandler implements IQueryHandler<GetActiveAlertsQuery> {
  constructor(
    @Inject(ALERT_REPOSITORY)
    private readonly alertRepository: IAlertRepository,
  ) {}

  async execute(query: GetActiveAlertsQuery): Promise<{
    data: AlertResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { userId, page, limit } = query;
    const skip = (page - 1) * limit;

    const [alerts, total] = await Promise.all([
      this.alertRepository.findActiveByUserId(userId, skip, limit),
      this.alertRepository.countActiveByUserId(userId),
    ]);

    return {
      data: alerts.map(AlertResponseDto.fromEntity),
      total,
      page,
      limit,
    };
  }
}
