import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetAlertRulesQuery } from '../get-alert-rules.query';
import { AlertRuleResponseDto } from '../../dto/alert-rule-response.dto';
import {
  IAlertRuleRepository,
  ALERT_RULE_REPOSITORY,
} from '../../../domain/repositories/alert-rule.repository.interface';

@QueryHandler(GetAlertRulesQuery)
export class GetAlertRulesHandler implements IQueryHandler<GetAlertRulesQuery> {
  constructor(
    @Inject(ALERT_RULE_REPOSITORY)
    private readonly alertRuleRepository: IAlertRuleRepository,
  ) {}

  async execute(query: GetAlertRulesQuery): Promise<AlertRuleResponseDto[]> {
    const { userId, activeOnly } = query;

    const rules = activeOnly
      ? await this.alertRuleRepository.findActiveByUserId(userId)
      : await this.alertRuleRepository.findByUserId(userId);

    return rules.map(AlertRuleResponseDto.fromEntity);
  }
}
