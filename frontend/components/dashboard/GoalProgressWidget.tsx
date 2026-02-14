'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Goal } from '@/types';
import { Target, Plus, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function GoalProgressWidget() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/v1/goals');
        setGoals(response.data.slice(0, 3)); // Show top 3 goals
      } catch (err: any) {
        console.error('Failed to fetch goals:', err);
        setError(err.message || 'Failed to load goals');
      } finally {
        setLoading(false);
      }
    };

    fetchGoals();
  }, []);

  const calculateProgress = (goal: Goal) => {
    return (goal.currentAmount / goal.targetAmount) * 100;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Financial Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-muted rounded"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Financial Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Financial Goals
        </CardTitle>
        <Link href="/dashboard/goals">
          <Button variant="ghost" size="sm">
            View All
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {goals.length === 0 ? (
          <div className="text-center py-8">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              No goals yet. Start planning your financial future!
            </p>
            <Link href="/dashboard/goals">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Goal
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => {
              const progress = calculateProgress(goal);
              return (
                <div key={goal.id} className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{goal.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        Target: {formatDate(new Date(goal.targetDate))}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {formatCurrency(goal.currentAmount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        of {formatCurrency(goal.targetAmount)}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{progress.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
