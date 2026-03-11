export enum KafkaTopics {
  // User events
  USER_EVENTS = "user.events",

  // Account events
  ACCOUNT_EVENTS = "account.events",

  // Transaction events
  TRANSACTION_EVENTS = "transaction.events",

  // Goal events
  GOAL_EVENTS = "goal.events",

  // Alert events
  ALERT_EVENTS = "alert.events",

  // AI events
  AI_EVENTS = "ai.events",

  // System events
  SYSTEM_EVENTS = "system.events",
}

// Dead-letter queue topics for failed message processing
export enum KafkaDLQTopics {
  DLQ_USER_EVENTS = "dlq.user.events",
  DLQ_TRANSACTION_EVENTS = "dlq.transaction.events",
  DLQ_GOAL_EVENTS = "dlq.goal.events",
  DLQ_AI_EVENTS = "dlq.ai.events",
  DLQ_ALERT_EVENTS = "dlq.alert.events",
}

/** Maps a source topic to its dead-letter queue topic */
export function getDLQTopic(topic: string): string | null {
  const dlqMap: Record<string, string> = {
    [KafkaTopics.USER_EVENTS]: KafkaDLQTopics.DLQ_USER_EVENTS,
    [KafkaTopics.TRANSACTION_EVENTS]: KafkaDLQTopics.DLQ_TRANSACTION_EVENTS,
    [KafkaTopics.GOAL_EVENTS]: KafkaDLQTopics.DLQ_GOAL_EVENTS,
    [KafkaTopics.AI_EVENTS]: KafkaDLQTopics.DLQ_AI_EVENTS,
    [KafkaTopics.ALERT_EVENTS]: KafkaDLQTopics.DLQ_ALERT_EVENTS,
  };
  return dlqMap[topic] ?? null;
}

// Legacy topic names for backward compatibility
export enum KafkaTopic {
  // User events
  USER_CREATED = "user.created",
  USER_UPDATED = "user.updated",
  USER_DELETED = "user.deleted",

  // Transaction events
  TRANSACTION_SYNCED = "transaction.synced",
  TRANSACTION_CREATED = "transaction.created",
  TRANSACTION_UPDATED = "transaction.updated",

  // Account events
  ACCOUNT_LINKED = "account.linked",
  ACCOUNT_SYNCED = "account.synced",

  // Goal events
  GOAL_CREATED = "goal.created",
  GOAL_UPDATED = "goal.updated",
  GOAL_COMPLETED = "goal.completed",
  GOAL_AT_RISK = "goal.at_risk",

  // Net worth events
  NET_WORTH_CALCULATED = "net_worth.calculated",

  // Alert events
  ALERT_CREATED = "alert.created",
  ALERT_TRIGGERED = "alert.triggered",

  // AI events
  AI_QUERY_PROCESSED = "ai.query.processed",
  AI_RECOMMENDATION_GENERATED = "ai.recommendation.generated",

  // Simulation events
  SIMULATION_STARTED = "simulation.started",
  SIMULATION_COMPLETED = "simulation.completed",
}
