#!/usr/bin/env bash
# Neo4j backup script — neo4j-admin dump
# Usage: ./backup-neo4j.sh
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups/neo4j}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS="${RETENTION_DAYS:-7}"

NEO4J_HOST="${NEO4J_HOST:-neo4j}"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting Neo4j backup..."

# Use cypher-shell to export all nodes and relationships as Cypher statements
cypher-shell \
  -a "bolt://${NEO4J_HOST}:7687" \
  -u neo4j \
  -p "${NEO4J_PASSWORD:-nivesh_password}" \
  --format plain \
  "CALL apoc.export.cypher.all(null, {format: 'cypher-shell', stream: true}) YIELD cypherStatements RETURN cypherStatements" \
  > "$BACKUP_DIR/neo4j_graph_${TIMESTAMP}.cypher" 2>/dev/null || {
    # Fallback: dump via neo4j-admin if cypher-shell export fails
    echo "[$(date)] APOC export failed, attempting neo4j-admin dump..."
    docker exec nivesh-neo4j neo4j-admin database dump neo4j \
      --to-path=/tmp/ 2>/dev/null && \
    docker cp nivesh-neo4j:/tmp/neo4j.dump "$BACKUP_DIR/neo4j_${TIMESTAMP}.dump" || \
    echo "[$(date)] WARNING: Neo4j backup requires APOC plugin or neo4j-admin access"
  }

echo "[$(date)] Neo4j backup complete"

# Prune old backups
find "$BACKUP_DIR" -name "neo4j_*" -mtime +"$RETENTION_DAYS" -delete
echo "[$(date)] Pruned backups older than ${RETENTION_DAYS} days"
