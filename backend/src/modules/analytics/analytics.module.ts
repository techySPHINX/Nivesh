import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { DatabaseModule } from "../../core/database/database.module";

// Presentation
import { AnalyticsController } from "./presentation/analytics.controller";

// Query Handlers
import {
  GetSpendingTrendsHandler,
  GetCategoryBreakdownHandler,
  GetNetWorthHistoryHandler,
} from "./application/queries/handlers";

const QueryHandlers = [
  GetSpendingTrendsHandler,
  GetCategoryBreakdownHandler,
  GetNetWorthHistoryHandler,
];

@Module({
  imports: [CqrsModule, DatabaseModule],
  controllers: [AnalyticsController],
  providers: [...QueryHandlers],
  exports: [],
})
export class AnalyticsModule {}
