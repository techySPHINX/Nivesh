export enum TimeGranularity {
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
  QUARTERLY = "QUARTERLY",
  YEARLY = "YEARLY",
}

export interface SpendingTrendPoint {
  period: string;
  totalSpent: number;
  totalIncome: number;
  netSavings: number;
  transactionCount: number;
}

export interface CategoryBreakdown {
  category: string;
  totalAmount: number;
  percentage: number;
  transactionCount: number;
  averageAmount: number;
  trend: "UP" | "DOWN" | "STABLE";
  changePercentage: number;
}

export interface NetWorthPoint {
  date: string;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  changeFromPrevious: number;
}

export interface AnalyticsResult<T> {
  userId: string;
  period: {
    from: string;
    to: string;
    granularity: TimeGranularity;
  };
  data: T;
  generatedAt: Date;
}
