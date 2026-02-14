'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api/client';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface NetWorthData {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  changePercentage?: number;
}

export default function NetWorthCard() {
  const [data, setData] = useState<NetWorthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNetWorth = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/v1/users/me');
        const userData = response.data;

        // Calculate net worth from user accounts
        const accounts = userData.accounts || [];
        const totalAssets = accounts
          .filter((acc: any) => acc.balance > 0)
          .reduce((sum: number, acc: any) => sum + acc.balance, 0);
        const totalLiabilities = accounts
          .filter((acc: any) => acc.balance < 0)
          .reduce((sum: number, acc: any) => sum + Math.abs(acc.balance), 0);

        setData({
          totalAssets,
          totalLiabilities,
          netWorth: totalAssets - totalLiabilities,
          changePercentage: userData.netWorthChange || 0,
        });
      } catch (err: any) {
        console.error('Failed to fetch net worth:', err);
        setError(err.message || 'Failed to load net worth data');
      } finally {
        setLoading(false);
      }
    };

    fetchNetWorth();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Net Worth
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-10 bg-muted rounded mb-2"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
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
            <DollarSign className="h-5 w-5" />
            Net Worth
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const isPositiveChange = (data?.changePercentage || 0) >= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Net Worth
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-3xl font-bold">
              {formatCurrency(data?.netWorth || 0)}
            </p>
            {data?.changePercentage !== undefined && (
              <div
                className={`flex items-center gap-1 text-sm mt-1 ${
                  isPositiveChange ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {isPositiveChange ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span>
                  {isPositiveChange ? '+' : ''}
                  {data.changePercentage.toFixed(2)}% this month
                </span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Assets</span>
              <span className="font-medium">
                {formatCurrency(data?.totalAssets || 0)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Liabilities</span>
              <span className="font-medium text-red-600">
                {formatCurrency(data?.totalLiabilities || 0)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
