# Database Backup & Recovery Strategy

## Overview

Nivesh uses a polyglot persistence architecture with **5 databases**, each requiring a tailored backup approach. This document outlines the backup strategy, retention policies, recovery procedures, and disaster-recovery runbooks.

## Database Inventory

| Database   | Purpose                     | Backup Tool        | Schedule    | Retention |
| ---------- | --------------------------- | ------------------ | ----------- | --------- |
| PostgreSQL | Primary relational data     | `pg_dump` (custom) | Daily 02:00 | 7 days    |
| MongoDB    | Conversation / RAG storage  | `mongodump` (gzip) | Daily 02:00 | 7 days    |
| Neo4j      | Knowledge graph             | APOC export        | Daily 02:00 | 7 days    |
| Redis      | Cache + sessions            | BGSAVE → RDB copy  | Daily 02:00 | 7 days    |
| ClickHouse | Analytics time-series       | Native format dump  | Daily 02:00 | 7 days    |

## Backup Scripts

All scripts are in `scripts/backup/`:

```
scripts/backup/
├── backup-all.sh          # Orchestrator (runs all or selected DBs)
├── backup-postgres.sh
├── backup-mongodb.sh
├── backup-neo4j.sh
├── backup-redis.sh
└── backup-clickhouse.sh
```

### Running Manually

```bash
# All databases
./scripts/backup/backup-all.sh

# Specific databases
./scripts/backup/backup-all.sh --postgres --mongodb

# Single database
./scripts/backup/backup-postgres.sh
```

### Environment Variables

| Variable           | Default            | Description                |
| ------------------ | ------------------ | -------------------------- |
| `BACKUP_DIR`       | `/backups`         | Root backup directory      |
| `RETENTION_DAYS`   | `7`                | Days to keep old backups   |
| `PGHOST`           | `postgres`         | PostgreSQL host            |
| `PGUSER`           | `nivesh_user`      | PostgreSQL user            |
| `PGPASSWORD`       | `nivesh_password`  | PostgreSQL password        |
| `MONGO_HOST`       | `mongodb`          | MongoDB host               |
| `REDIS_HOST`       | `redis`            | Redis host                 |
| `CLICKHOUSE_HOST`  | `clickhouse`       | ClickHouse host            |

## Kubernetes CronJob

For production, backups are automated via a K8s CronJob defined in `k8s/backup-cronjob.yaml`:

- **Schedule:** Daily at 02:00 UTC
- **Timeout:** 1 hour
- **History:** Keeps 3 successful and 3 failed job records
- **Storage:** 50 Gi PVC (`nivesh-backup-pvc`)

Credentials are read from a K8s secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: nivesh-db-credentials
  namespace: nivesh
type: Opaque
stringData:
  POSTGRES_USER: nivesh_user
  POSTGRES_PASSWORD: <your-password>
  MONGO_USER: nivesh_user
  MONGO_PASSWORD: <your-password>
  REDIS_PASSWORD: <your-password>
```

## Recovery Procedures

### PostgreSQL

```bash
pg_restore -h <host> -U nivesh_user -d nivesh_db --clean --if-exists \
  /backups/postgres/nivesh_db_<timestamp>.dump
```

### MongoDB

```bash
mongorestore --host=<host> --username=nivesh_user --password=<pw> \
  --authenticationDatabase=admin --gzip --drop \
  /backups/mongodb/nivesh_conversations_<timestamp>/
```

### Neo4j

```bash
# From Cypher export
cypher-shell -a bolt://<host>:7687 -u neo4j -p <pw> < /backups/neo4j/neo4j_graph_<timestamp>.cypher

# From neo4j-admin dump
neo4j-admin database load neo4j --from-path=/backups/neo4j/ --overwrite-destination
```

### Redis

```bash
# Stop Redis, replace dump.rdb, restart
redis-cli -h <host> -a <pw> SHUTDOWN NOSAVE
cp /backups/redis/redis_<timestamp>.rdb /data/dump.rdb
# Restart Redis container
```

### ClickHouse

```bash
tar -xzf /backups/clickhouse/clickhouse_<timestamp>.tar.gz
# For each table:
clickhouse-client --query="$(cat <table>.sql)"
cat <table>.native | clickhouse-client --query="INSERT INTO <table> FORMAT Native"
```

## Retention Policy

| Tier        | Frequency | Retention | Storage      |
| ----------- | --------- | --------- | ------------ |
| Daily       | Every day | 7 days    | Local PVC    |
| Weekly      | Sunday    | 30 days   | Object store |
| Monthly     | 1st       | 90 days   | Object store |

> **Note:** Weekly and monthly archival to object storage (S3/GCS) is planned but not yet automated. Daily backups with 7-day retention are currently active.

## Monitoring

Backup job status is visible via:

- **Kubernetes:** `kubectl get jobs -n nivesh -l component=backup`
- **Prometheus alert:** `KubeJobFailed` fires when a backup job fails
- **Grafana:** Check the Infrastructure dashboard for backup job metrics
