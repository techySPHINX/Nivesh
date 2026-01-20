/**
 * Value Object for Graph Query Result
 * Represents the result of a Cypher query execution
 * Provides type-safe access to Neo4j query results
 */
export class GraphQueryResult<T = any> {
  private readonly _records: T[];
  private readonly _summary: QuerySummary;
  private readonly _executionTime: number;

  private constructor(
    records: T[],
    summary: QuerySummary,
    executionTime: number,
  ) {
    this._records = records;
    this._summary = summary;
    this._executionTime = executionTime;
  }

  /**
   * Create result from successful query execution
   */
  static success<T>(
    records: T[],
    counters: QueryCounters,
    executionTime: number,
  ): GraphQueryResult<T> {
    const summary: QuerySummary = {
      counters,
      executionTime,
      recordCount: records.length,
      hasMore: false,
    };

    return new GraphQueryResult(records, summary, executionTime);
  }

  /**
   * Create empty result
   */
  static empty<T>(): GraphQueryResult<T> {
    return new GraphQueryResult<T>(
      [],
      {
        counters: {
          nodesCreated: 0,
          nodesDeleted: 0,
          relationshipsCreated: 0,
          relationshipsDeleted: 0,
          propertiesSet: 0,
        },
        executionTime: 0,
        recordCount: 0,
        hasMore: false,
      },
      0,
    );
  }

  /**
   * Map records to a different type
   */
  map<U>(mapper: (record: T) => U): GraphQueryResult<U> {
    const mappedRecords = this._records.map(mapper);
    return new GraphQueryResult(mappedRecords, this._summary, this._executionTime);
  }

  /**
   * Filter records
   */
  filter(predicate: (record: T) => boolean): GraphQueryResult<T> {
    const filtered = this._records.filter(predicate);
    return new GraphQueryResult(
      filtered,
      {
        ...this._summary,
        recordCount: filtered.length,
      },
      this._executionTime,
    );
  }

  /**
   * Get first record or undefined
   */
  first(): T | undefined {
    return this._records[0];
  }

  /**
   * Get first record or throw error
   */
  firstOrThrow(message = 'No records found'): T {
    const first = this.first();
    if (!first) {
      throw new Error(message);
    }
    return first;
  }

  /**
   * Check if result has any records
   */
  isEmpty(): boolean {
    return this._records.length === 0;
  }

  /**
   * Check if result has records
   */
  hasRecords(): boolean {
    return this._records.length > 0;
  }

  /**
   * Get all records
   */
  toArray(): T[] {
    return [...this._records];
  }

  // Getters
  get records(): readonly T[] {
    return [...this._records];
  }

  get summary(): Readonly<QuerySummary> {
    return Object.freeze({ ...this._summary });
  }

  get executionTime(): number {
    return this._executionTime;
  }

  get count(): number {
    return this._records.length;
  }
}

/**
 * Summary statistics for query execution
 */
export interface QuerySummary {
  counters: QueryCounters;
  executionTime: number;
  recordCount: number;
  hasMore: boolean;
}

/**
 * Counters for database modifications
 */
export interface QueryCounters {
  nodesCreated: number;
  nodesDeleted: number;
  relationshipsCreated: number;
  relationshipsDeleted: number;
  propertiesSet: number;
}
