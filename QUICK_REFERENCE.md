# 🚀 Nivesh Backend - Quick Reference

## Start Development (3 Commands)

```bash
# 1. Start infrastructure
make docker-up

# 2. Generate Prisma client & run migrations
make db-generate && make db-migrate

# 3. Start dev server
make dev
```

## Essential URLs

- **API**: http://localhost:3000/api/v1
- **Swagger Docs**: http://localhost:3000/api/docs
- **Health Check**: http://localhost:3000/api/v1/health
- **Detailed Health**: http://localhost:3000/api/v1/health/detailed
- **Neo4j Browser**: http://localhost:7474 (user: neo4j, pass: nivesh_password)
- **Prisma Studio**: Run `make db-studio`

## Common Commands

```bash
# Development
make dev                 # Start with hot reload
make build               # Build for production
make lint                # Run linter
make format              # Format code
make test                # Run tests

# Database
make db-migrate          # Run migrations
make db-studio           # Open Prisma Studio
make db-seed             # Seed test data
make db-reset            # ⚠️  Reset database

# Docker
make docker-up           # Start all services
make docker-down         # Stop all services
make docker-logs         # View logs

# Infrastructure
make health-check        # Check all services
make infra-up            # Complete infrastructure setup
```

## Database Credentials

```env
PostgreSQL:   localhost:5432 (nivesh_user/nivesh_password)
Neo4j:        localhost:7687 (neo4j/nivesh_password)
MongoDB:      localhost:27017 (nivesh_user/nivesh_password)
Redis:        localhost:6379 (nivesh_password)
ClickHouse:   localhost:8123 (nivesh_user/nivesh_password)
Kafka:        localhost:29092
```

## Project Structure

```
backend/
├── src/
│   ├── core/                    # Infrastructure
│   │   ├── database/            # All DB connections
│   │   ├── messaging/           # Kafka
│   │   ├── security/            # Auth & encryption
│   │   ├── observability/       # Logging
│   │   └── exceptions/          # Error handling
│   │
│   ├── modules/                 # Business logic
│   │   └── [to be implemented]
│   │
│   ├── app.module.ts
│   └── main.ts
│
├── prisma/
│   └── schema.prisma
├── .env
├── Makefile
└── package.json
```

## Key Features Implemented ✅

- ✅ PostgreSQL + Prisma ORM
- ✅ Neo4j Knowledge Graph
- ✅ MongoDB for conversations
- ✅ Redis caching
- ✅ ClickHouse analytics
- ✅ Kafka event bus
- ✅ JWT + Firebase Auth
- ✅ AES-256-GCM encryption
- ✅ Winston logging
- ✅ Health checks
- ✅ Global exception handling
- ✅ Swagger documentation

## Next Steps

1. **Configure Environment**

   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

2. **Start Development**

   ```bash
   make setup    # First time only
   make dev      # Start coding!
   ```

3. **Begin Module Development**
   - Next: User Management Module
   - Location: `src/modules/user/`
   - Reference: `MODULE_IMPLEMENTATION_GUIDE.md`

## Troubleshooting

### Build Fails

```bash
pnpm run prisma:generate
pnpm run build
```

### Database Connection Issues

```bash
make docker-ps          # Check if services are running
make docker-logs        # View service logs
make docker-restart     # Restart services
```

### Port Already in Use

```bash
# Stop all Docker containers
make docker-down

# Or manually kill process
# Windows: netstat -ano | findstr :3000
#          taskkill /PID <PID> /F
```

## Help & Documentation

- **Full Guide**: `DEVELOPMENT_GUIDE.md`
- **Module Guide**: `MODULE_IMPLEMENTATION_GUIDE.md`
- **Architecture**: `docs/Architecture.md`
- **Phase 1 Report**: `PHASE_1_COMPLETE.md`
- **Make Commands**: Run `make help`

---

**Ready to build! 🚀**
