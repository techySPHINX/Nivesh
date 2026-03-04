#!/usr/bin/env bash
# PostgreSQL backup script — pg_dump with gzip compression
# Usage: ./backup-postgres.sh
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups/postgres}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS="${RETENTION_DAYS:-7}"

DB_HOST="${PGHOST:-postgres}"
DB_PORT="${PGPORT:-5432}"
DB_USER="${PGUSER:-nivesh_user}"
DB_NAME="${PGDATABASE:-nivesh_db}"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting PostgreSQL backup for $DB_NAME..."

PGPASSWORD="${PGPASSWORD:-nivesh_password}" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --format=custom \
  --compress=9 \
  --verbose \
  -f "$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.dump"

echo "[$(date)] Backup complete: ${DB_NAME}_${TIMESTAMP}.dump"

# Also backup MLflow database
if PGPASSWORD="${PGPASSWORD:-nivesh_password}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw mlflow; then
  PGPASSWORD="${PGPASSWORD:-nivesh_password}" pg_dump \
    -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d mlflow \
    --format=custom --compress=9 \
    -f "$BACKUP_DIR/mlflow_${TIMESTAMP}.dump"
  echo "[$(date)] MLflow backup complete"
fi

# Prune old backups
find "$BACKUP_DIR" -name "*.dump" -mtime +"$RETENTION_DAYS" -delete
echo "[$(date)] Pruned backups older than ${RETENTION_DAYS} days"
