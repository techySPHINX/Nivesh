/**
 * Get Financial Context Query
 * Retrieves aggregated financial context for a user
 */
export class GetFinancialContextQuery {
  constructor(public readonly userId: string) { }
}
