import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { Inject } from "@nestjs/common";
import { GetUnreadCountQuery } from "../get-unread-count.query";
import {
  IAlertRepository,
  ALERT_REPOSITORY,
} from "../../../domain/repositories/alert.repository.interface";

@QueryHandler(GetUnreadCountQuery)
export class GetUnreadCountHandler implements IQueryHandler<GetUnreadCountQuery> {
  constructor(
    @Inject(ALERT_REPOSITORY)
    private readonly alertRepository: IAlertRepository,
  ) {}

  async execute(query: GetUnreadCountQuery): Promise<{ unreadCount: number }> {
    const count = await this.alertRepository.countUnreadByUserId(query.userId);
    return { unreadCount: count };
  }
}
