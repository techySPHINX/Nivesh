import { Tool } from '../types/agent.types';
import { Neo4jService } from '../../../core/database/neo4j/neo4j.service';
import { Result } from 'neo4j-driver';

/**
 * Financial Graph Query Tool
 * Queries Neo4j knowledge graph for relationship-based financial insights.
 *
 * Query Types:
 * - spending_patterns: Category-wise transaction analysis
 * - merchant_loyalty: Merchant relationship strength
 * - anomaly_detection: Unusual transaction detection
 * - goal_impact: Goal-transaction relationship mapping
 * - income_sources: Income diversification analysis
 * - debt_structure: Debt relationship mapping
 *
 * Example Cypher Query (spending_patterns):
 * ```
 * MATCH (u:User {id: $userId})-[:MADE]->(t:Transaction)-[:IN_CATEGORY]->(c:Category)
 * WHERE t.date >= $startDate AND t.date <= $endDate
 * RETURN c.name as category,
 *        count(t) as transactionCount,
 *        sum(t.amount) as totalAmount,
 *        avg(t.amount) as averageAmount
 * ORDER BY totalAmount DESC
 * ```
 *
 * @tool query_financial_graph
 */

interface GraphQueryInput {
  userId: string;
  queryType:
    | 'spending_patterns'
    | 'merchant_loyalty'
    | 'anomaly_detection'
    | 'goal_impact'
    | 'income_sources'
    | 'risk_indicators';
  timeframe?: string;          // 'month', 'quarter', 'year'
  category?: string;           // Filter by category
  merchantName?: string;       // Filter by merchant
  goalId?: string;            // Filter by goal
  startDate?: string;         // Custom start date (ISO)
  endDate?: string;           // Custom end date (ISO)
}

interface GraphQueryOutput {
  queryType: string;
  executionTime: number;
  resultCount: number;
  categories?: Array<{
    name: string;
    transactionCount: number;
    totalAmount: number;
    averageAmount: number;
    trend: 'increasing' | 'stable' | 'decreasing';
    topMerchants: string[];
    timeframe: string;
    anomalies: any[];
  }>;
  merchants?: Array<{
    name: string;
    totalSpent: number;
    transactionCount: number;
    frequency: number;
    category: string;
    averageTicketSize: number;
  }>;
  anomalies?: Array<{
    transactionId: string;
    category: string;
    amount: number;
    date: string;
    merchant: string;
    deviation: number;
    reason: string;
  }>;
  goal?: {
    id: string;
    name: string;
    targetAmount: number;
    monthlySavings: number;
    actualMonthlySavings: number;
  };
  impactingCategories?: Array<{
    name: string;
    amount: number;
    suggestedReduction: number;
  }>;
  incomeSources?: Array<{
    source: string;
    totalAmount: number;
    transactionCount: number;
    percentage: number;
  }>;
  riskIndicators?: Array<{
    type: string;
    severity: string;
    description: string;
    value: number;
  }>;
  monthlyIncome?: number;
}

/** Safely convert neo4j Integer or number to JS number */
function toNumber(val: any): number {
  if (val == null) return 0;
  if (typeof val.toNumber === 'function') return val.toNumber();
  return Number(val);
}

/** Extract records array from a neo4j Result */
function extractRecords(result: Result): any[] {
  return (result as any).records ?? [];
}

/** Compute date range boundaries from timeframe string */
function getDateRange(timeframe: string, startDate?: string, endDate?: string) {
  const now = new Date();
  const end = endDate ? new Date(endDate) : now;
  let start: Date;

  if (startDate) {
    start = new Date(startDate);
  } else {
    start = new Date(now);
    switch (timeframe) {
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
      case 'quarter':
        start.setMonth(start.getMonth() - 3);
        break;
      case 'month':
      default:
        start.setMonth(start.getMonth() - 1);
        break;
    }
  }

  return { start: start.toISOString(), end: end.toISOString() };
}

/**
 * Factory: create query_financial_graph tool wired to a real Neo4jService.
 */
export function createQueryFinancialGraphTool(neo4jService: Neo4jService): Tool {
  return {
    name: 'query_financial_graph',
    description:
      'Query Neo4j knowledge graph for relationship-based financial insights including spending patterns, merchant loyalty, anomaly detection, and goal impact analysis',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'User ID to query data for' },
        queryType: {
          type: 'string',
          enum: [
            'spending_patterns',
            'merchant_loyalty',
            'anomaly_detection',
            'goal_impact',
            'income_sources',
            'risk_indicators',
          ],
          description: 'Type of graph query to execute',
        },
        timeframe: {
          type: 'string',
          enum: ['month', 'quarter', 'year'],
          description: 'Time period for analysis (optional)',
          default: 'month',
        },
        category: { type: 'string', description: 'Filter by specific category (optional)' },
        merchantName: { type: 'string', description: 'Filter by specific merchant (optional)' },
        goalId: { type: 'string', description: 'Filter by specific goal (optional)' },
        startDate: { type: 'string', description: 'Custom start date in ISO format (optional)' },
        endDate: { type: 'string', description: 'Custom end date in ISO format (optional)' },
      },
      required: ['userId', 'queryType'],
    },
    handler: async (args: GraphQueryInput): Promise<GraphQueryOutput> => {
      const startTime = Date.now();
      const { userId, queryType, timeframe = 'month', category, merchantName, goalId, startDate, endDate } = args;
      const { start, end } = getDateRange(timeframe, startDate, endDate);

      try {
        let resultData: Partial<GraphQueryOutput> = {};

        switch (queryType) {
          case 'spending_patterns': {
            const prevStart = new Date(start);
            const rangeMs = new Date(end).getTime() - new Date(start).getTime();
            prevStart.setTime(prevStart.getTime() - rangeMs);

            const cypher = `
              MATCH (u:User {id: $userId})-[:MADE]->(t:Transaction)-[:IN_CATEGORY]->(c:Category)
              WHERE t.transactionDate >= $start AND t.transactionDate <= $end
                ${category ? 'AND c.name = $category' : ''}
              WITH c.name AS name,
                   count(t) AS txCount,
                   sum(t.amount) AS total,
                   avg(t.amount) AS avg,
                   collect(DISTINCT coalesce(t.merchantName, 'Unknown'))[0..3] AS topMerchants
              OPTIONAL MATCH (u2:User {id: $userId})-[:MADE]->(tPrev:Transaction)-[:IN_CATEGORY]->(cp:Category)
              WHERE cp.name = name
                AND tPrev.transactionDate >= $prevStart AND tPrev.transactionDate < $start
              WITH name, txCount, total, avg, topMerchants, sum(tPrev.amount) AS prevTotal
              RETURN name, txCount, total, avg, topMerchants,
                     CASE
                       WHEN prevTotal IS NULL OR prevTotal = 0 THEN 'stable'
                       WHEN total > prevTotal * 1.1 THEN 'increasing'
                       WHEN total < prevTotal * 0.9 THEN 'decreasing'
                       ELSE 'stable'
                     END AS trend
              ORDER BY total DESC
            `;
            const result = await neo4jService.read(cypher, {
              userId, start, end,
              prevStart: prevStart.toISOString(),
              ...(category ? { category } : {}),
            });
            resultData.categories = extractRecords(result).map((r) => ({
              name: r.get('name'),
              transactionCount: toNumber(r.get('txCount')),
              totalAmount: toNumber(r.get('total')),
              averageAmount: toNumber(r.get('avg')),
              trend: r.get('trend') as 'increasing' | 'stable' | 'decreasing',
              topMerchants: r.get('topMerchants') ?? [],
              timeframe,
              anomalies: [],
            }));

            const incResult = await neo4jService.read(
              `MATCH (u:User {id: $userId})-[:MADE]->(t:Transaction)
               WHERE t.type IN ['credit','income','CREDIT']
                 AND t.transactionDate >= $start AND t.transactionDate <= $end
               RETURN sum(t.amount) AS monthlyIncome`,
              { userId, start, end },
            );
            const incRecs = extractRecords(incResult);
            if (incRecs.length > 0) resultData.monthlyIncome = toNumber(incRecs[0].get('monthlyIncome'));
            break;
          }

          case 'merchant_loyalty': {
            const cypher = `
              MATCH (u:User {id: $userId})-[:MADE]->(t:Transaction)
              WHERE t.transactionDate >= $start AND t.transactionDate <= $end
                AND t.merchantName IS NOT NULL
                ${merchantName ? 'AND t.merchantName = $merchantName' : ''}
              WITH t.merchantName AS name,
                   sum(t.amount) AS totalSpent,
                   count(t) AS txCount,
                   coalesce(t.category, 'Uncategorised') AS category
              RETURN name, totalSpent, txCount, category,
                     txCount * 1.0 / 30 AS monthlyFreq,
                     totalSpent * 1.0 / txCount AS avgTicket
              ORDER BY totalSpent DESC
              LIMIT 20
            `;
            const result = await neo4jService.read(cypher, {
              userId, start, end,
              ...(merchantName ? { merchantName } : {}),
            });
            resultData.merchants = extractRecords(result).map((r) => ({
              name: r.get('name'),
              totalSpent: toNumber(r.get('totalSpent')),
              transactionCount: toNumber(r.get('txCount')),
              frequency: toNumber(r.get('monthlyFreq')),
              category: r.get('category') ?? 'Uncategorised',
              averageTicketSize: toNumber(r.get('avgTicket')),
            }));
            break;
          }

          case 'anomaly_detection': {
            const cypher = `
              MATCH (u:User {id: $userId})-[:MADE]->(t:Transaction)-[:IN_CATEGORY]->(c:Category)
              WHERE t.transactionDate >= $start AND t.transactionDate <= $end
              WITH c.name AS catName, avg(t.amount) AS catAvg, stDev(t.amount) AS catStd
              MATCH (u2:User {id: $userId})-[:MADE]->(tx:Transaction)-[:IN_CATEGORY]->(cc:Category)
              WHERE cc.name = catName AND tx.amount > catAvg + 2 * catStd
              RETURN tx.id AS txId, catName AS category,
                     tx.amount AS amount,
                     toString(tx.transactionDate) AS txDate,
                     coalesce(tx.merchantName,'Unknown') AS merchant,
                     round((tx.amount - catAvg) / catAvg * 100) AS deviation,
                     catAvg
              ORDER BY deviation DESC
              LIMIT 20
            `;
            const result = await neo4jService.read(cypher, { userId, start, end });
            resultData.anomalies = extractRecords(result).map((r) => {
              const deviation = toNumber(r.get('deviation'));
              const catAvg = toNumber(r.get('catAvg'));
              return {
                transactionId: r.get('txId'),
                category: r.get('category'),
                amount: toNumber(r.get('amount')),
                date: r.get('txDate'),
                merchant: r.get('merchant'),
                deviation,
                reason: `Amount ${deviation}% above category average (₹${Math.round(catAvg)})`,
              };
            });
            break;
          }

          case 'goal_impact': {
            const cypher = `
              MATCH (u:User {id: $userId})-[:HAS_GOAL]->(g:Goal)
              WHERE g.status = 'active' ${goalId ? 'AND g.id = $goalId' : ''}
              WITH g LIMIT 1
              OPTIONAL MATCH (u)-[:MADE]->(t:Transaction)
              WHERE t.transactionDate >= $start AND t.transactionDate <= $end
                AND t.type IN ['debit','DEBIT','expense']
              WITH g, t.category AS catName, sum(t.amount) AS catTotal
              RETURN g.id AS goalId,
                     coalesce(g.name, g.title, 'Goal') AS goalName,
                     g.targetAmount AS target,
                     g.monthlyContribution AS monthlySavings,
                     collect({category: catName, amount: catTotal}) AS catItems
            `;
            const result = await neo4jService.read(cypher, {
              userId, start, end,
              ...(goalId ? { goalId } : {}),
            });
            const records = extractRecords(result);
            if (records.length > 0) {
              const r = records[0];
              const catItems: Array<{ category: string; amount: number }> = r.get('catItems') ?? [];
              const impacting = catItems
                .filter((i) => i.category)
                .sort((a, b) => toNumber(b.amount) - toNumber(a.amount))
                .slice(0, 5)
                .map(({ category: name, amount }) => ({
                  name,
                  amount: toNumber(amount),
                  suggestedReduction: Math.round(toNumber(amount) * 0.2),
                }));

              const monthlySavings = toNumber(r.get('monthlySavings'));
              resultData.goal = {
                id: r.get('goalId'),
                name: r.get('goalName'),
                targetAmount: toNumber(r.get('target')),
                monthlySavings,
                actualMonthlySavings: Math.max(0, monthlySavings - impacting.reduce((s, i) => s + i.suggestedReduction, 0)),
              };
              resultData.impactingCategories = impacting;
            }
            break;
          }

          case 'income_sources': {
            const cypher = `
              MATCH (u:User {id: $userId})-[:MADE]->(t:Transaction)
              WHERE t.type IN ['credit','income','CREDIT']
                AND t.transactionDate >= $start AND t.transactionDate <= $end
              WITH coalesce(t.merchantName, t.category, 'Other') AS source,
                   sum(t.amount) AS total, count(t) AS txCount
              WITH collect({source: source, total: total, txCount: txCount}) AS rows,
                   sum(total) AS grandTotal
              UNWIND rows AS row
              RETURN row.source AS source, row.total AS total, row.txCount AS txCount,
                     round(row.total / grandTotal * 100, 2) AS percentage
              ORDER BY total DESC LIMIT 10
            `;
            const result = await neo4jService.read(cypher, { userId, start, end });
            resultData.incomeSources = extractRecords(result).map((r) => ({
              source: r.get('source'),
              totalAmount: toNumber(r.get('total')),
              transactionCount: toNumber(r.get('txCount')),
              percentage: toNumber(r.get('percentage')),
            }));
            break;
          }

          case 'risk_indicators': {
            const cypher = `
              MATCH (u:User {id: $userId})-[:MADE]->(t:Transaction)
              WHERE t.transactionDate >= $start AND t.transactionDate <= $end
              WITH
                sum(CASE WHEN t.type IN ['debit','DEBIT','expense'] THEN t.amount ELSE 0 END) AS totalExpense,
                sum(CASE WHEN t.type IN ['credit','CREDIT','income'] THEN t.amount ELSE 0 END) AS totalIncome,
                sum(CASE WHEN t.category IN ['EMI','Loan','CreditCard'] THEN t.amount ELSE 0 END) AS debtPayments
              RETURN totalExpense, totalIncome, debtPayments,
                     CASE WHEN totalIncome > 0 THEN round(debtPayments / totalIncome * 100, 2) ELSE 0 END AS debtRatio,
                     CASE WHEN totalIncome > 0 THEN round(totalExpense / totalIncome * 100, 2) ELSE 0 END AS expenseRatio
            `;
            const result = await neo4jService.read(cypher, { userId, start, end });
            const records = extractRecords(result);
            if (records.length > 0) {
              const r = records[0];
              const debtRatio = toNumber(r.get('debtRatio'));
              const expenseRatio = toNumber(r.get('expenseRatio'));
              const indicators: Required<GraphQueryOutput>['riskIndicators'] = [];
              if (debtRatio > 40) {
                indicators.push({
                  type: 'HIGH_DEBT_RATIO',
                  severity: debtRatio > 60 ? 'critical' : 'high',
                  description: `Debt payments are ${debtRatio}% of income (safe max: 40%)`,
                  value: debtRatio,
                });
              }
              if (expenseRatio > 90) {
                indicators.push({
                  type: 'HIGH_EXPENSE_RATIO',
                  severity: expenseRatio > 100 ? 'critical' : 'high',
                  description: `Spending is ${expenseRatio}% of income — very low savings margin`,
                  value: expenseRatio,
                });
              }
              resultData.riskIndicators = indicators;
            }
            break;
          }
        }

        const executionTime = Date.now() - startTime;
        const resultCount =
          resultData.categories?.length ??
          resultData.merchants?.length ??
          resultData.anomalies?.length ??
          resultData.incomeSources?.length ??
          resultData.riskIndicators?.length ??
          (resultData.goal ? 1 : 0);

        return { queryType, executionTime, resultCount, ...resultData };
      } catch (error) {
        throw new Error(`Graph query failed [${queryType}]: ${error.message}`);
      }
    },
  };
}

/**
 * Backward-compatible stub.
 * ToolBootstrapService calls createQueryFinancialGraphTool(this.neo4jService) directly.
 */
export const queryFinancialGraphTool: Tool = createQueryFinancialGraphTool(null as any);




