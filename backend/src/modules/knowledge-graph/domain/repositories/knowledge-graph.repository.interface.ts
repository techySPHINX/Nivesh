import { GraphNode, NodeType } from '../entities/graph-node.entity';
import {
  GraphRelationship,
  RelationshipType,
} from '../entities/graph-relationship.entity';
import { SpendingPattern } from '../entities/spending-pattern.entity';
import { CypherQuery } from '../value-objects/cypher-query.vo';
import { GraphQueryResult } from '../value-objects/graph-query-result.vo';

/**
 * Repository interface for graph database operations
 * Provides domain-focused methods for interacting with Neo4j
 */
export interface IKnowledgeGraphRepository {
  /**
   * Node Operations
   */
  createNode(node: GraphNode): Promise<GraphNode>;
  updateNode(node: GraphNode): Promise<GraphNode>;
  deleteNode(nodeId: string): Promise<void>;
  findNodeById(nodeId: string): Promise<GraphNode | null>;
  findNodesByType(type: NodeType): Promise<GraphNode[]>;
  findNodesByProperties(
    type: NodeType,
    properties: Record<string, any>,
  ): Promise<GraphNode[]>;

  /**
   * Relationship Operations
   */
  createRelationship(relationship: GraphRelationship): Promise<GraphRelationship>;
  updateRelationship(relationship: GraphRelationship): Promise<GraphRelationship>;
  deleteRelationship(relationshipId: string): Promise<void>;
  findRelationshipById(relationshipId: string): Promise<GraphRelationship | null>;
  findRelationshipsByType(type: RelationshipType): Promise<GraphRelationship[]>;
  findRelationshipsForNode(
    nodeId: string,
    direction?: 'incoming' | 'outgoing' | 'both',
  ): Promise<GraphRelationship[]>;

  /**
   * Pattern Operations
   */
  savePattern(pattern: SpendingPattern): Promise<SpendingPattern>;
  findPatternsByUserId(userId: string): Promise<SpendingPattern[]>;
  findPatternsByType(
    userId: string,
    patternType: string,
  ): Promise<SpendingPattern[]>;

  /**
   * Graph Traversal
   */
  findPath(
    fromNodeId: string,
    toNodeId: string,
    maxDepth?: number,
  ): Promise<GraphPath[]>;
  findShortestPath(fromNodeId: string, toNodeId: string): Promise<GraphPath | null>;
  findNeighbors(
    nodeId: string,
    depth: number,
    relationshipTypes?: RelationshipType[],
  ): Promise<GraphNeighborhood>;

  /**
   * Query Execution
   */
  executeQuery<T>(query: CypherQuery): Promise<GraphQueryResult<T>>;
  executeReadQuery<T>(query: CypherQuery): Promise<GraphQueryResult<T>>;
  executeWriteQuery<T>(query: CypherQuery): Promise<GraphQueryResult<T>>;

  /**
   * Batch Operations
   */
  batchCreateNodes(nodes: GraphNode[]): Promise<GraphNode[]>;
  batchCreateRelationships(
    relationships: GraphRelationship[],
  ): Promise<GraphRelationship[]>;

  /**
   * Analytics Support
   */
  countNodesByType(): Promise<Record<NodeType, number>>;
  countRelationshipsByType(): Promise<Record<RelationshipType, number>>;
  getGraphStatistics(): Promise<GraphStatistics>;
}

/**
 * Represents a path between two nodes
 */
export interface GraphPath {
  nodes: GraphNode[];
  relationships: GraphRelationship[];
  length: number;
  weight: number;
}

/**
 * Represents a node's neighborhood
 */
export interface GraphNeighborhood {
  centerNode: GraphNode;
  neighbors: Array<{
    node: GraphNode;
    relationship: GraphRelationship;
    distance: number;
  }>;
  depth: number;
}

/**
 * Graph database statistics
 */
export interface GraphStatistics {
  totalNodes: number;
  totalRelationships: number;
  nodesByType: Record<string, number>;
  relationshipsByType: Record<string, number>;
  averageDegree: number;
  density: number;
}
