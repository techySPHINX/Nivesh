import { TimeGranularity } from '../../domain/entities/analytics.entity';

export class GetNetWorthHistoryQuery {
  constructor(
    public readonly userId: string,
    public readonly from?: string,
    public readonly to?: string,
    public readonly granularity: TimeGranularity = TimeGranularity.MONTHLY,
  ) {}
}
