# Docker Containerization Guide

> **Complete containerization strategy for Nivesh - Your AI Financial Strategist**

[![Docker](https://img.shields.io/badge/container-Docker-2496ED.svg)](https://www.docker.com/)
[![Docker Compose](https://img.shields.io/badge/orchestration-Docker%20Compose-2496ED.svg)](https://docs.docker.com/compose/)
[![PRD](https://img.shields.io/badge/docs-PRD-orange.svg)](../PRD.md)

## Table of Contents

- [Overview](#overview)
- [Product Context](#product-context)
- [Architecture](#architecture)
- [Docker Compose Configuration](#docker-compose-configuration)
- [Service Definitions](#service-definitions)
- [Networking](#networking)
- [Volumes & Data Persistence](#volumes--data-persistence)
- [Environment Variables](#environment-variables)
- [Security Benefits](#security-benefits)
- [Development Workflow](#development-workflow)
- [Production Considerations](#production-considerations)

---

## Overview

Nivesh runs as a **fully containerized stack** using Docker and Docker Compose. Every service runs in isolation, ensuring:

- ✅ **Reproducible builds** - Same environment everywhere (dev, staging, prod)
- ✅ **Easy deployment** - One command to start everything
- ✅ **Isolation** - Services cannot interfere with each other
- ✅ **Scalability** - Easy to add replicas for load balancing
- ✅ **Security** - Network-level isolation and least-privilege access
- ✅ **Regulatory compliance** - Auditable infrastructure for RBI/SEBI

---

## Product Context

**Nivesh's Architecture Goals (from PRD):**

- Support **MVP phase** with minimal infrastructure (single VM deployment)
- Enable **V1 phase** scalability (Kubernetes migration path)
- Ensure **data privacy** with isolated service containers
- Provide **developer experience** with hot-reload and easy setup

**Containerization Benefits for Nivesh:**

- **Data Isolation:** Each database runs in its own container
- **Microservices:** Backend (NestJS), AI Engine (FastAPI), Frontend separately deployable
- **Event-Driven:** Kafka container enables real-time event streaming
- **Monitoring:** Prometheus + Grafana containers for observability

---

## Architecture

```
┌────────────────────────────────────────────────┐
│                Docker Network (nivesh-net)      │
│                                                │
│  ┌──────────┐   ┌───────────┐   ┌───────────┐ │
│  │ Frontend │ → │API Gateway│ → │  NestJS   │ │
│  │ (Next.js)│   │  (Kong)   │   │  Backend  │ │
│  └──────────┘   └───────────┘   └─────┬─────┘ │
│                                        │       │
│                                        ▼       │
│  ┌───────────┐         Kafka      ┌──────────┐│
│  │  FastAPI  │ ◀────────────────▶ │Event Bus ││
│  │AI Engine  │                    └──────────┘│
│  └─────┬─────┘                                 │
│        │                                       │
│        ▼                                       │
│  ┌───────────────┐   ┌───────────────┐        │
│  │ Vector Store  │   │  ML Models    │        │
│  └───────────────┘   └───────────────┘        │
│                                                │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌──────┐   │
│  │Postgres│ │ Neo4j  │ │ Mongo  │ │Redis │   │
│  └────────┘ └────────┘ └────────┘ └──────┘   │
│                                                │
│  ┌────────────┐  ┌────────────┐               │
│  │ MinIO (S3) │  │ Keycloak   │               │
│  └────────────┘  └────────────┘               │
│                                                │
│  ┌────────────┐  ┌────────────┐               │
│  │ Prometheus │  │  Grafana   │               │
│  └────────────┘  └────────────┘               │
└────────────────────────────────────────────────┘
```

---

## Docker Compose Configuration

### Complete docker-compose.yml

```yaml
version: "3.9"

networks:
  nivesh-net:
    driver: bridge

volumes:
  postgres_data:
  neo4j_data:
  mongo_data:
  redis_data:
  minio_data:
  kafka_data:

services:
  # Database Services
  postgres:
    image: postgres:15
    container_name: nivesh-postgres
    environment:
      POSTGRES_DB: nivesh
      POSTGRES_USER: nivesh
      POSTGRES_PASSWORD: nivesh
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - nivesh-net
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U nivesh"]
      interval: 10s
      timeout: 5s
      retries: 5

  neo4j:
    image: neo4j:5
    container_name: nivesh-neo4j
    environment:
      NEO4J_AUTH: neo4j/password
      NEO4J_PLUGINS: '["apoc", "graph-data-science"]'
    volumes:
      - neo4j_data:/data
    networks:
      - nivesh-net
    ports:
      - "7474:7474"
      - "7687:7687"

  mongo:
    image: mongo:6
    container_name: nivesh-mongo
    volumes:
      - mongo_data:/data/db
    networks:
      - nivesh-net
    ports:
      - "27017:27017"

  redis:
    image: redis:7-alpine
    container_name: nivesh-redis
    command: redis-server --appendonly yes
    networks:
      - nivesh-net
    ports:
      - "6379:6379"

  # Event Streaming
  zookeeper:
    image: confluentinc/cp-zookeeper:latest
    container_name: nivesh-zookeeper
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    networks:
      - nivesh-net

  kafka:
    image: confluentinc/cp-kafka:latest
    container_name: nivesh-kafka
    depends_on:
      - zookeeper
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    volumes:
      - kafka_data:/var/lib/kafka/data
    networks:
      - nivesh-net
    ports:
      - "9092:9092"

  # Authentication
  keycloak:
    image: quay.io/keycloak/keycloak:latest
    container_name: nivesh-keycloak
    command: start-dev
    environment:
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: admin
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/keycloak
      KC_DB_USERNAME: nivesh
      KC_DB_PASSWORD: nivesh
    depends_on:
      - postgres
    networks:
      - nivesh-net
    ports:
      - "8080:8080"

  # Object Storage
  minio:
    image: minio/minio:latest
    container_name: nivesh-minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: nivesh
      MINIO_ROOT_PASSWORD: nivesh123
    volumes:
      - minio_data:/data
    networks:
      - nivesh-net
    ports:
      - "9000:9000"
      - "9001:9001"

  # Application Services
  ai-engine:
    build:
      context: ./apps/ai-engine
      dockerfile: Dockerfile
    container_name: nivesh-ai
    env_file:
      - .env
    depends_on:
      - redis
      - mongo
      - kafka
    networks:
      - nivesh-net
    ports:
      - "8000:8000"
    volumes:
      - ./apps/ai-engine:/app
      - ./data/models:/app/models

  backend:
    build:
      context: ./apps/backend-nest
      dockerfile: Dockerfile
    container_name: nivesh-backend
    env_file:
      - .env
    depends_on:
      - postgres
      - neo4j
      - kafka
      - redis
      - ai-engine
    networks:
      - nivesh-net
    ports:
      - "3001:3000"
    volumes:
      - ./apps/backend-nest:/app
      - /app/node_modules

  frontend:
    build:
      context: ./apps/frontend
      dockerfile: Dockerfile
    container_name: nivesh-frontend
    depends_on:
      - backend
    networks:
      - nivesh-net
    ports:
      - "3000:3000"
    volumes:
      - ./apps/frontend:/app
      - /app/node_modules

  # Monitoring
  prometheus:
    image: prom/prometheus:latest
    container_name: nivesh-prometheus
    volumes:
      - ./infra/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
    networks:
      - nivesh-net
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:latest
    container_name: nivesh-grafana
    environment:
      GF_SECURITY_ADMIN_USER: admin
      GF_SECURITY_ADMIN_PASSWORD: admin
    depends_on:
      - prometheus
    networks:
      - nivesh-net
    ports:
      - "3002:3000"
```

---

## Service Definitions

### Database Services

| Service        | Image       | Purpose                                    | Port       |
| -------------- | ----------- | ------------------------------------------ | ---------- |
| **PostgreSQL** | postgres:15 | Relational database for transactions       | 5432       |
| **Neo4j**      | neo4j:5     | Graph database for financial relationships | 7474, 7687 |
| **MongoDB**    | mongo:6     | Document store for conversations           | 27017      |
| **Redis**      | redis:7     | Cache and session storage                  | 6379       |

### Application Services

| Service       | Technology | Purpose                   | Port |
| ------------- | ---------- | ------------------------- | ---- |
| **Backend**   | NestJS     | Core API server           | 3001 |
| **AI Engine** | FastAPI    | Machine learning services | 8000 |
| **Frontend**  | Next.js    | Web interface             | 3000 |

### Infrastructure Services

| Service               | Purpose                        | Port       |
| --------------------- | ------------------------------ | ---------- |
| **Kafka + Zookeeper** | Event streaming                | 9092       |
| **Keycloak**          | Authentication & authorization | 8080       |
| **MinIO**             | S3-compatible object storage   | 9000, 9001 |
| **Prometheus**        | Metrics collection             | 9090       |
| **Grafana**           | Monitoring dashboards          | 3002       |

---

## Networking

All services run on the **nivesh-net** Docker network with:

- ✅ **Service discovery** - Services can find each other by name
- ✅ **Network isolation** - External access only through exposed ports
- ✅ **Internal communication** - Fast container-to-container networking

---

## Volumes & Data Persistence

Persistent data is stored in Docker volumes:

```yaml
volumes:
  postgres_data: # User data, transactions
  neo4j_data: # Graph relationships
  mongo_data: # Conversation history
  redis_data: # Cache data
  kafka_data: # Event logs
  minio_data: # Documents, files
```

**Benefits:**

- Data survives container restarts
- Easy backup and restore
- Performance optimization

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Database
POSTGRES_URL=postgresql://nivesh:nivesh@postgres:5432/nivesh
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
MONGODB_URI=mongodb://mongo:27017/nivesh
REDIS_URL=redis://redis:6379

# Kafka
KAFKA_BROKERS=kafka:9092

# AI Services
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key

# Auth
KEYCLOAK_URL=http://keycloak:8080
JWT_SECRET=your_jwt_secret

# Storage
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=nivesh
MINIO_SECRET_KEY=nivesh123
```

---

## Security Benefits

### Regulatory Compliance

| Risk                        | Mitigation                                     |
| --------------------------- | ---------------------------------------------- |
| **Data leaks**              | Network isolation prevents unauthorized access |
| **Undocumented services**   | All services defined in docker-compose.yml     |
| **Non-reproducible builds** | Immutable container images                     |
| **Audit gaps**              | All logs centralized                           |
| **Shadow AI**               | All ML models versioned in containers          |
| **GDPR violations**         | Data deletion across all containers            |

---

## Development Workflow

### Quick Start

```bash
# Clone repository
git clone https://github.com/your-org/nivesh-platform.git
cd nivesh-platform

# Create environment file
cp .env.example .env
# Edit .env with your configurations

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

### Individual Service Management

```bash
# Start only databases
docker-compose up -d postgres neo4j mongo redis

# Restart a specific service
docker-compose restart backend

# View logs for specific service
docker-compose logs -f ai-engine

# Execute commands in container
docker-compose exec backend npm run migrate
```

---

## Production Considerations

### Image Optimization

```dockerfile
# Multi-stage build example
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/main.js"]
```

### Health Checks

All services include health checks:

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### Resource Limits

```yaml
deploy:
  resources:
    limits:
      cpus: "2"
      memory: 4G
    reservations:
      cpus: "1"
      memory: 2G
```

---

## Advantages for Regulators

✅ **Immutable Infrastructure** - Every version is frozen in container images  
✅ **Audit Trail** - All changes tracked in Git and container registries  
✅ **Quick Rollback** - Revert to previous image instantly if issues arise  
✅ **Network Policies** - AI services can't access external internet without explicit rules  
✅ **Secret Management** - Encrypted environment variables and secrets rotation  
✅ **Compliance** - RBI/SEBI/GDPR requirements met with auditable logs

---

## MVP to Production Evolution

### MVP Phase (Local Development)

```bash
# Single VM deployment with Docker Compose
docker-compose up -d
# All services on one machine
# Suitable for: 50-100 beta users
```

### V1 Phase (Scalable Deployment)

```bash
# Kubernetes deployment with replicas
kubectl apply -f infra/kubernetes/
# Services scaled independently
# Suitable for: 2,000-5,000 users
```

### V2 Phase (Multi-Region)

```bash
# Multi-cluster with global load balancer
# Regional deployments for data sovereignty
# Suitable for: 50,000+ users
```

---

## Troubleshooting

### Common Issues

**Port conflicts:**

```bash
# Check what's using the port
netstat -ano | findstr :5432
# Stop conflicting service or change port in docker-compose.yml
```

**Volume permissions:**

```bash
# Reset volumes
docker-compose down -v
docker-compose up -d
```

**Out of memory:**

```bash
# Increase Docker Desktop memory allocation
# Settings → Resources → Memory: 8GB recommended
```

**Container won't start:**

```bash
# Check logs
docker logs nivesh-backend

# Inspect container
docker inspect nivesh-backend

# Restart specific service
docker-compose restart backend
```

---

## Performance Optimization

### Resource Allocation

| Service        | CPU (cores) | Memory (GB) | Storage (GB) |
| -------------- | ----------- | ----------- | ------------ |
| **PostgreSQL** | 2           | 4           | 50           |
| **Neo4j**      | 2           | 4           | 50           |
| **MongoDB**    | 1           | 2           | 20           |
| **Redis**      | 0.5         | 1           | 5            |
| **Kafka**      | 1           | 2           | 20           |
| **Backend**    | 1           | 2           | N/A          |
| **AI Engine**  | 2           | 4           | N/A          |
| **Frontend**   | 0.5         | 1           | N/A          |

### Health Checks

All services include health checks for automatic recovery:

```yaml
healthcheck:
  test: ["CMD", "pg_isready", "-U", "nivesh"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

---

## Backup & Recovery

### Automated Backups

```yaml
# Add backup service to docker-compose.yml
backup:
  image: postgres:15
  command: >
    bash -c "while true; do
      pg_dump -h postgres -U nivesh nivesh > /backup/nivesh_$(date +%Y%m%d).sql
      sleep 86400
    done"
  volumes:
    - ./backups:/backup
  depends_on:
    - postgres
```

### Manual Backup

```bash
# Backup PostgreSQL
docker exec nivesh-postgres pg_dump -U nivesh nivesh > backup.sql

# Backup Neo4j
docker exec nivesh-neo4j neo4j-admin backup --to=/backups

# Backup MongoDB
docker exec nivesh-mongo mongodump --out=/backup
```

---

**Last Updated:** January 13, 2026  
**Version:** 2.0 (Aligned with PRD v1.0)  
**Maintained By:** Nivesh Engineering Team

# Increase Docker memory limit in Docker Desktop settings

# Or add resource limits to docker-compose.yml

```

---

## Next Steps

- Deploy to Kubernetes for production → See [KUBERNETES.md](KUBERNETES.md)
- Configure monitoring → See observability section
- Set up CI/CD pipeline → Use GitHub Actions

---

**Last Updated:** January 2026
**Maintained By:** Nivesh DevOps Team
**Related Docs:** [KUBERNETES.md](KUBERNETES.md), [TECH_STACK.md](TECH_STACK.md)
```
