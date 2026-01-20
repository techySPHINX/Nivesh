import { GraphNode, NodeType } from './graph-node.entity';
import { GraphRelationship, RelationshipType } from './graph-relationship.entity';

/**
 * Represents a detected spending pattern in the knowledge graph
 * Aggregates multiple transactions and relationships to identify behavior patterns
 * 
 * Business Rules:
 * - Pattern must have at least 3 occurrences to be considered valid
 * - Confidence score indicates pattern strength (0-1)
 * - Patterns can be temporal, categorical, or merchant-based
 */
export class SpendingPattern {
  private readonly _id: string;
  private readonly _userId: string;
  private readonly _patternType: PatternType;
  private readonly _nodes: GraphNode[];
  private readonly _relationships: GraphRelationship[];
  private readonly _confidence: number;
  private readonly _frequency: number;
  private readonly _totalAmount: number;
  private readonly _timeframe: PatternTimeframe;
  private readonly _metadata: PatternMetadata;
  private readonly _detectedAt: Date;

  private constructor(
    id: string,
    userId: string,
    patternType: PatternType,
    nodes: GraphNode[],
    relationships: GraphRelationship[],
    confidence: number,
    frequency: number,
    totalAmount: number,
    timeframe: PatternTimeframe,
    metadata: PatternMetadata,
    detectedAt: Date,
  ) {
    this._id = id;
    this._userId = userId;
    this._patternType = patternType;
    this._nodes = nodes;
    this._relationships = relationships;
    this._confidence = confidence;
    this._frequency = frequency;
    this._totalAmount = totalAmount;
    this._timeframe = timeframe;
    this._metadata = metadata;
    this._detectedAt = detectedAt;
  }

  /**
   * Factory method to create a detected pattern
   * Validates minimum requirements for pattern recognition
   */
  static create(params: {
    userId: string;
    patternType: PatternType;
    nodes: GraphNode[];
    relationships: GraphRelationship[];
    confidence: number;
    frequency: number;
    totalAmount: number;
    timeframe: PatternTimeframe;
    metadata?: Partial<PatternMetadata>;
  }): SpendingPattern {
    // Validate minimum requirements
    if (params.frequency < 3) {
      throw new Error('Pattern must occur at least 3 times');
    }

    if (params.confidence < 0 || params.confidence > 1) {
      throw new Error('Confidence must be between 0 and 1');
    }

    if (params.nodes.length === 0) {
      throw new Error('Pattern must involve at least one node');
    }

    const id = `pattern_${params.userId}_${Date.now()}`;
    const metadata: PatternMetadata = {
      categories: params.metadata?.categories ?? [],
      merchants: params.metadata?.merchants ?? [],
      locations: params.metadata?.locations ?? [],
      tags: params.metadata?.tags ?? [],
      averageAmount: params.totalAmount / params.frequency,
      lastOccurrence: params.metadata?.lastOccurrence ?? new Date(),
    };

    return new SpendingPattern(
      id,
      params.userId,
      params.patternType,
      params.nodes,
      params.relationships,
      params.confidence,
      params.frequency,
      params.totalAmount,
      params.timeframe,
      metadata,
      new Date(),
    );
  }

  /**
   * Check if pattern is actionable (strong enough for recommendations)
   */
  isActionable(): boolean {
    return this._confidence >= 0.7 && this._frequency >= 5;
  }

  /**
   * Check if pattern is recurring (happens regularly)
   */
  isRecurring(): boolean {
    return (
      this._patternType === PatternType.RECURRING_PAYMENT ||
      this._patternType === PatternType.PERIODIC_SPENDING
    );
  }

  /**
   * Check if pattern indicates potential issue
   */
  isAnomalous(): boolean {
    return (
      this._patternType === PatternType.UNUSUAL_SPENDING ||
      this._patternType === PatternType.BUDGET_OVERRUN
    );
  }

  /**
   * Get pattern description for UI
   */
  getDescription(): string {
    const typeDescriptions: Record<PatternType, string> = {
      [PatternType.RECURRING_PAYMENT]: 'Recurring payment pattern',
      [PatternType.PERIODIC_SPENDING]: 'Periodic spending pattern',
      [PatternType.CATEGORY_CONCENTRATION]: 'High spending in specific category',
      [PatternType.MERCHANT_LOYALTY]: 'Frequent purchases at merchant',
      [PatternType.TIME_OF_DAY]: 'Time-based spending pattern',
      [PatternType.LOCATION_BASED]: 'Location-based spending pattern',
      [PatternType.SEASONAL]: 'Seasonal spending pattern',
      [PatternType.UNUSUAL_SPENDING]: 'Unusual spending detected',
      [PatternType.BUDGET_OVERRUN]: 'Budget limit exceeded',
      [PatternType.GOAL_PROGRESS]: 'Goal progress pattern',
    };

    return typeDescriptions[this._patternType];
  }

  /**
   * Get recommendations based on pattern
   */
  generateRecommendations(): PatternRecommendation[] {
    const recommendations: PatternRecommendation[] = [];

    if (this.isRecurring() && !this.hasAutomation()) {
      recommendations.push({
        type: 'AUTOMATION',
        title: 'Set up automatic payment',
        description: 'Automate this recurring expense to never miss a payment',
        priority: 'medium',
      });
    }

    if (this.isAnomalous()) {
      recommendations.push({
        type: 'ALERT',
        title: 'Review unusual activity',
        description: 'This spending pattern deviates from your normal behavior',
        priority: 'high',
      });
    }

    if (this._patternType === PatternType.CATEGORY_CONCENTRATION) {
      recommendations.push({
        type: 'BUDGET',
        title: 'Consider budget adjustment',
        description: `High spending in ${this._metadata.categories[0]}`,
        priority: 'medium',
      });
    }

    return recommendations;
  }

  private hasAutomation(): boolean {
    return this._metadata.tags?.includes('automated') ?? false;
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get userId(): string {
    return this._userId;
  }

  get patternType(): PatternType {
    return this._patternType;
  }

  get nodes(): readonly GraphNode[] {
    return [...this._nodes];
  }

  get relationships(): readonly GraphRelationship[] {
    return [...this._relationships];
  }

  get confidence(): number {
    return this._confidence;
  }

  get frequency(): number {
    return this._frequency;
  }

  get totalAmount(): number {
    return this._totalAmount;
  }

  get timeframe(): PatternTimeframe {
    return this._timeframe;
  }

  get metadata(): Readonly<PatternMetadata> {
    return Object.freeze({ ...this._metadata });
  }

  get detectedAt(): Date {
    return this._detectedAt;
  }

  /**
   * Convert to plain object for persistence
   */
  toPersistence(): Record<string, any> {
    return {
      id: this._id,
      userId: this._userId,
      patternType: this._patternType,
      nodeIds: this._nodes.map((n) => n.id),
      relationshipIds: this._relationships.map((r) => r.id),
      confidence: this._confidence,
      frequency: this._frequency,
      totalAmount: this._totalAmount,
      timeframe: this._timeframe,
      metadata: this._metadata,
      detectedAt: this._detectedAt,
    };
  }
}

/**
 * Enum for different types of spending patterns
 */
export enum PatternType {
  RECURRING_PAYMENT = 'RECURRING_PAYMENT',
  PERIODIC_SPENDING = 'PERIODIC_SPENDING',
  CATEGORY_CONCENTRATION = 'CATEGORY_CONCENTRATION',
  MERCHANT_LOYALTY = 'MERCHANT_LOYALTY',
  TIME_OF_DAY = 'TIME_OF_DAY',
  LOCATION_BASED = 'LOCATION_BASED',
  SEASONAL = 'SEASONAL',
  UNUSUAL_SPENDING = 'UNUSUAL_SPENDING',
  BUDGET_OVERRUN = 'BUDGET_OVERRUN',
  GOAL_PROGRESS = 'GOAL_PROGRESS',
}

/**
 * Timeframe for pattern detection
 */
export interface PatternTimeframe {
  startDate: Date;
  endDate: Date;
  periodicity?: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

/**
 * Metadata attached to patterns
 */
export interface PatternMetadata {
  categories: string[];
  merchants: string[];
  locations: string[];
  tags: string[];
  averageAmount: number;
  lastOccurrence: Date;
}

/**
 * Recommendation generated from pattern
 */
export interface PatternRecommendation {
  type: 'AUTOMATION' | 'ALERT' | 'BUDGET' | 'GOAL' | 'OPTIMIZATION';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}
