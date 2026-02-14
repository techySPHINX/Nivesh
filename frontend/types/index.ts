// User Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  profilePicture?: string;
  kycStatus: 'pending' | 'verified' | 'rejected';
  riskProfile?: 'conservative' | 'moderate' | 'aggressive';
  createdAt: string;
  updatedAt: string;
}

// Account Types
export interface Account {
  id: string;
  userId: string;
  accountName: string;
  accountNumber: string;
  accountType: 'savings' | 'current' | 'credit_card' | 'investment' | 'loan';
  bankName: string;
  ifscCode?: string;
  balance: number;
  currency: string;
  status: 'ACTIVE' | 'INACTIVE' | 'FROZEN' | 'CLOSED';
  isLinked: boolean;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Transaction Types
export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  amount: number;
  currency: string;
  type: 'DEBIT' | 'CREDIT';
  category: string;
  description: string;
  merchantName?: string;
  transactionDate: string;
  referenceNumber?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// Goal Types
export interface Goal {
  id: string;
  userId: string;
  name: string;
  title?: string;
  description: string;
  category: 'SAVINGS' | 'INVESTMENT' | 'DEBT_PAYMENT' | 'EMERGENCY_FUND' | 'RETIREMENT' | 'EDUCATION' | 'VACATION' | 'REAL_ESTATE' | 'VEHICLE' | 'WEDDING' | 'BUSINESS' | 'OTHER';
  targetAmount: number;
  currentAmount: number;
  currency: string;
  startDate: string;
  targetDate: string;
  status: 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'CANCELLED' | 'EXPIRED';
  priority: 1 | 2 | 3 | 4;
  autoContribute: boolean;
  contributionAmount?: number;
  contributionFrequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  createdAt: string;
  updatedAt: string;
}

// Goal Contribution
export interface GoalContribution {
  id: string;
  goalId: string;
  userId: string;
  amount: number;
  currency: string;
  type: 'MANUAL' | 'AUTOMATIC' | 'TRANSFER' | 'ADJUSTMENT';
  transactionId?: string;
  accountId?: string;
  notes?: string;
  createdAt: string;
}

// Milestone
export interface Milestone {
  id: string;
  goalId: string;
  name: string;
  targetAmount: number;
  targetDate: string;
  isCompleted: boolean;
  completedAt?: string;
  createdAt: string;
}

// Investment Types
export interface Investment {
  id: string;
  userId: string;
  investmentType: 'mutual_fund' | 'stock' | 'bond' | 'gold' | 'crypto' | 'fd';
  assetName: string;
  isinCode?: string;
  folioNumber?: string;
  units?: number;
  averageBuyPrice: number;
  currentPrice: number;
  currentValue: number;
  investedAmount: number;
  absoluteReturn?: number;
  xirr?: number;
  purchaseDate: string;
  lastUpdatedPrice?: string;
  createdAt: string;
  updatedAt: string;
}

// Budget Types
export interface Budget {
  id: string;
  userId: string;
  category: string;
  amount: number;
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Alert Types
export interface Alert {
  id: string;
  userId: string;
  type: 'BUDGET_EXCEEDED' | 'GOAL_OFF_TRACK' | 'SPENDING_SPIKE' | 'BILL_REMINDER' | 'ANOMALY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  isRead: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

// Chat Message Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: {
    charts?: any[];
    actions?: any[];
    citations?: any[];
  };
}

// Simulation Types
export interface SimulationResult {
  type: 'emi' | 'retirement' | 'sip' | 'home_loan' | 'monte_carlo';
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  charts?: any[];
  createdAt: string;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// Error Types
export interface ApiError {
  message: string;
  code?: string;
  statusCode: number;
  errors?: Array<{
    field?: string;
    message: string;
  }>;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: 'email' | 'push' | 'in_app';
  title: string;
  body: string;
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
}
