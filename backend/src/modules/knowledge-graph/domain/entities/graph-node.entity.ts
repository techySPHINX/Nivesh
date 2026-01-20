import { v4 as uuidv4 } from 'uuid';

/**
 * Enum for different types of nodes in the knowledge graph
 * Represents the core entities that form the financial knowledge network
 */
export enum NodeType {
  USER = 'USER',
  ACCOUNT = 'ACCOUNT',
  TRANSACTION = 'TRANSACTION',
  CATEGORY = 'CATEGORY',
  BUDGET = 'BUDGET',
  GOAL = 'GOAL',
  MERCHANT = 'MERCHANT',
  LOCATION = 'LOCATION',
  TAG = 'TAG',
}

/**
 * Properties that all nodes in the graph must have
 */
export interface NodeProperties {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: any; // Additional properties specific to node type
}

/**
 * Domain entity representing a node in the knowledge graph
 * Each node represents a core financial entity with its properties and metadata
 * 
 * Business Rules:
 * - Every node must have a unique identifier
 * - Node type determines validation rules and allowed relationships
 * - Properties are immutable after creation (use update method)
 * - Timestamps are automatically managed
 */
export class GraphNode {
  private readonly _id: string;
  private readonly _type: NodeType;
  private _properties: NodeProperties;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(
    id: string,
    type: NodeType,
    properties: NodeProperties,
    createdAt: Date,
    updatedAt: Date,
  ) {
    this._id = id;
    this._type = type;
    this._properties = properties;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  /**
   * Factory method to create a new graph node
   * Generates UUID and timestamps automatically
   */
  static create(
    type: NodeType,
    properties: Omit<NodeProperties, 'id' | 'createdAt' | 'updatedAt'>,
  ): GraphNode {
    const id = uuidv4();
    const now = new Date();

    const fullProperties: NodeProperties = {
      ...properties,
      id,
      createdAt: now,
      updatedAt: now,
    };

    return new GraphNode(id, type, fullProperties, now, now);
  }

  /**
   * Reconstruct a node from persisted data
   */
  static fromPersistence(
    id: string,
    type: NodeType,
    properties: NodeProperties,
  ): GraphNode {
    return new GraphNode(
      id,
      type,
      properties,
      properties.createdAt,
      properties.updatedAt,
    );
  }

  /**
   * Update node properties
   * Maintains immutability by creating new properties object
   */
  updateProperties(updates: Partial<NodeProperties>): void {
    this._properties = {
      ...this._properties,
      ...updates,
      id: this._id, // Ensure ID cannot be changed
      createdAt: this._createdAt, // Ensure creation time cannot be changed
      updatedAt: new Date(),
    };
    this._updatedAt = new Date();
  }

  /**
   * Get a specific property value
   */
  getProperty<T = any>(key: string): T | undefined {
    return this._properties[key];
  }

  /**
   * Check if node has a specific property
   */
  hasProperty(key: string): boolean {
    return key in this._properties && this._properties[key] !== undefined;
  }

  /**
   * Validate if this node can connect to another node type
   * Based on business rules for valid relationships
   */
  canConnectTo(targetType: NodeType): boolean {
    const validConnections: Record<NodeType, NodeType[]> = {
      [NodeType.USER]: [
        NodeType.ACCOUNT,
        NodeType.BUDGET,
        NodeType.GOAL,
        NodeType.USER, // For similar users
      ],
      [NodeType.ACCOUNT]: [
        NodeType.USER,
        NodeType.TRANSACTION,
      ],
      [NodeType.TRANSACTION]: [
        NodeType.ACCOUNT,
        NodeType.CATEGORY,
        NodeType.MERCHANT,
        NodeType.LOCATION,
        NodeType.TAG,
        NodeType.BUDGET,
      ],
      [NodeType.CATEGORY]: [
        NodeType.TRANSACTION,
        NodeType.BUDGET,
        NodeType.CATEGORY, // For sub-categories
      ],
      [NodeType.BUDGET]: [
        NodeType.USER,
        NodeType.CATEGORY,
        NodeType.TRANSACTION,
      ],
      [NodeType.GOAL]: [
        NodeType.USER,
        NodeType.ACCOUNT,
      ],
      [NodeType.MERCHANT]: [
        NodeType.TRANSACTION,
        NodeType.LOCATION,
        NodeType.MERCHANT, // For merchant networks
      ],
      [NodeType.LOCATION]: [
        NodeType.TRANSACTION,
        NodeType.MERCHANT,
      ],
      [NodeType.TAG]: [
        NodeType.TRANSACTION,
        NodeType.TAG, // For tag hierarchies
      ],
    };

    return validConnections[this._type]?.includes(targetType) ?? false;
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get type(): NodeType {
    return this._type;
  }

  get properties(): Readonly<NodeProperties> {
    return Object.freeze({ ...this._properties });
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * Convert to plain object for persistence
   */
  toPersistence(): {
    id: string;
    type: NodeType;
    properties: NodeProperties;
  } {
    return {
      id: this._id,
      type: this._type,
      properties: { ...this._properties },
    };
  }

  /**
   * Domain equality based on ID
   */
  equals(other: GraphNode): boolean {
    return this._id === other._id && this._type === other._type;
  }
}
