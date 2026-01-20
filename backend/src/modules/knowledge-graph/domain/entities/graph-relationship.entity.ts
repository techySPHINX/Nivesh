import { v4 as uuidv4 } from 'uuid';
import { GraphNode, NodeType } from './graph-node.entity';

/**
 * Enum for relationship types in the knowledge graph
 * Defines how entities are connected and their semantic meaning
 */
export enum RelationshipType {
  // Account ownership
  OWNS = 'OWNS',

  // Transaction relationships
  MADE_TRANSACTION = 'MADE_TRANSACTION',
  BELONGS_TO_CATEGORY = 'BELONGS_TO_CATEGORY',
  AT_MERCHANT = 'AT_MERCHANT',
  AT_LOCATION = 'AT_LOCATION',
  HAS_TAG = 'HAS_TAG',
  AFFECTS_BUDGET = 'AFFECTS_BUDGET',

  // Budget & Goal relationships
  HAS_BUDGET = 'HAS_BUDGET',
  HAS_GOAL = 'HAS_GOAL',
  CONTRIBUTES_TO_GOAL = 'CONTRIBUTES_TO_GOAL',

  // Category hierarchies
  SUBCATEGORY_OF = 'SUBCATEGORY_OF',

  // Merchant networks
  SIMILAR_MERCHANT = 'SIMILAR_MERCHANT',
  MERCHANT_CHAIN = 'MERCHANT_CHAIN',

  // User behavior patterns
  SIMILAR_SPENDING = 'SIMILAR_SPENDING',
  SIMILAR_GOALS = 'SIMILAR_GOALS',

  // Recommendations
  RECOMMENDS = 'RECOMMENDS',
}

/**
 * Properties attached to relationships
 * Captures context and metadata about the connection
 */
export interface RelationshipProperties {
  weight?: number; // Strength of relationship (0-1)
  frequency?: number; // How often this relationship occurs
  amount?: number; // Monetary value associated
  confidence?: number; // ML confidence score (0-1)
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Domain entity representing a relationship between two nodes
 * Relationships are directed (from -> to) and can have properties
 * 
 * Business Rules:
 * - Relationships must connect valid node types
 * - Relationship type determines allowed node type combinations
 * - Properties capture relationship strength and context
 * - Self-relationships allowed for specific types (e.g., similar users)
 */
export class GraphRelationship {
  private readonly _id: string;
  private readonly _type: RelationshipType;
  private readonly _fromNode: GraphNode;
  private readonly _toNode: GraphNode;
  private _properties: RelationshipProperties;

  private constructor(
    id: string,
    type: RelationshipType,
    fromNode: GraphNode,
    toNode: GraphNode,
    properties: RelationshipProperties,
  ) {
    this._id = id;
    this._type = type;
    this._fromNode = fromNode;
    this._toNode = toNode;
    this._properties = properties;
  }

  /**
   * Factory method to create a new relationship
   * Validates that the relationship is allowed between the node types
   */
  static create(
    type: RelationshipType,
    fromNode: GraphNode,
    toNode: GraphNode,
    properties?: Partial<Omit<RelationshipProperties, 'createdAt' | 'updatedAt'>>,
  ): GraphRelationship {
    // Validate relationship is allowed
    if (!this.isValidRelationship(type, fromNode.type, toNode.type)) {
      throw new Error(
        `Invalid relationship: ${type} between ${fromNode.type} and ${toNode.type}`,
      );
    }

    const id = uuidv4();
    const now = new Date();

    const fullProperties: RelationshipProperties = {
      weight: properties?.weight ?? 1.0,
      frequency: properties?.frequency ?? 1,
      amount: properties?.amount,
      confidence: properties?.confidence ?? 1.0,
      metadata: properties?.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };

    return new GraphRelationship(id, type, fromNode, toNode, fullProperties);
  }

  /**
   * Reconstruct a relationship from persisted data
   */
  static fromPersistence(
    id: string,
    type: RelationshipType,
    fromNode: GraphNode,
    toNode: GraphNode,
    properties: RelationshipProperties,
  ): GraphRelationship {
    return new GraphRelationship(id, type, fromNode, toNode, properties);
  }

  /**
   * Validate if a relationship type is allowed between two node types
   */
  private static isValidRelationship(
    relType: RelationshipType,
    fromType: NodeType,
    toType: NodeType,
  ): boolean {
    const validRelationships: Record<
      RelationshipType,
      Array<[NodeType, NodeType]>
    > = {
      [RelationshipType.OWNS]: [[NodeType.USER, NodeType.ACCOUNT]],
      [RelationshipType.MADE_TRANSACTION]: [
        [NodeType.ACCOUNT, NodeType.TRANSACTION],
      ],
      [RelationshipType.BELONGS_TO_CATEGORY]: [
        [NodeType.TRANSACTION, NodeType.CATEGORY],
      ],
      [RelationshipType.AT_MERCHANT]: [
        [NodeType.TRANSACTION, NodeType.MERCHANT],
      ],
      [RelationshipType.AT_LOCATION]: [
        [NodeType.TRANSACTION, NodeType.LOCATION],
      ],
      [RelationshipType.HAS_TAG]: [[NodeType.TRANSACTION, NodeType.TAG]],
      [RelationshipType.AFFECTS_BUDGET]: [
        [NodeType.TRANSACTION, NodeType.BUDGET],
      ],
      [RelationshipType.HAS_BUDGET]: [[NodeType.USER, NodeType.BUDGET]],
      [RelationshipType.HAS_GOAL]: [[NodeType.USER, NodeType.GOAL]],
      [RelationshipType.CONTRIBUTES_TO_GOAL]: [
        [NodeType.ACCOUNT, NodeType.GOAL],
      ],
      [RelationshipType.SUBCATEGORY_OF]: [
        [NodeType.CATEGORY, NodeType.CATEGORY],
      ],
      [RelationshipType.SIMILAR_MERCHANT]: [
        [NodeType.MERCHANT, NodeType.MERCHANT],
      ],
      [RelationshipType.MERCHANT_CHAIN]: [
        [NodeType.MERCHANT, NodeType.MERCHANT],
      ],
      [RelationshipType.SIMILAR_SPENDING]: [[NodeType.USER, NodeType.USER]],
      [RelationshipType.SIMILAR_GOALS]: [[NodeType.USER, NodeType.USER]],
      [RelationshipType.RECOMMENDS]: [
        [NodeType.USER, NodeType.BUDGET],
        [NodeType.USER, NodeType.GOAL],
        [NodeType.USER, NodeType.CATEGORY],
      ],
    };

    const allowedPairs = validRelationships[relType] ?? [];
    return allowedPairs.some(
      ([from, to]) => from === fromType && to === toType,
    );
  }

  /**
   * Update relationship properties
   * Common for updating weights, frequencies, or confidence scores
   */
  updateProperties(
    updates: Partial<Omit<RelationshipProperties, 'createdAt' | 'updatedAt'>>,
  ): void {
    this._properties = {
      ...this._properties,
      ...updates,
      updatedAt: new Date(),
    };
  }

  /**
   * Increment relationship frequency
   * Used when the same relationship is reinforced
   */
  incrementFrequency(amount = 1): void {
    this._properties.frequency = (this._properties.frequency ?? 0) + amount;
    this._properties.updatedAt = new Date();
  }

  /**
   * Update relationship weight
   * Weight represents strength/importance (0-1 scale)
   */
  updateWeight(weight: number): void {
    if (weight < 0 || weight > 1) {
      throw new Error('Weight must be between 0 and 1');
    }
    this._properties.weight = weight;
    this._properties.updatedAt = new Date();
  }

  /**
   * Check if relationship is bidirectional
   * Some relationships like SIMILAR_SPENDING are symmetric
   */
  isBidirectional(): boolean {
    const bidirectionalTypes = [
      RelationshipType.SIMILAR_MERCHANT,
      RelationshipType.MERCHANT_CHAIN,
      RelationshipType.SIMILAR_SPENDING,
      RelationshipType.SIMILAR_GOALS,
    ];
    return bidirectionalTypes.includes(this._type);
  }

  /**
   * Check if relationship is strong enough to be actionable
   * Based on weight and confidence thresholds
   */
  isSignificant(minWeight = 0.5, minConfidence = 0.7): boolean {
    const weight = this._properties.weight ?? 1;
    const confidence = this._properties.confidence ?? 1;
    return weight >= minWeight && confidence >= minConfidence;
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get type(): RelationshipType {
    return this._type;
  }

  get fromNode(): GraphNode {
    return this._fromNode;
  }

  get toNode(): GraphNode {
    return this._toNode;
  }

  get properties(): Readonly<RelationshipProperties> {
    return Object.freeze({ ...this._properties });
  }

  /**
   * Convert to plain object for persistence
   */
  toPersistence(): {
    id: string;
    type: RelationshipType;
    fromNodeId: string;
    toNodeId: string;
    properties: RelationshipProperties;
  } {
    return {
      id: this._id,
      type: this._type,
      fromNodeId: this._fromNode.id,
      toNodeId: this._toNode.id,
      properties: { ...this._properties },
    };
  }

  /**
   * Domain equality based on ID
   */
  equals(other: GraphRelationship): boolean {
    return (
      this._id === other._id &&
      this._fromNode.equals(other._fromNode) &&
      this._toNode.equals(other._toNode)
    );
  }
}
