# Nivesh Makefile - Development Commands
.PHONY: help install setup dev build test lint clean docker-up docker-down migrate deploy

# Colors for output
YELLOW := \033[1;33m
GREEN := \033[1;32m
RED := \033[1;31m
NC := \033[0m # No Color

## help: Display this help message
help:
	@echo "$(GREEN)Nivesh Development Commands$(NC)"
	@echo "======================================"
	@echo ""
	@echo "$(YELLOW)Setup & Installation:$(NC)"
	@echo "  make install          - Install all dependencies (root + backend + frontend)"
	@echo "  make setup            - Initial project setup (install + docker + migrate)"
	@echo ""
	@echo "$(YELLOW)Development:$(NC)"
	@echo "  make dev              - Start development environment (docker + backend + web)"
	@echo "  make dev-backend      - Start backend only"
	@echo "  make dev-web          - Start web frontend only"
	@echo "  make dev-mobile       - Start mobile app (Expo)"
	@echo ""
	@echo "$(YELLOW)Docker:$(NC)"
	@echo "  make docker-up        - Start all Docker services (databases, kafka, etc.)"
	@echo "  make docker-down      - Stop all Docker services"
	@echo "  make docker-restart   - Restart all Docker services"
	@echo "  make docker-logs      - View Docker logs"
	@echo "  make docker-clean     - Remove all Docker volumes (⚠️  destroys data)"
	@echo ""
	@echo "$(YELLOW)Database:$(NC)"
	@echo "  make migrate          - Run database migrations"
	@echo "  make migrate-create   - Create new migration (NAME=migration_name)"
	@echo "  make migrate-rollback - Rollback last migration"
	@echo "  make db-seed          - Seed database with test data"
	@echo "  make db-reset         - Reset database (drop + migrate + seed)"
	@echo ""
	@echo "$(YELLOW)Testing:$(NC)"
	@echo "  make test             - Run all tests"
	@echo "  make test-unit        - Run unit tests only"
	@echo "  make test-integration - Run integration tests"
	@echo "  make test-e2e         - Run end-to-end tests"
	@echo "  make test-coverage    - Run tests with coverage report"
	@echo ""
	@echo "$(YELLOW)Code Quality:$(NC)"
	@echo "  make lint             - Lint all code"
	@echo "  make lint-fix         - Lint and auto-fix issues"
	@echo "  make format           - Format code with Prettier"
	@echo "  make type-check       - TypeScript type checking"
	@echo ""
	@echo "$(YELLOW)Build & Deploy:$(NC)"
	@echo "  make build            - Build all applications"
	@echo "  make build-backend    - Build backend only"
	@echo "  make build-web        - Build web frontend only"
	@echo "  make deploy-dev       - Deploy to development environment"
	@echo "  make deploy-staging   - Deploy to staging environment"
	@echo ""
	@echo "$(YELLOW)Maintenance:$(NC)"
	@echo "  make clean            - Clean build artifacts and node_modules"
	@echo "  make logs             - View application logs"
	@echo "  make health           - Check health of all services"
	@echo ""

## install: Install all dependencies
install:
	@echo "$(GREEN)Installing dependencies...$(NC)"
	npm install
	cd backend && npm install
	cd frontend/web && npm install
	cd frontend/mobile && npm install
	@echo "$(GREEN)✅ Dependencies installed$(NC)"

## setup: Initial project setup
setup: install docker-up
	@echo "$(GREEN)Running initial setup...$(NC)"
	sleep 10  # Wait for databases to be ready
	$(MAKE) migrate
	$(MAKE) db-seed
	@echo "$(GREEN)✅ Setup complete! Run 'make dev' to start development.$(NC)"

## dev: Start full development environment
dev:
	@echo "$(GREEN)Starting development environment...$(NC)"
	$(MAKE) docker-up
	sleep 5
	npx turbo run dev

## dev-backend: Start backend only
dev-backend:
	@echo "$(GREEN)Starting backend...$(NC)"
	cd backend && npm run start:dev

## dev-web: Start web frontend only
dev-web:
	@echo "$(GREEN)Starting web frontend...$(NC)"
	cd frontend/web && npm run dev

## dev-mobile: Start mobile app
dev-mobile:
	@echo "$(GREEN)Starting mobile app...$(NC)"
	cd frontend/mobile && npm run start

## docker-up: Start Docker services
docker-up:
	@echo "$(GREEN)Starting Docker services...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)✅ Docker services started$(NC)"
	@echo "Access services at:"
	@echo "  - PostgreSQL: localhost:5432"
	@echo "  - Neo4j: http://localhost:7474"
	@echo "  - MongoDB: localhost:27017"
	@echo "  - Redis: localhost:6379"
	@echo "  - Kafka: localhost:29092"
	@echo "  - Kong Admin: http://localhost:8001"
	@echo "  - Grafana: http://localhost:3001"

## docker-down: Stop Docker services
docker-down:
	@echo "$(YELLOW)Stopping Docker services...$(NC)"
	docker-compose down
	@echo "$(GREEN)✅ Docker services stopped$(NC)"

## docker-restart: Restart Docker services
docker-restart:
	@echo "$(YELLOW)Restarting Docker services...$(NC)"
	docker-compose restart
	@echo "$(GREEN)✅ Docker services restarted$(NC)"

## docker-logs: View Docker logs
docker-logs:
	docker-compose logs -f

## docker-clean: Remove all Docker volumes (⚠️  destroys data)
docker-clean:
	@echo "$(RED)⚠️  WARNING: This will delete all database data!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v; \
		echo "$(GREEN)✅ Docker volumes removed$(NC)"; \
	else \
		echo "$(YELLOW)Cancelled$(NC)"; \
	fi

## migrate: Run database migrations
migrate:
	@echo "$(GREEN)Running migrations...$(NC)"
	cd backend && npx prisma migrate deploy
	@echo "$(GREEN)✅ Migrations completed$(NC)"

## migrate-create: Create new migration
migrate-create:
	@if [ -z "$(NAME)" ]; then \
		echo "$(RED)Error: Please provide migration name with NAME=migration_name$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)Creating migration: $(NAME)$(NC)"
	cd backend && npx prisma migrate dev --name $(NAME)

## migrate-rollback: Rollback last migration
migrate-rollback:
	@echo "$(YELLOW)Rolling back last migration...$(NC)"
	cd backend && npx prisma migrate resolve --rolled-back $(shell cd backend && npx prisma migrate status | grep "Applied" | tail -1 | awk '{print $$1}')
	@echo "$(GREEN)✅ Migration rolled back$(NC)"

## db-seed: Seed database with test data
db-seed:
	@echo "$(GREEN)Seeding database...$(NC)"
	cd backend && npx prisma db seed
	@echo "$(GREEN)✅ Database seeded$(NC)"

## db-reset: Reset database (⚠️  destroys data)
db-reset:
	@echo "$(RED)⚠️  WARNING: This will delete all database data!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		cd backend && npx prisma migrate reset --force; \
		echo "$(GREEN)✅ Database reset$(NC)"; \
	else \
		echo "$(YELLOW)Cancelled$(NC)"; \
	fi

## test: Run all tests
test:
	@echo "$(GREEN)Running all tests...$(NC)"
	npx turbo run test

## test-unit: Run unit tests only
test-unit:
	@echo "$(GREEN)Running unit tests...$(NC)"
	cd backend && npm run test

## test-integration: Run integration tests
test-integration:
	@echo "$(GREEN)Running integration tests...$(NC)"
	cd backend && npm run test:integration

## test-e2e: Run end-to-end tests
test-e2e:
	@echo "$(GREEN)Running E2E tests...$(NC)"
	cd backend && npm run test:e2e

## test-coverage: Run tests with coverage
test-coverage:
	@echo "$(GREEN)Running tests with coverage...$(NC)"
	cd backend && npm run test:cov
	@echo "$(GREEN)Coverage report: backend/coverage/lcov-report/index.html$(NC)"

## lint: Lint all code
lint:
	@echo "$(GREEN)Linting code...$(NC)"
	npx turbo run lint

## lint-fix: Lint and auto-fix issues
lint-fix:
	@echo "$(GREEN)Linting and fixing code...$(NC)"
	cd backend && npm run lint -- --fix
	cd frontend/web && npm run lint -- --fix

## format: Format code with Prettier
format:
	@echo "$(GREEN)Formatting code...$(NC)"
	npx prettier --write "**/*.{ts,tsx,js,jsx,json,md,yml,yaml}"
	@echo "$(GREEN)✅ Code formatted$(NC)"

## type-check: TypeScript type checking
type-check:
	@echo "$(GREEN)Type checking...$(NC)"
	cd backend && npm run build --noEmit
	cd frontend/web && npm run build --noEmit
	@echo "$(GREEN)✅ Type check passed$(NC)"

## build: Build all applications
build:
	@echo "$(GREEN)Building all applications...$(NC)"
	npx turbo run build
	@echo "$(GREEN)✅ Build complete$(NC)"

## build-backend: Build backend only
build-backend:
	@echo "$(GREEN)Building backend...$(NC)"
	cd backend && npm run build
	@echo "$(GREEN)✅ Backend built$(NC)"

## build-web: Build web frontend only
build-web:
	@echo "$(GREEN)Building web frontend...$(NC)"
	cd frontend/web && npm run build
	@echo "$(GREEN)✅ Web frontend built$(NC)"

## deploy-dev: Deploy to development environment
deploy-dev:
	@echo "$(GREEN)Deploying to development...$(NC)"
	./scripts/deploy/deploy-dev.sh

## deploy-staging: Deploy to staging environment
deploy-staging:
	@echo "$(GREEN)Deploying to staging...$(NC)"
	./scripts/deploy/deploy-staging.sh

## clean: Clean build artifacts
clean:
	@echo "$(YELLOW)Cleaning build artifacts...$(NC)"
	rm -rf backend/dist backend/node_modules
	rm -rf frontend/web/.next frontend/web/node_modules
	rm -rf frontend/mobile/node_modules
	rm -rf node_modules
	@echo "$(GREEN)✅ Clean complete$(NC)"

## logs: View application logs
logs:
	@echo "$(GREEN)Viewing logs...$(NC)"
	docker-compose logs -f backend

## health: Check health of all services
health:
	@echo "$(GREEN)Checking service health...$(NC)"
	@echo "Backend API:"
	@curl -s http://localhost:3000/api/v1/health | jq . || echo "$(RED)Backend not responding$(NC)"
	@echo ""
	@echo "PostgreSQL:"
	@docker exec nivesh-postgres pg_isready -U nivesh_user && echo "$(GREEN)✅ Healthy$(NC)" || echo "$(RED)❌ Unhealthy$(NC)"
	@echo ""
	@echo "Neo4j:"
	@curl -s http://localhost:7474 > /dev/null && echo "$(GREEN)✅ Healthy$(NC)" || echo "$(RED)❌ Unhealthy$(NC)"
	@echo ""
	@echo "MongoDB:"
	@docker exec nivesh-mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null && echo "$(GREEN)✅ Healthy$(NC)" || echo "$(RED)❌ Unhealthy$(NC)"
	@echo ""
	@echo "Redis:"
	@docker exec nivesh-redis redis-cli ping > /dev/null && echo "$(GREEN)✅ Healthy$(NC)" || echo "$(RED)❌ Unhealthy$(NC)"
	@echo ""
	@echo "Kafka:"
	@docker exec nivesh-kafka kafka-broker-api-versions --bootstrap-server localhost:9092 > /dev/null 2>&1 && echo "$(GREEN)✅ Healthy$(NC)" || echo "$(RED)❌ Unhealthy$(NC)"

# Default target
.DEFAULT_GOAL := help
