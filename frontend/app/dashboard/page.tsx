'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import NetWorthCard from '@/components/dashboard/NetWorthCard';
import GoalProgressWidget from '@/components/dashboard/GoalProgressWidget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Transaction, Budget } from '@/types';
import {
  ArrowUpRight,
  ArrowDownRight,
  MessageSquare,
  TrendingUp,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [transactionsRes, budgetsRes] = await Promise.all([
          api.get('/api/v1/transactions?limit=5'),
          api.get('/api/v1/budgets'),
        ]);
        setRecentTransactions(transactionsRes.data);
        setBudgets(budgetsRes.data.slice(0, 3));
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getBudgetStatus = (budget: Budget) => {
    const percentage = (budget.currentSpending / budget.amount) * 100;
    if (percentage >= budget.alertThreshold) return 'critical';
    if (percentage >= budget.alertThreshold * 0.8) return 'warning';
    return 'normal';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Your financial overview at a glance
            </p>
          </div>
          <Link href="/dashboard/chat">
            <Button>
              <MessageSquare className="h-4 w-4 mr-2" />
              Ask AI Assistant
            </Button>
          </Link>
        </div>

        {/* Top Row - Net Worth & Goals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <NetWorthCard />
          <GoalProgressWidget />
        </div>

        {/* Middle Row - Budgets */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Active Budgets
            </CardTitle>
            <Link href="/dashboard/budgets">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-16 bg-muted rounded"></div>
                <div className="h-16 bg-muted rounded"></div>
              </div>
            ) : budgets.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  No active budgets. Create one to track your spending!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {budgets.map((budget) => {
                  const percentage = (budget.currentSpending / budget.amount) * 100;
                  const status = getBudgetStatus(budget);
                  return (
                    <div key={budget.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{budget.category}</h4>
                          {status === 'critical' && (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <div className="text-sm">
                          <span className="font-semibold">
                            {formatCurrency(budget.currentSpending)}
                          </span>
                          <span className="text-muted-foreground">
                            {' '}
                            / {formatCurrency(budget.amount)}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              status === 'critical'
                                ? 'bg-red-500'
                                : status === 'warning'
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {percentage.toFixed(1)}% used • {budget.period}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bottom Row - Recent Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Transactions
            </CardTitle>
            <Link href="/dashboard/transactions">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-muted rounded"></div>
                ))}
              </div>
            ) : recentTransactions.length === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  No transactions yet
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-full ${
                          transaction.type === 'CREDIT'
                            ? 'bg-green-100 text-green-600'
                            : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {transaction.type === 'CREDIT' ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {transaction.category} •{' '}
                          {formatDate(new Date(transaction.transactionDate))}
                        </p>
                      </div>
                    </div>
                    <p
                      className={`font-semibold ${
                        transaction.type === 'CREDIT'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {transaction.type === 'CREDIT' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
