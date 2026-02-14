import apiClient from './client';
import { ApiResponse, User, Account, Transaction, Goal, GoalContribution, Investment, Budget, Alert, Notification, PaginatedResponse } from '@/types';

// ==========================================
// User API
// ==========================================
export const userApi = {
  getProfile: () => apiClient.get<ApiResponse<User>>('/users/me'),
  
  updateProfile: (data: Partial<User>) => 
    apiClient.patch<ApiResponse<User>>('/users/me', data),
  
  deleteAccount: () => apiClient.delete('/users/me'),
};

// ==========================================
// Account API
// ==========================================
export const accountApi = {
  list: () => apiClient.get<ApiResponse<Account[]>>('/accounts'),
  
  get: (id: string) => apiClient.get<ApiResponse<Account>>(`/accounts/${id}`),
  
  create: (data: Partial<Account>) => 
    apiClient.post<ApiResponse<Account>>('/accounts', data),
  
  update: (id: string, data: Partial<Account>) => 
    apiClient.patch<ApiResponse<Account>>(`/accounts/${id}`, data),
  
  delete: (id: string) => apiClient.delete(`/accounts/${id}`),
  
  sync: (id: string) => 
    apiClient.post<ApiResponse<Account>>(`/accounts/${id}/sync`),
};

// ==========================================
// Transaction API
// ==========================================
export const transactionApi = {
  list: (params?: { page?: number; pageSize?: number; accountId?: string; category?: string; startDate?: string; endDate?: string }) => 
    apiClient.get<PaginatedResponse<Transaction>>('/transactions', { params }),
  
  get: (id: string) => 
    apiClient.get<ApiResponse<Transaction>>(`/transactions/${id}`),
  
  create: (data: Partial<Transaction>) => 
    apiClient.post<ApiResponse<Transaction>>('/transactions', data),
  
  update: (id: string, data: Partial<Transaction>) => 
    apiClient.patch<ApiResponse<Transaction>>(`/transactions/${id}`, data),
  
  delete: (id: string) => apiClient.delete(`/transactions/${id}`),
  
  // Analytics
  getSpendingByCategory: (params?: { startDate?: string; endDate?: string }) => 
    apiClient.get('/transactions/analytics/spending-by-category', { params }),
  
  getMonthlyTrends: (params?: { months?: number }) => 
    apiClient.get('/transactions/analytics/monthly-trends', { params }),
};

// ==========================================
// Goal API
// ==========================================
export const goalApi = {
  list: (params?: { status?: string; category?: string }) => 
    apiClient.get<ApiResponse<Goal[]>>('/goals', { params }),
  
  get: (id: string) => 
    apiClient.get<ApiResponse<Goal>>(`/goals/${id}`),
  
  create: (data: Partial<Goal>) => 
    apiClient.post<ApiResponse<Goal>>('/goals', data),
  
  update: (id: string, data: Partial<Goal>) => 
    apiClient.patch<ApiResponse<Goal>>(`/goals/${id}`, data),
  
  delete: (id: string) => apiClient.delete(`/goals/${id}`),
  
  // Contributions
  addContribution: (goalId: string, data: Partial<GoalContribution>) => 
    apiClient.post<ApiResponse<GoalContribution>>(`/goals/${goalId}/contributions`, data),
  
  getContributions: (goalId: string, params?: { page?: number; pageSize?: number }) => 
    apiClient.get<PaginatedResponse<GoalContribution>>(`/goals/${goalId}/contributions`, { params }),
  
  // Progress
  getProgress: (goalId: string) => 
    apiClient.get(`/goals/${goalId}/progress`),
};

// ==========================================
// Investment API
// ==========================================
export const investmentApi = {
  list: (params?: { type?: string }) => 
    apiClient.get<ApiResponse<Investment[]>>('/investments', { params }),
  
  get: (id: string) => 
    apiClient.get<ApiResponse<Investment>>(`/investments/${id}`),
  
  create: (data: Partial<Investment>) => 
    apiClient.post<ApiResponse<Investment>>('/investments', data),
  
  update: (id: string, data: Partial<Investment>) => 
    apiClient.patch<ApiResponse<Investment>>(`/investments/${id}`, data),
  
  delete: (id: string) => apiClient.delete(`/investments/${id}`),
  
  // Portfolio
  getPortfolio: () => 
    apiClient.get('/investments/portfolio'),
  
  getPortfolioAllocation: () => 
    apiClient.get('/investments/portfolio/allocation'),
};

// ==========================================
// Budget API
// ==========================================
export const budgetApi = {
  list: () => apiClient.get<ApiResponse<Budget[]>>('/budgets'),
  
  get: (id: string) => 
    apiClient.get<ApiResponse<Budget>>(`/budgets/${id}`),
  
  create: (data: Partial<Budget>) => 
    apiClient.post<ApiResponse<Budget>>('/budgets', data),
  
  update: (id: string, data: Partial<Budget>) => 
    apiClient.patch<ApiResponse<Budget>>(`/budgets/${id}`, data),
  
  delete: (id: string) => apiClient.delete(`/budgets/${id}`),
  
  // Spending
  getSpending: (id: string) => 
    apiClient.get(`/budgets/${id}/spending`),
};

// ==========================================
// Simulation API
// ==========================================
export const simulationApi = {
  calculateEMI: (data: { principal: number; rate: number; tenure: number }) => 
    apiClient.post('/simulations/emi', data),
  
  calculateRetirement: (data: { currentAge: number; retirementAge: number; currentSavings: number; monthlySIP: number; expectedReturn: number; inflation: number }) => 
    apiClient.post('/simulations/retirement', data),
  
  calculateSIP: (data: { monthlyInvestment: number; expectedReturn: number; tenure: number }) => 
    apiClient.post('/simulations/sip', data),
  
  calculateHomeLoan: (data: { income: number; existingEMIs: number; downPayment: number; interestRate: number; tenure: number }) => 
    apiClient.post('/simulations/home-loan', data),
  
  runMonteCarlo: (data: { initialInvestment: number; monthlyContribution: number; years: number; expectedReturn: number; volatility: number; simulations?: number }) => 
    apiClient.post('/simulations/monte-carlo', data),
};

// ==========================================
// AI Chat API  
// ==========================================
export const chatApi = {
  sendMessage: (data: { query: string; conversationId?: string }) => 
    apiClient.post('/ai/chat', data),
  
  getHistory: (conversationId: string) => 
    apiClient.get(`/ai/conversations/${conversationId}`),
  
  listConversations: () => 
    apiClient.get('/ai/conversations'),
  
  deleteConversation: (conversationId: string) => 
    apiClient.delete(`/ai/conversations/${conversationId}`),
};

// ==========================================
// Alert API
// ==========================================
export const alertApi = {
  list: (params?: { isRead?: boolean; severity?: string }) => 
    apiClient.get<ApiResponse<Alert[]>>('/alerts', { params }),
  
  markAsRead: (id: string) => 
    apiClient.patch(`/alerts/${id}/read`),
  
  markAllAsRead: () => 
    apiClient.patch('/alerts/read-all'),
  
  delete: (id: string) => apiClient.delete(`/alerts/${id}`),
};

// ==========================================
// Notification API
// ==========================================
export const notificationApi = {
  list: (params?: { page?: number; pageSize?: number; isRead?: boolean }) => 
    apiClient.get<PaginatedResponse<Notification>>('/notifications', { params }),
  
  markAsRead: (id: string) => 
    apiClient.patch(`/notifications/${id}/read`),
  
  getUnreadCount: () => 
    apiClient.get<ApiResponse<{ count: number }>>('/notifications/unread-count'),
  
  registerDevice: (token: string, platform: 'android' | 'ios' | 'web') => 
    apiClient.post('/notifications/register-device', { token, platform }),
};
