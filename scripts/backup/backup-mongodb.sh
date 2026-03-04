#!/usr/bin/env bash
# MongoDB backup script — mongodump with gzip
# Usage: ./backup-mongodb.sh
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups/mongodb}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS="${RETENTION_DAYS:-7}"

MONGO_HOST="${MONGO_HOST:-mongodb}"
MONGO_PORT="${MONGO_PORT:-27017}"
MONGO_USER="${MONGO_USER:-nivesh_user}"
MONGO_PASSWORD="${MONGO_PASSWORD:-nivesh_password}"
MONGO_DB="${MONGO_DB:-nivesh_conversations}"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting MongoDB backup for $MONGO_DB..."

mongodump \
  --host="$MONGO_HOST" \
  --port="$MONGO_PORT" \
  --username="$MONGO_USER" \
  --password="$MONGO_PASSWORD" \
  --authenticationDatabase=admin \
  --db="$MONGO_DB" \
  --gzip \
  --out="$BACKUP_DIR/${MONGO_DB}_${TIMESTAMP}"

echo "[$(date)] Backup complete: ${MONGO_DB}_${TIMESTAMP}"

# Prune old backups
find "$BACKUP_DIR" -maxdepth 1 -name "${MONGO_DB}_*" -type d -mtime +"$RETENTION_DAYS" -exec rm -rf {} +
echo "[$(date)] Pruned backups older than ${RETENTION_DAYS} days"
