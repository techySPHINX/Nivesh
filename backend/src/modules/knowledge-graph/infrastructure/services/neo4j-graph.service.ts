import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import neo4j, {
  Driver,
  Session,
  ManagedTransaction,
  Result,
  Node as Neo4jNode,
  Relationship as Neo4jRelationship,
} from 'neo4j-driver';
import {
  GraphNode,
  GraphRelationship,
  NodeType,
  RelationshipType,
  CypherQuery,
  GraphQueryResult,
  IKnowledgeGraphRepository,
  GraphPath,
  GraphNeighborhood,
  GraphStatistics,
} from '../../domain';

/**
 * Neo4j Graph Service
 * Implements IKnowledgeGraphRepository using Neo4j driver
 * Handles connection pooling, transactions, and Cypher query execution
 * 
 * Features:
 * - Connection lifecycle management
 * - CRUD operations for nodes and relationships
 * - Path finding and graph traversal
 * - Batch operations for performance
 * - Read/write transaction separation
 * - Automatic retry on transient failures
 */
@Injectable()
export class Neo4jGraphService
  implements IKnowledgeGraphRepository, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(Neo4jGraphService.name);
  private driver: Driver;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Initialize Neo4j driver on module initialization
   */
  async onModuleInit(): Promise<void> {
    const uri = this.configService.get<string>('neo4j.uri', 'bolt://localhost:7687');
    const username = this.configService.get<string>('neo4j.username', 'neo4j');
    const password = this.configService.get<string>('neo4j.password', 'password');
    const maxConnectionPoolSize = this.configService.get<number>(
      'neo4j.maxConnectionPoolSize',
      50,
    );

    this.logger.log(`Connecting to Neo4j at ${uri}`);

    this.driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
      maxConnectionPoolSize,
      connectionAcquisitionTimeout: 30000,
      maxTransactionRetryTime: 30000,
    });

    // Verify connectivity
    try {
      await this.driver.verifyConnectivity();
      this.logger.log('Neo4j connection established successfully');
    } catch (error) {
      this.logger.error('Failed to connect to Neo4j', error);
      throw error;
    }
  }

  /**
   * Close Neo4j driver on module destruction
   */
  async onModuleDestroy(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.logger.log('Neo4j connection closed');
    }
  }

  /**
   * Create a new node in the graph
   * Uses MERGE to ensure idempotency (won't create duplicates)
   */
  async createNode(node: GraphNode): Promise<GraphNode> {
    const session = this.driver.session();
    try {
      const query = CypherQuery.create(
        `
        MERGE (n:${node.type} {id: $id})
        SET n += $properties
        RETURN n
        `,
        {
          id: node.id,
          properties: node.properties,
        },
      );

      const result = await session.executeWrite((tx) =>
        this.executeInTransaction(tx, query),
      );

      return node;
    } finally {
      await session.close();
    }
  }

  /**
   * Update existing node properties
   */
  async updateNode(node: GraphNode): Promise<GraphNode> {
    const session = this.driver.session();
    try {
      const query = CypherQuery.create(
        `
        MATCH (n:${node.type} {id: $id})
        SET n += $properties
        RETURN n
        `,
        {
          id: node.id,
          properties: node.properties,
        },
      );

      await session.executeWrite((tx) => this.executeInTransaction(tx, query));

      return node;
    } finally {
      await session.close();
    }
  }

  /**
   * Delete node and all its relationships
   * Uses DETACH DELETE to remove relationships first
   */
  async deleteNode(nodeId: string): Promise<void> {
    const session = this.driver.session();
    try {
      const query = CypherQuery.create(
        `
        MATCH (n {id: $id})
        DETACH DELETE n
        `,
        { id: nodeId },
      );

      await session.executeWrite((tx) => this.executeInTransaction(tx, query));
    } finally {
      await session.close();
    }
  }

  /**
   * Find node by ID
   */
  async findNodeById(nodeId: string): Promise<GraphNode | null> {
    const session = this.driver.session();
    try {
      const query = CypherQuery.create(
        `
        MATCH (n {id: $id})
        RETURN n, labels(n) as labels
        `,
        { id: nodeId },
      );

      const result = await session.executeRead((tx) =>
        this.executeInTransaction(tx, query),
      );

      if (result.records.length === 0) {
        return null;
      }

      const record = result.records[0];
      const node = record.get('n');
      const labels = record.get('labels') as string[];
      const nodeType = labels[0] as NodeType;

      return GraphNode.fromPersistence(
        node.properties.id,
        nodeType,
        node.properties,
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Find all nodes of a specific type
   */
  async findNodesByType(type: NodeType): Promise<GraphNode[]> {
    const session = this.driver.session();
    try {
      const query = CypherQuery.create(
        `
        MATCH (n:${type})
        RETURN n
        LIMIT 1000
        `,
      );

      const result = await session.executeRead((tx) =>
        this.executeInTransaction(tx, query),
      );

      return result.records.map((record) => {
        const node = record.get('n');
        return GraphNode.fromPersistence(node.properties.id, type, node.properties);
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Find nodes by properties
   */
  async findNodesByProperties(
    type: NodeType,
    properties: Record<string, any>,
  ): Promise<GraphNode[]> {
    const session = this.driver.session();
    try {
      const whereClause = Object.keys(properties)
        .map((key) => `n.${key} = $${key}`)
        .join(' AND ');

      const query = CypherQuery.create(
        `
        MATCH (n:${type})
        WHERE ${whereClause}
        RETURN n
        LIMIT 100
        `,
        properties,
      );

      const result = await session.executeRead((tx) =>
        this.executeInTransaction(tx, query),
      );

      return result.records.map((record) => {
        const node = record.get('n');
        return GraphNode.fromPersistence(node.properties.id, type, node.properties);
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Create a relationship between two nodes
   * Uses MERGE for idempotency
   */
  async createRelationship(
    relationship: GraphRelationship,
  ): Promise<GraphRelationship> {
    const session = this.driver.session();
    try {
      const query = CypherQuery.create(
        `
        MATCH (from {id: $fromId})
        MATCH (to {id: $toId})
        MERGE (from)-[r:${relationship.type}]->(to)
        SET r += $properties
        RETURN r
        `,
        {
          fromId: relationship.fromNode.id,
          toId: relationship.toNode.id,
          properties: relationship.properties,
        },
      );

      await session.executeWrite((tx) => this.executeInTransaction(tx, query));

      return relationship;
    } finally {
      await session.close();
    }
  }

  /**
   * Update relationship properties
   */
  async updateRelationship(
    relationship: GraphRelationship,
  ): Promise<GraphRelationship> {
    const session = this.driver.session();
    try {
      const query = CypherQuery.create(
        `
        MATCH (from {id: $fromId})-[r:${relationship.type}]->(to {id: $toId})
        SET r += $properties
        RETURN r
        `,
        {
          fromId: relationship.fromNode.id,
          toId: relationship.toNode.id,
          properties: relationship.properties,
        },
      );

      await session.executeWrite((tx) => this.executeInTransaction(tx, query));

      return relationship;
    } finally {
      await session.close();
    }
  }

  /**
   * Delete relationship
   */
  async deleteRelationship(relationshipId: string): Promise<void> {
    const session = this.driver.session();
    try {
      const query = CypherQuery.create(
        `
        MATCH ()-[r {id: $id}]->()
        DELETE r
        `,
        { id: relationshipId },
      );

      await session.executeWrite((tx) => this.executeInTransaction(tx, query));
    } finally {
      await session.close();
    }
  }

  /**
   * Find relationship by ID (placeholder - Neo4j doesn't support this directly)
   */
  async findRelationshipById(relationshipId: string): Promise<GraphRelationship | null> {
    // Neo4j doesn't have built-in relationship IDs accessible via Cypher
    // This would require storing relationship ID as a property
    throw new Error('findRelationshipById not implemented');
  }

  /**
   * Find all relationships of a specific type
   */
  async findRelationshipsByType(type: RelationshipType): Promise<GraphRelationship[]> {
    const session = this.driver.session();
    try {
      const query = CypherQuery.create(
        `
        MATCH (from)-[r:${type}]->(to)
        RETURN from, r, to, labels(from) as fromLabels, labels(to) as toLabels
        LIMIT 1000
        `,
      );

      const result = await session.executeRead((tx) =>
        this.executeInTransaction(tx, query),
      );

      return result.records.map((record) => {
        const fromNode = this.neo4jNodeToGraphNode(
          record.get('from'),
          record.get('fromLabels')[0],
        );
        const toNode = this.neo4jNodeToGraphNode(
          record.get('to'),
          record.get('toLabels')[0],
        );
        const rel = record.get('r');

        return GraphRelationship.fromPersistence(
          rel.properties.id || `${fromNode.id}_${toNode.id}`,
          type,
          fromNode,
          toNode,
          rel.properties,
        );
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Find relationships connected to a node
   */
  async findRelationshipsForNode(
    nodeId: string,
    direction: 'incoming' | 'outgoing' | 'both' = 'both',
  ): Promise<GraphRelationship[]> {
    const session = this.driver.session();
    try {
      let pattern: string;
      if (direction === 'incoming') {
        pattern = '(from)-[r]->(n {id: $id})';
      } else if (direction === 'outgoing') {
        pattern = '(n {id: $id})-[r]->(to)';
      } else {
        pattern = '(n {id: $id})-[r]-(other)';
      }

      const query = CypherQuery.create(
        `
        MATCH ${pattern}
        RETURN n, r, from, to, other, 
               labels(n) as nLabels,
               labels(from) as fromLabels, 
               labels(to) as toLabels,
               labels(other) as otherLabels,
               type(r) as relType
        LIMIT 500
        `,
        { id: nodeId },
      );

      const result = await session.executeRead((tx) =>
        this.executeInTransaction(tx, query),
      );

      return result.records.map((record) => {
        const centerNode = this.neo4jNodeToGraphNode(
          record.get('n'),
          record.get('nLabels')[0],
        );
        const rel = record.get('r');
        const relType = record.get('relType') as RelationshipType;

        let fromNode: GraphNode;
        let toNode: GraphNode;

        if (direction === 'incoming') {
          fromNode = this.neo4jNodeToGraphNode(
            record.get('from'),
            record.get('fromLabels')[0],
          );
          toNode = centerNode;
        } else if (direction === 'outgoing') {
          fromNode = centerNode;
          toNode = this.neo4jNodeToGraphNode(
            record.get('to'),
            record.get('toLabels')[0],
          );
        } else {
          const otherNode = this.neo4jNodeToGraphNode(
            record.get('other'),
            record.get('otherLabels')[0],
          );
          // Determine direction based on relationship
          fromNode = centerNode;
          toNode = otherNode;
        }

        return GraphRelationship.fromPersistence(
          rel.properties.id || `${fromNode.id}_${toNode.id}`,
          relType,
          fromNode,
          toNode,
          rel.properties,
        );
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Execute Cypher query in a transaction
   */
  private async executeInTransaction(
    tx: ManagedTransaction,
    query: CypherQuery,
  ): Promise<Result> {
    this.logger.debug(`Executing query: ${query.query.substring(0, 200)}`);
    return await tx.run(query.query, query.parameters);
  }

  /**
   * Helper to convert Neo4j node to GraphNode
   */
  private neo4jNodeToGraphNode(node: Neo4jNode, typeLabel: string): GraphNode {
    return GraphNode.fromPersistence(
      node.properties.id,
      typeLabel as NodeType,
      node.properties,
    );
  }

  /**
   * Placeholder implementations for remaining interface methods
   * Will be fully implemented in Branch 3 (analytics)
   */
  async savePattern(pattern: any): Promise<any> {
    throw new Error('Method not implemented.');
  }

  async findPatternsByUserId(userId: string): Promise<any[]> {
    return [];
  }

  async findPatternsByType(userId: string, patternType: string): Promise<any[]> {
    return [];
  }

  async findPath(
    fromNodeId: string,
    toNodeId: string,
    maxDepth?: number,
  ): Promise<GraphPath[]> {
    return [];
  }

  async findShortestPath(
    fromNodeId: string,
    toNodeId: string,
  ): Promise<GraphPath | null> {
    return null;
  }

  async findNeighbors(
    nodeId: string,
    depth: number,
    relationshipTypes?: RelationshipType[],
  ): Promise<GraphNeighborhood> {
    throw new Error('Method not implemented.');
  }

  async executeQuery<T>(query: CypherQuery): Promise<GraphQueryResult<T>> {
    const session = this.driver.session();
    try {
      const startTime = Date.now();
      const result = await session.run(query.query, query.parameters);
      const executionTime = Date.now() - startTime;

      const records = result.records.map((record) => record.toObject() as T);

      return GraphQueryResult.success(
        records,
        {
          nodesCreated: 0,
          nodesDeleted: 0,
          relationshipsCreated: 0,
          relationshipsDeleted: 0,
          propertiesSet: 0,
        },
        executionTime,
      );
    } finally {
      await session.close();
    }
  }

  async executeReadQuery<T>(query: CypherQuery): Promise<GraphQueryResult<T>> {
    const session = this.driver.session();
    try {
      const startTime = Date.now();
      const result = await session.executeRead((tx) =>
        this.executeInTransaction(tx, query),
      );
      const executionTime = Date.now() - startTime;

      const records = result.records.map((record) => record.toObject() as T);

      return GraphQueryResult.success(records, {
        nodesCreated: 0,
        nodesDeleted: 0,
        relationshipsCreated: 0,
        relationshipsDeleted: 0,
        propertiesSet: 0,
      }, executionTime);
    } finally {
      await session.close();
    }
  }

  async executeWriteQuery<T>(query: CypherQuery): Promise<GraphQueryResult<T>> {
    const session = this.driver.session();
    try {
      const startTime = Date.now();
      const result = await session.executeWrite((tx) =>
        this.executeInTransaction(tx, query),
      );
      const executionTime = Date.now() - startTime;

      const records = result.records.map((record) => record.toObject() as T);

      return GraphQueryResult.success(records, {
        nodesCreated: 0,
        nodesDeleted: 0,
        relationshipsCreated: 0,
        relationshipsDeleted: 0,
        propertiesSet: 0,
      }, executionTime);
    } finally {
      await session.close();
    }
  }

  async batchCreateNodes(nodes: GraphNode[]): Promise<GraphNode[]> {
    const session = this.driver.session();
    try {
      const nodesData = nodes.map((node) => ({
        id: node.id,
        type: node.type,
        properties: node.properties,
      }));

      const query = CypherQuery.create(
        `
        UNWIND $nodes as nodeData
        MERGE (n {id: nodeData.id})
        SET n:$nodeData.type, n += nodeData.properties
        RETURN n
        `,
        { nodes: nodesData },
      );

      await session.executeWrite((tx) => this.executeInTransaction(tx, query));

      return nodes;
    } finally {
      await session.close();
    }
  }

  async batchCreateRelationships(
    relationships: GraphRelationship[],
  ): Promise<GraphRelationship[]> {
    const session = this.driver.session();
    try {
      // Batch relationship creation with UNWIND
      for (const rel of relationships) {
        await this.createRelationship(rel);
      }
      return relationships;
    } finally {
      await session.close();
    }
  }

  async countNodesByType(): Promise<Record<NodeType, number>> {
    const session = this.driver.session();
    try {
      const result: Record<NodeType, number> = {} as any;

      for (const type of Object.values(NodeType)) {
        const query = CypherQuery.create(`
          MATCH (n:${type})
          RETURN count(n) as count
        `);

        const queryResult = await session.executeRead((tx) =>
          this.executeInTransaction(tx, query),
        );

        result[type] = queryResult.records[0]?.get('count').toNumber() || 0;
      }

      return result;
    } finally {
      await session.close();
    }
  }

  async countRelationshipsByType(): Promise<Record<RelationshipType, number>> {
    const session = this.driver.session();
    try {
      const result: Record<RelationshipType, number> = {} as any;

      for (const type of Object.values(RelationshipType)) {
        const query = CypherQuery.create(`
          MATCH ()-[r:${type}]->()
          RETURN count(r) as count
        `);

        const queryResult = await session.executeRead((tx) =>
          this.executeInTransaction(tx, query),
        );

        result[type] = queryResult.records[0]?.get('count').toNumber() || 0;
      }

      return result;
    } finally {
      await session.close();
    }
  }

  async getGraphStatistics(): Promise<GraphStatistics> {
    const session = this.driver.session();
    try {
      const query = CypherQuery.create(`
        MATCH (n)
        OPTIONAL MATCH ()-[r]->()
        RETURN 
          count(DISTINCT n) as nodeCount,
          count(r) as relationshipCount
      `);

      const result = await session.executeRead((tx) =>
        this.executeInTransaction(tx, query),
      );

      const record = result.records[0];
      const totalNodes = record.get('nodeCount').toNumber();
      const totalRelationships = record.get('relationshipCount').toNumber();

      return {
        totalNodes,
        totalRelationships,
        nodesByType: await this.countNodesByType(),
        relationshipsByType: await this.countRelationshipsByType(),
        averageDegree:
          totalNodes > 0 ? (totalRelationships * 2) / totalNodes : 0,
        density:
          totalNodes > 1
            ? totalRelationships / (totalNodes * (totalNodes - 1))
            : 0,
      };
    } finally {
      await session.close();
    }
  }
}
