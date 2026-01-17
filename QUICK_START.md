# Nivesh - Quick Start Guide

Get Nivesh up and running in **under 10 minutes** ⚡

---

## Prerequisites

Before you begin, ensure you have the following installed:

- ✅ **Node.js 20+** ([Download](https://nodejs.org/))
- ✅ **Docker Desktop** ([Download](https://www.docker.com/products/docker-desktop))
- ✅ **Git** ([Download](https://git-scm.com/))
- ✅ **GCP Account** (for AI services - [Sign up](https://cloud.google.com/))

### Verify Prerequisites

```bash
node --version    # Should be v20.x or higher
docker --version  # Should be 20.x or higher
git --version     # Should be 2.x or higher
```

---

## Step 1: Clone Repository

```bash
git clone https://github.com/techySPHINX/Nivesh.git
cd Nivesh
```

---

## Step 2: Environment Setup

### Create Environment Files

```bash
# Copy example environment files
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/web/.env.example frontend/web/.env
```

### Configure Backend Environment

Edit `backend/.env` with your credentials:

```env
# Essential Variables (Update these!)
NODE_ENV=development
PORT=3000

# PostgreSQL (Docker defaults - no change needed)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=nivesh_user
POSTGRES_PASSWORD=nivesh_password
POSTGRES_DB=nivesh_db
DATABASE_URL="postgresql://nivesh_user:nivesh_password@localhost:5432/nivesh_db"

# Neo4j (Docker defaults)
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=nivesh_password

# MongoDB (Docker defaults)
MONGODB_URI=mongodb://nivesh_user:nivesh_password@localhost:27017
MONGODB_DB=nivesh_conversations

# Redis (Docker defaults)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=nivesh_password

# Kafka (Docker defaults)
KAFKA_BROKERS=localhost:29092
KAFKA_CLIENT_ID=nivesh-backend

# JWT Secret (Generate with: openssl rand -base64 32)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Firebase (Get from Firebase Console)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# GCP AI (Get from GCP Console)
GCP_PROJECT_ID=your-gcp-project-id
GCP_LOCATION=us-central1
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-1.5-pro

# Fi MCP (Get from Fi Money Developer Portal)
FI_MCP_API_URL=https://api.fi.money
FI_MCP_API_KEY=your-fi-mcp-api-key
```

### Configure Frontend Environment

Edit `frontend/web/.env`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
```

---

## Step 3: Install Dependencies

```bash
# Install all dependencies (root + backend + frontend)
make install

# OR manually:
npm install
cd backend && npm install
cd ../frontend/web && npm install
```

**Expected Output:**

```
✅ Dependencies installed
```

---

## Step 4: Start Docker Services

Start all backend services (PostgreSQL, Neo4j, MongoDB, Redis, Kafka, etc.):

```bash
make docker-up
```

**Expected Output:**

```
Starting Docker services...
✅ Docker services started

Access services at:
  - PostgreSQL: localhost:5432
  - Neo4j: http://localhost:7474
  - MongoDB: localhost:27017
  - Redis: localhost:6379
  - Kafka: localhost:29092
  - Grafana: http://localhost:3001
```

**Wait 30 seconds** for all services to initialize.

### Verify Services are Running

```bash
make health
```

**Expected Output:**

```
Backend API: {"status":"ok","timestamp":"..."}
PostgreSQL: ✅ Healthy
Neo4j: ✅ Healthy
MongoDB: ✅ Healthy
Redis: ✅ Healthy
Kafka: ✅ Healthy
```

---

## Step 5: Run Database Migrations

```bash
make migrate
```

**Expected Output:**

```
Running migrations...
✅ Migrations completed
```

### Seed Database (Optional)

```bash
make db-seed
```

This creates test users and sample data for development.

---

## Step 6: Start Development Servers

### Option A: Start Everything (Recommended)

```bash
make dev
```

This starts:

- Backend API (http://localhost:3000)
- Web Frontend (http://localhost:3001)

### Option B: Start Components Individually

```bash
# Terminal 1: Backend
make dev-backend

# Terminal 2: Web Frontend
make dev-web

# Terminal 3: Mobile App (optional)
make dev-mobile
```

---

## Step 7: Access Applications

### Backend API

- **URL:** http://localhost:3000/api/v1/health
- **Swagger Docs:** http://localhost:3000/api/docs
- **GraphQL Playground:** http://localhost:3000/graphql (if enabled)

### Web Frontend

- **URL:** http://localhost:3001
- **Login:** Use Firebase Auth (sign up via UI)

### Admin Dashboards

- **Neo4j Browser:** http://localhost:7474

  - Username: `neo4j`
  - Password: `nivesh_password`

- **Grafana:** http://localhost:3001

  - Username: `admin`
  - Password: `admin`

- **Kong Admin API:** http://localhost:8001

---

## Step 8: Test API Endpoints

### Health Check

```bash
curl http://localhost:3000/api/v1/health
```

**Expected Response:**

```json
{
  "status": "ok",
  "timestamp": "2026-01-17T10:30:00.000Z",
  "uptime": 123.456,
  "environment": "development"
}
```

### Create User (requires Firebase token)

```bash
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{
    "firebaseUid": "firebase-user-123",
    "email": "test@example.com"
  }'
```

---

## Common Commands

```bash
# View all available commands
make help

# Stop Docker services
make docker-down

# Restart Docker services
make docker-restart

# View logs
make docker-logs

# Run tests
make test

# Lint code
make lint

# Format code
make format

# Build production
make build
```

---

## Troubleshooting

### Port Already in Use

If you see "port already in use" errors:

```bash
# Find process using port 3000
lsof -ti:3000 | xargs kill -9   # macOS/Linux
netstat -ano | findstr :3000    # Windows

# Or change port in backend/.env
PORT=3001
```

### Docker Services Not Starting

```bash
# Check Docker status
docker ps

# View logs for specific service
docker logs nivesh-postgres
docker logs nivesh-neo4j

# Restart Docker Desktop and try again
make docker-restart
```

### Database Connection Errors

```bash
# Ensure Docker services are running
make health

# Reset database if corrupted
make db-reset

# Check connection strings in backend/.env
```

### Prisma Schema Changes

```bash
# Generate Prisma Client after schema changes
cd backend
npx prisma generate

# Create migration
make migrate-create NAME=your_migration_name
```

### Firebase Auth Issues

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Enable **Authentication** → **Sign-in method** → **Email/Password**
3. Download service account JSON from **Project Settings** → **Service Accounts**
4. Update `FIREBASE_PRIVATE_KEY` in `backend/.env`

---

## Next Steps

Now that Nivesh is running locally, you can:

1. **Explore API Documentation**

   - Open http://localhost:3000/api/docs

2. **Read Architecture Docs**

   - [Architecture Overview](docs/Architecture.md)
   - [Database Strategy](docs/DATABASE_STRATERGY.md)
   - [Tech Stack](docs/TECH_STACK.md)

3. **Follow Development Guide**

   - [Complete Development Guide](DEVELOPMENT_GUIDE.md)
   - [Module Implementation Guide](MODULE_IMPLEMENTATION_GUIDE.md)

4. **Review ADRs (Architecture Decision Records)**

   - [ADR-001: Modular Monolith](docs/adr/001-modular-monolith.md)
   - [ADR-002: Polyglot Persistence](docs/adr/002-polyglot-persistence.md)
   - [ADR-003: Event-Driven Architecture](docs/adr/003-event-driven-architecture.md)

5. **Start Implementing Modules**
   - Begin with [User Module](MODULE_IMPLEMENTATION_GUIDE.md#module-2-user-management-week-1)
   - Follow [Implementation Sequence](MODULE_IMPLEMENTATION_GUIDE.md#detailed-implementation-sequence)

---

## Development Workflow

```bash
# 1. Pull latest changes
git pull origin develop

# 2. Start environment
make docker-up
make dev

# 3. Create feature branch
git checkout -b feature/your-feature

# 4. Write code + tests

# 5. Run tests
make test

# 6. Lint and format
make lint-fix
make format

# 7. Commit with conventional commits
git commit -m "feat(module): your feature description"

# 8. Push and create PR
git push origin feature/your-feature
```

---

## Getting Help

- **Documentation:** [docs/](docs/)
- **Issues:** [GitHub Issues](https://github.com/techySPHINX/Nivesh/issues)
- **Discussions:** [GitHub Discussions](https://github.com/techySPHINX/Nivesh/discussions)
- **Email:** jaganhotta357@outlook.com

---

## License

This project is proprietary software. See [LICENSE](LICENSE) for details.

**For commercial licensing:** Contact jaganhotta357@outlook.com

---

**Happy Coding! 🚀**
