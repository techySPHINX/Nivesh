import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigModule } from '@nestjs/config';

// Infrastructure
import { Neo4jGraphService } from './infrastructure/services/neo4j-graph.service';
import { Neo4jSchemaService } from './infrastructure/database/neo4j-schema.service';
import { UserGraphSyncConsumer } from './infrastructure/consumers/user-graph-sync.consumer';
import { TransactionGraphSyncConsumer } from './infrastructure/consumers/transaction-graph-sync.consumer';
import { BudgetGraphSyncConsumer } from './infrastructure/consumers/budget-graph-sync.consumer';
import { GoalGraphSyncConsumer } from './infrastructure/consumers/goal-graph-sync.consumer';

// Application Services
import { SpendingPatternDetector } from './application/services/spending-pattern-detector.service';
import { AnomalyDetector } from './application/services/anomaly-detector.service';
import { CategoryInsightsService } from './application/services/category-insights.service';
import { MerchantNetworkService } from './application/services/merchant-network.service';
import { RecommendationService } from './application/services/recommendation.service';

// Query Handlers
import {
  GetSpendingPatternsHandler,
  GetCategoryInsightsHandler,
  GetMerchantRecommendationsHandler,
  GetSimilarUsersHandler,
} from './application/queries/graph-analytics.queries';

// Presentation
import { KnowledgeGraphController } from './presentation/knowledge-graph.controller';

const QueryHandlers = [
  GetSpendingPatternsHandler,
  GetCategoryInsightsHandler,
  GetMerchantRecommendationsHandler,
  GetSimilarUsersHandler,
];

const Consumers = [
  UserGraphSyncConsumer,
  TransactionGraphSyncConsumer,
  BudgetGraphSyncConsumer,
  GoalGraphSyncConsumer,
];

const Services = [
  SpendingPatternDetector,
  AnomalyDetector,
  CategoryInsightsService,
  MerchantNetworkService,
  RecommendationService,
];

/**
 * Knowledge Graph Module
 * 
 * Provides graph-based analytics and insights using Neo4j
 * 
 * Features:
 * - Real-time graph synchronization via Kafka
 * - Spending pattern detection
 * - Anomaly detection
 * - Category insights and recommendations
 * - Merchant network analysis
 * - Similar user discovery
 * - Personalized recommendations
 * 
 * Architecture:
 * - Domain: Entities, VOs, Repository interfaces
 * - Application: Services, DTOs, Query handlers
 * - Infrastructure: Neo4j service, Kafka consumers, Schema management
 * - Presentation: REST API controller
 */
@Module({
  imports: [
    CqrsModule,
    ConfigModule,
  ],
  controllers: [KnowledgeGraphController],
  providers: [
    // Infrastructure
    Neo4jGraphService,
    Neo4jSchemaService,
    ...Consumers,

    // Application
    ...Services,
    ...QueryHandlers,

    // Repository provider
    {
      provide: 'IKnowledgeGraphRepository',
      useClass: Neo4jGraphService,
    },
  ],
  exports: [
    Neo4jGraphService,
    SpendingPatternDetector,
    AnomalyDetector,
    RecommendationService,
  ],
})
export class KnowledgeGraphModule { }
