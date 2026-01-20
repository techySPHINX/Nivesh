/**
 * Value Object for Cypher Query
 * Represents a validated Neo4j Cypher query with parameters
 * Ensures query safety and parameter binding
 */
export class CypherQuery {
  private readonly _query: string;
  private readonly _parameters: Record<string, any>;
  private readonly _readonly: boolean;

  private constructor(
    query: string,
    parameters: Record<string, any>,
    readonly: boolean,
  ) {
    this._query = query;
    this._parameters = parameters;
    this._readonly = readonly;
  }

  /**
   * Create a new Cypher query with parameter validation
   */
  static create(
    query: string,
    parameters: Record<string, any> = {},
  ): CypherQuery {
    // Validate query is not empty
    if (!query || query.trim().length === 0) {
      throw new Error('Query cannot be empty');
    }

    // Detect if query is read-only (doesn't modify data)
    const readonly = this.isReadOnlyQuery(query);

    // Sanitize parameters (remove undefined, null becomes explicit)
    const sanitizedParams = this.sanitizeParameters(parameters);

    return new CypherQuery(query.trim(), sanitizedParams, readonly);
  }

  /**
   * Create a query for node creation
   */
  static createNode(
    nodeType: string,
    properties: Record<string, any>,
  ): CypherQuery {
    const query = `
      MERGE (n:${nodeType} {id: $id})
      SET n += $properties
      RETURN n
    `;
    return CypherQuery.create(query, { ...properties, id: properties.id });
  }

  /**
   * Create a query for relationship creation
   */
  static createRelationship(
    fromNodeId: string,
    toNodeId: string,
    relationshipType: string,
    properties: Record<string, any> = {},
  ): CypherQuery {
    const query = `
      MATCH (from {id: $fromId})
      MATCH (to {id: $toId})
      MERGE (from)-[r:${relationshipType}]->(to)
      SET r += $properties
      RETURN r
    `;
    return CypherQuery.create(query, {
      fromId: fromNodeId,
      toId: toNodeId,
      properties,
    });
  }

  /**
   * Create a query for pattern matching
   */
  static matchPattern(
    pattern: string,
    where?: string,
    parameters?: Record<string, any>,
  ): CypherQuery {
    let query = `MATCH ${pattern}`;
    if (where) {
      query += ` WHERE ${where}`;
    }
    query += ` RETURN *`;
    return CypherQuery.create(query, parameters);
  }

  /**
   * Check if query only reads data (no modifications)
   */
  private static isReadOnlyQuery(query: string): boolean {
    const upperQuery = query.toUpperCase();
    const mutatingKeywords = [
      'CREATE',
      'MERGE',
      'DELETE',
      'REMOVE',
      'SET',
      'DETACH',
    ];
    return !mutatingKeywords.some((keyword) => upperQuery.includes(keyword));
  }

  /**
   * Sanitize parameters for safe execution
   */
  private static sanitizeParameters(
    params: Record<string, any>,
  ): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(params)) {
      // Skip undefined values
      if (value === undefined) {
        continue;
      }

      // Convert dates to ISO strings
      if (value instanceof Date) {
        sanitized[key] = value.toISOString();
        continue;
      }

      // Handle nested objects
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeParameters(value);
        continue;
      }

      sanitized[key] = value;
    }

    return sanitized;
  }

  /**
   * Add additional parameters to the query
   */
  withParameters(additionalParams: Record<string, any>): CypherQuery {
    return new CypherQuery(
      this._query,
      { ...this._parameters, ...additionalParams },
      this._readonly,
    );
  }

  /**
   * Add pagination to the query
   */
  withPagination(limit: number, skip = 0): CypherQuery {
    const paginatedQuery = `${this._query} SKIP $skip LIMIT $limit`;
    return new CypherQuery(
      paginatedQuery,
      { ...this._parameters, skip, limit },
      this._readonly,
    );
  }

  /**
   * Add ordering to the query
   */
  withOrdering(orderBy: string, direction: 'ASC' | 'DESC' = 'ASC'): CypherQuery {
    const orderedQuery = `${this._query} ORDER BY ${orderBy} ${direction}`;
    return new CypherQuery(orderedQuery, this._parameters, this._readonly);
  }

  // Getters
  get query(): string {
    return this._query;
  }

  get parameters(): Readonly<Record<string, any>> {
    return Object.freeze({ ...this._parameters });
  }

  get isReadonly(): boolean {
    return this._readonly;
  }

  /**
   * Value equality
   */
  equals(other: CypherQuery): boolean {
    return (
      this._query === other._query &&
      JSON.stringify(this._parameters) === JSON.stringify(other._parameters)
    );
  }

  /**
   * Convert to string representation for logging
   */
  toString(): string {
    return `CypherQuery: ${this._query}\nParams: ${JSON.stringify(
      this._parameters,
      null,
      2,
    )}`;
  }
}
