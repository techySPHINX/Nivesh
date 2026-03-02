#!/usr/bin/env bash
# ClickHouse backup script — clickhouse-client with native format
# Usage: ./backup-clickhouse.sh
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups/clickhouse}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS="${RETENTION_DAYS:-7}"

CH_HOST="${CLICKHOUSE_HOST:-clickhouse}"
CH_PORT="${CLICKHOUSE_PORT:-9000}"
CH_USER="${CLICKHOUSE_USER:-nivesh_user}"
CH_PASSWORD="${CLICKHOUSE_PASSWORD:-nivesh_password}"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting ClickHouse backup..."

# Get list of user tables
TABLES=$(clickhouse-client \
  --host="$CH_HOST" \
  --port="$CH_PORT" \
  --user="$CH_USER" \
  --password="$CH_PASSWORD" \
  --query="SELECT database || '.' || name FROM system.tables WHERE database NOT IN ('system', 'information_schema', 'INFORMATION_SCHEMA')" 2>/dev/null || echo "")

if [ -z "$TABLES" ]; then
  echo "[$(date)] No user tables found. Skipping backup."
  exit 0
fi

DEST="$BACKUP_DIR/clickhouse_${TIMESTAMP}"
mkdir -p "$DEST"

for TABLE in $TABLES; do
  SAFE_NAME=$(echo "$TABLE" | tr '.' '_')
  echo "  Backing up $TABLE..."

  # Export schema
  clickhouse-client \
    --host="$CH_HOST" --port="$CH_PORT" \
    --user="$CH_USER" --password="$CH_PASSWORD" \
    --query="SHOW CREATE TABLE ${TABLE}" > "$DEST/${SAFE_NAME}.sql" 2>/dev/null

  # Export data in Native format (compact + fast)
  clickhouse-client \
    --host="$CH_HOST" --port="$CH_PORT" \
    --user="$CH_USER" --password="$CH_PASSWORD" \
    --query="SELECT * FROM ${TABLE} FORMAT Native" > "$DEST/${SAFE_NAME}.native" 2>/dev/null
done

# Compress
tar -czf "$BACKUP_DIR/clickhouse_${TIMESTAMP}.tar.gz" -C "$BACKUP_DIR" "clickhouse_${TIMESTAMP}"
rm -rf "$DEST"

echo "[$(date)] ClickHouse backup complete: clickhouse_${TIMESTAMP}.tar.gz"

# Prune old backups
find "$BACKUP_DIR" -name "clickhouse_*.tar.gz" -mtime +"$RETENTION_DAYS" -delete
echo "[$(date)] Pruned backups older than ${RETENTION_DAYS} days"
