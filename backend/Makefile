.DEFAULT_GOAL := help

# Colors for terminal output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

##@ Help
.PHONY: help
help: ## Display this help message
	@echo "$(BLUE)Nivesh Backend - Development Commands$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make $(GREEN)<target>$(NC)\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(BLUE)%s$(NC)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Development
.PHONY: install
install: ## Install dependencies
	@echo "$(BLUE)Installing dependencies...$(NC)"
	pnpm install
	@echo "$(GREEN)✓ Dependencies installed$(NC)"

.PHONY: dev
dev: ## Start development server
	@echo "$(BLUE)Starting development server...$(NC)"
	pnpm run dev

.PHONY: build
build: ## Build the application
	@echo "$(BLUE)Building application...$(NC)"
	pnpm run build
	@echo "$(GREEN)✓ Build complete$(NC)"

.PHONY: start
start: ## Start production server
	@echo "$(BLUE)Starting production server...$(NC)"
	pnpm run start:prod

.PHONY: clean
clean: ## Clean build artifacts
	@echo "$(YELLOW)Cleaning build artifacts...$(NC)"
	rm -rf dist node_modules .turbo
	@echo "$(GREEN)✓ Clean complete$(NC)"

##@ Database
.PHONY: db-generate
db-generate: ## Generate Prisma client
	@echo "$(BLUE)Generating Prisma client...$(NC)"
	pnpm run prisma:generate
	@echo "$(GREEN)✓ Prisma client generated$(NC)"

.PHONY: db-migrate
db-migrate: ## Run database migrations
	@echo "$(BLUE)Running database migrations...$(NC)"
	pnpm run prisma:migrate
	@echo "$(GREEN)✓ Migrations complete$(NC)"

.PHONY: db-studio
db-studio: ## Open Prisma Studio
	@echo "$(BLUE)Opening Prisma Studio...$(NC)"
	pnpm run prisma:studio

.PHONY: db-seed
db-seed: ## Seed database with test data
	@echo "$(BLUE)Seeding database...$(NC)"
	pnpm run prisma:seed
	@echo "$(GREEN)✓ Database seeded$(NC)"

.PHONY: db-reset
db-reset: ## Reset database (⚠️  WARNING: Deletes all data)
	@echo "$(RED)⚠️  WARNING: This will delete all data$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		pnpm prisma migrate reset --force; \
		echo "$(GREEN)✓ Database reset complete$(NC)"; \
	fi

##@ Docker
.PHONY: docker-up
docker-up: ## Start all Docker services
	@echo "$(BLUE)Starting Docker services...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)✓ Docker services started$(NC)"

.PHONY: docker-down
docker-down: ## Stop all Docker services
	@echo "$(YELLOW)Stopping Docker services...$(NC)"
	docker-compose down
	@echo "$(GREEN)✓ Docker services stopped$(NC)"

.PHONY: docker-logs
docker-logs: ## View Docker logs
	docker-compose logs -f

.PHONY: docker-ps
docker-ps: ## List running Docker containers
	docker-compose ps

.PHONY: docker-rebuild
docker-rebuild: ## Rebuild Docker images
	@echo "$(BLUE)Rebuilding Docker images...$(NC)"
	docker-compose build --no-cache
	@echo "$(GREEN)✓ Docker images rebuilt$(NC)"

##@ Testing
.PHONY: test
test: ## Run unit tests
	@echo "$(BLUE)Running unit tests...$(NC)"
	pnpm run test

.PHONY: test-watch
test-watch: ## Run tests in watch mode
	pnpm run test:watch

.PHONY: test-cov
test-cov: ## Run tests with coverage
	@echo "$(BLUE)Running tests with coverage...$(NC)"
	pnpm run test:cov
	@echo "$(GREEN)✓ Coverage report generated$(NC)"

.PHONY: test-e2e
test-e2e: ## Run end-to-end tests
	@echo "$(BLUE)Running e2e tests...$(NC)"
	pnpm run test:e2e

##@ Code Quality
.PHONY: lint
lint: ## Run linter
	@echo "$(BLUE)Running linter...$(NC)"
	pnpm run lint

.PHONY: lint-fix
lint-fix: ## Fix linting issues
	@echo "$(BLUE)Fixing linting issues...$(NC)"
	pnpm run lint -- --fix
	@echo "$(GREEN)✓ Linting issues fixed$(NC)"

.PHONY: format
format: ## Format code
	@echo "$(BLUE)Formatting code...$(NC)"
	pnpm run format
	@echo "$(GREEN)✓ Code formatted$(NC)"

.PHONY: type-check
type-check: ## Run TypeScript type checking
	@echo "$(BLUE)Type checking...$(NC)"
	pnpm run build --noEmit
	@echo "$(GREEN)✓ Type check passed$(NC)"

##@ Infrastructure
.PHONY: infra-up
infra-up: docker-up db-generate ## Start infrastructure and generate Prisma client
	@echo "$(GREEN)✓ Infrastructure ready$(NC)"

.PHONY: infra-down
infra-down: docker-down ## Stop infrastructure
	@echo "$(GREEN)✓ Infrastructure stopped$(NC)"

.PHONY: health-check
health-check: ## Check health of all services
	@echo "$(BLUE)Checking service health...$(NC)"
	@curl -s http://localhost:3000/api/v1/health/detailed | json_pp || echo "$(RED)Services not responding$(NC)"

##@ Setup
.PHONY: setup
setup: install docker-up db-generate db-migrate ## Complete initial setup
	@echo "$(GREEN)========================================$(NC)"
	@echo "$(GREEN)✓ Setup complete!$(NC)"
	@echo "$(GREEN)========================================$(NC)"
	@echo ""
	@echo "$(BLUE)Next steps:$(NC)"
	@echo "  1. Copy .env.example to .env and configure"
	@echo "  2. Run 'make dev' to start development server"
	@echo "  3. Visit http://localhost:3000/api/docs for API documentation"

.PHONY: reset
reset: docker-down clean ## Complete reset (⚠️  WARNING: Deletes everything)
	@echo "$(YELLOW)⚠️  WARNING: This will delete all data and dependencies$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		make setup; \
		echo "$(GREEN)✓ Reset complete$(NC)"; \
	fi

##@ Monitoring
.PHONY: logs
logs: ## View application logs
	@echo "$(BLUE)Viewing application logs...$(NC)"
	tail -f logs/combined.log

.PHONY: logs-error
logs-error: ## View error logs
	@echo "$(RED)Viewing error logs...$(NC)"
	tail -f logs/error.log
