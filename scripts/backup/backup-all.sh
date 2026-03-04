#!/usr/bin/env bash
# Master backup orchestrator — runs all database backup scripts
# Usage: ./backup-all.sh [--postgres] [--mongodb] [--neo4j] [--redis] [--clickhouse]
# With no flags, backs up all databases.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export BACKUP_DIR="${BACKUP_DIR:-/backups}"
export RETENTION_DAYS="${RETENTION_DAYS:-7}"

TARGETS=("$@")
if [ ${#TARGETS[@]} -eq 0 ]; then
  TARGETS=("--postgres" "--mongodb" "--neo4j" "--redis" "--clickhouse")
fi

FAILED=0

for TARGET in "${TARGETS[@]}"; do
  case "$TARGET" in
    --postgres)
      echo "===== PostgreSQL Backup ====="
      bash "$SCRIPT_DIR/backup-postgres.sh" || { echo "FAILED: PostgreSQL"; FAILED=1; }
      ;;
    --mongodb)
      echo "===== MongoDB Backup ====="
      bash "$SCRIPT_DIR/backup-mongodb.sh" || { echo "FAILED: MongoDB"; FAILED=1; }
      ;;
    --neo4j)
      echo "===== Neo4j Backup ====="
      bash "$SCRIPT_DIR/backup-neo4j.sh" || { echo "FAILED: Neo4j"; FAILED=1; }
      ;;
    --redis)
      echo "===== Redis Backup ====="
      bash "$SCRIPT_DIR/backup-redis.sh" || { echo "FAILED: Redis"; FAILED=1; }
      ;;
    --clickhouse)
      echo "===== ClickHouse Backup ====="
      bash "$SCRIPT_DIR/backup-clickhouse.sh" || { echo "FAILED: ClickHouse"; FAILED=1; }
      ;;
    *)
      echo "Unknown target: $TARGET"
      ;;
  esac
done

if [ "$FAILED" -ne 0 ]; then
  echo "[$(date)] ⚠️  Some backups failed. Check logs above."
  exit 1
fi

echo "[$(date)] ✅ All backups completed successfully"
