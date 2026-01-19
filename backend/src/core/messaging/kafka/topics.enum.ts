export enum KafkaTopic {
  // User events
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',

  // Transaction events
  TRANSACTION_SYNCED = 'transaction.synced',
  TRANSACTION_CREATED = 'transaction.created',
  TRANSACTION_UPDATED = 'transaction.updated',

  // Account events
  ACCOUNT_LINKED = 'account.linked',
  ACCOUNT_SYNCED = 'account.synced',

  // Goal events
  GOAL_CREATED = 'goal.created',
  GOAL_UPDATED = 'goal.updated',
  GOAL_COMPLETED = 'goal.completed',
  GOAL_AT_RISK = 'goal.at_risk',

  // Net worth events
  NET_WORTH_CALCULATED = 'net_worth.calculated',

  // Alert events
  ALERT_CREATED = 'alert.created',
  ALERT_TRIGGERED = 'alert.triggered',

  // AI events
  AI_QUERY_PROCESSED = 'ai.query.processed',
  AI_RECOMMENDATION_GENERATED = 'ai.recommendation.generated',

  // Simulation events
  SIMULATION_STARTED = 'simulation.started',
  SIMULATION_COMPLETED = 'simulation.completed',
}
