#!/usr/bin/env bash
# Redis backup script — BGSAVE + copy RDB
# Usage: ./backup-redis.sh
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups/redis}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS="${RETENTION_DAYS:-7}"

REDIS_HOST="${REDIS_HOST:-redis}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-nivesh_password}"
# Export REDISCLI_AUTH so the password is never passed as a CLI flag (avoids
# leaking credentials in the process list visible to `ps` or /proc).
export REDISCLI_AUTH="$REDIS_PASSWORD"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting Redis backup..."

# Capture LASTSAVE timestamp before triggering BGSAVE
BEFORE_SAVE=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" LASTSAVE)

# Trigger background save
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" BGSAVE

# Wait for BGSAVE to complete (LASTSAVE timestamp changes) with a timeout
MAX_WAIT_SECONDS="${REDIS_BGSAVE_MAX_WAIT_SECONDS:-300}"
START_TIME=$(date +%s)
while [ "$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" LASTSAVE)" == "$BEFORE_SAVE" ]; do
  CURRENT_TIME=$(date +%s)
  ELAPSED=$((CURRENT_TIME - START_TIME))
  if [ "$ELAPSED" -ge "$MAX_WAIT_SECONDS" ]; then
    echo "[$(date)] ERROR: BGSAVE did not complete within ${MAX_WAIT_SECONDS}s; aborting backup."
    exit 1
  fi
  sleep 1
done
sleep 2

# Copy the RDB file from the Redis container
docker cp nivesh-redis:/data/dump.rdb "$BACKUP_DIR/redis_${TIMESTAMP}.rdb" 2>/dev/null || {
  echo "[$(date)] WARNING: Could not copy RDB file directly. Trying redis-cli --rdb..."
  redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" --rdb "$BACKUP_DIR/redis_${TIMESTAMP}.rdb"
}

echo "[$(date)] Redis backup complete: redis_${TIMESTAMP}.rdb"

# Prune old backups
find "$BACKUP_DIR" -name "redis_*.rdb" -mtime +"$RETENTION_DAYS" -delete
echo "[$(date)] Pruned backups older than ${RETENTION_DAYS} days"
