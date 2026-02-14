# Nivesh - Active TODO Checklist

> **Current Sprint Focus:** MVP Phase 1 - Foundation & Frontend Launch Prep

**Last Updated:** February 14, 2026  
**Sprint:** Week 1-4 (Feb 14 - Mar 14, 2026)  
**Current Phase:** MVP Completion (40% → 70% target)

---

## 🚨 CRITICAL PATH - Week 1 (Feb 14-21)

### Priority P0 - Must Complete This Week

#### Backend: Database & Environment Setup
- [ ] **Run pending database migrations**
  - [ ] Execute: `cd backend && pnpm prisma migrate dev --name llm_integration`
  - [ ] Execute: `cd backend && pnpm prisma migrate dev --name rag_pipeline_tracking`
  - [ ] Verify all tables created successfully
  - [ ] Run `pnpm prisma studio` to inspect schema

- [ ] **Environment Configuration Cleanup**
  - [ ] Create `.env.example` in backend with all required variables
  - [ ] Document required API keys (GEMINI_API_KEY, DATABASE_URL, etc.)
  - [ ] Create `.env.example` for ml-services folder
  - [ ] Add `.env` files to `.gitignore` if not already

- [ ] **API Documentation**
  - [ ] Test all existing endpoints with Postman/Thunder Client
  - [ ] Verify Swagger docs are accessible at `/api/docs`
  - [ ] Fix any broken endpoints discovered during testing

#### Frontend: Project Initialization
- [ ] **Create Next.js Web App Project**
  - [ ] Create `frontend/` directory in root
  - [ ] Run: `npx create-next-app@latest frontend --typescript --tailwind --app --eslint`
  - [ ] Configure `next.config.js` for backend API proxy
  - [ ] Set up environment variables (.env.local)
  - [ ] Install additional dependencies: axios, socket.io-client, recharts, @radix-ui/react-*

- [ ] **Set Up Project Structure**
  ```
  frontend/
  ├── src/
  │   ├── app/              # Next.js 14 App Router
  │   │   ├── (auth)/
  │   │   ├── (dashboard)/
  │   │   └── layout.tsx
  │   ├── components/       # Reusable components
  │   │   ├── ui/          # shadcn/ui components
  │   │   ├── chat/
  │   │   ├── goals/
  │   │   └── simulations/
  │   ├── lib/             # Utilities
  │   │   ├── api.ts       # API client
  │   │   ├── auth.ts      # Firebase auth
  │   │   └── types.ts     # TypeScript types
  │   └── hooks/           # Custom React hooks
  ```
  - [ ] Create folder structure above
  - [ ] Initialize Git in frontend folder
  - [ ] Create frontend/README.md with setup instructions

- [ ] **Firebase Setup**
  - [ ] Create Firebase project at console.firebase.google.com
  - [ ] Enable Authentication (Email/Password + Google OAuth)
  - [ ] Copy Firebase config to `.env.local`
  - [ ] Install: `pnpm add firebase`
  - [ ] Create `lib/firebase.ts` initialization file

---

## 📋 Week 2 (Feb 21-28) - Frontend Core Components

### Priority P0

#### Authentication Flow
- [ ] **Create auth context & provider**
  - [ ] File: `src/contexts/AuthContext.tsx`
  - [ ] Implement `useAuth()` hook
  - [ ] Handle login, signup, logout, session persistence

- [ ] **Build auth pages**
  - [ ] `app/(auth)/login/page.tsx` - Email/password login
  - [ ] `app/(auth)/signup/page.tsx` - Registration form
  - [ ] `app/(auth)/forgot-password/page.tsx` - Password reset
  - [ ] Add form validation with react-hook-form + zod

- [ ] **Protected route wrapper**
  - [ ] Create `middleware.ts` for route protection
  - [ ] Redirect unauthenticated users to /login
  - [ ] Store return URL for post-login redirect

#### UI Component Library Setup
- [ ] **Install shadcn/ui**
  - [ ] Run: `npx shadcn-ui@latest init`
  - [ ] Install components: button, card, input, select, dialog, dropdown-menu
  - [ ] Create design tokens in `tailwind.config.ts`
  - [ ] Set up dark mode toggle

- [ ] **Create shared components**
  - [ ] `components/ui/LoadingSpinner.tsx`
  - [ ] `components/ui/ErrorBoundary.tsx`
  - [ ] `components/ui/Toast.tsx` (notifications)
  - [ ] `components/ui/Modal.tsx`
  - [ ] `components/layout/Navbar.tsx`
  - [ ] `components/layout/Sidebar.tsx`

---

## 📋 Week 3 (Feb 28 - Mar 7) - Dashboard & Chat

### Priority P0

#### Dashboard Implementation
- [ ] **Create dashboard layout**
  - [ ] `app/(dashboard)/dashboard/page.tsx`
  - [ ] Responsive grid layout (mobile, tablet, desktop)
  - [ ] Navigation sidebar with icons

- [ ] **Build dashboard widgets**
  - [ ] `components/dashboard/NetWorthCard.tsx`
    - [ ] Fetch from `/api/v1/users/me` endpoint
    - [ ] Display total assets, liabilities, net worth
    - [ ] Show percentage change from last month
  
  - [ ] `components/dashboard/GoalProgressWidget.tsx`
    - [ ] Fetch from `/api/v1/goals` endpoint
    - [ ] Display top 3 active goals with progress bars
    - [ ] Link to full goals page
  
  - [ ] `components/dashboard/RecentTransactions.tsx`
    - [ ] Fetch from `/api/v1/transactions?limit=5`
    - [ ] Display last 5 transactions
    - [ ] Category icons and color coding
  
  - [ ] `components/dashboard/QuickActions.tsx`
    - [ ] Button: "Add Transaction"
    - [ ] Button: "Create Goal"
    - [ ] Button: "Run Simulation"
    - [ ] Button: "Chat with AI"

- [ ] **API Integration Layer**
  - [ ] Create `lib/api/client.ts` with axios instance
  - [ ] Add request interceptor for auth token
  - [ ] Add response interceptor for error handling
  - [ ] Create API type definitions from backend DTOs
  - [ ] Implement retry logic for failed requests

#### Chat Interface
- [ ] **Build chat UI**
  - [ ] `app/(dashboard)/chat/page.tsx`
  - [ ] `components/chat/ChatContainer.tsx`
  - [ ] `components/chat/MessageList.tsx`
  - [ ] `components/chat/MessageBubble.tsx`
  - [ ] `components/chat/ChatInput.tsx` with auto-resize textarea
  - [ ] `components/chat/SuggestionChips.tsx`

- [ ] **WebSocket Integration**
  - [ ] Create `lib/websocket.ts` socket manager
  - [ ] Connect to `/ai-chat` namespace
  - [ ] Handle connection lifecycle (connect, disconnect, reconnect)
  - [ ] Emit `query` events, listen for `response_chunk`
  - [ ] Implement typing indicator
  - [ ] Handle errors gracefully

- [ ] **Message Rendering**
  - [ ] Text message rendering with markdown
  - [ ] Code block syntax highlighting
  - [ ] Chart rendering (pass data to Recharts)
  - [ ] Action buttons in messages
  - [ ] Citation display with links
  - [ ] Timestamp formatting

---

## 📋 Week 4 (Mar 7-14) - Simulations & Goals

### Priority P0

#### Simulation Interface
- [ ] **Create simulation pages**
  - [ ] `app/(dashboard)/simulations/page.tsx` - List of all simulators
  - [ ] `app/(dashboard)/simulations/emi/page.tsx`
  - [ ] `app/(dashboard)/simulations/retirement/page.tsx`
  - [ ] `app/(dashboard)/simulations/sip/page.tsx`
  - [ ] `app/(dashboard)/simulations/home-loan/page.tsx`

- [ ] **Build EMI Calculator**
  - [ ] `components/simulations/EMICalculator.tsx`
  - [ ] Input sliders: Loan Amount, Interest Rate, Tenure
  - [ ] Real-time calculation display
  - [ ] Call backend API: `POST /api/v1/ai/functions` with `calculate_emi`
  - [ ] Chart: EMI breakdown (principal vs interest over time)
  - [ ] Export results button (download as PDF)

- [ ] **Build Retirement Planner**
  - [ ] `components/simulations/RetirementPlanner.tsx`
  - [ ] Inputs: Current age, retirement age, current savings, monthly SIP
  - [ ] Inflation rate slider
  - [ ] Expected return rate slider
  - [ ] Display: Projected corpus at retirement
  - [ ] Visual: Growth chart with 3 scenarios (conservative/moderate/aggressive)

#### Goal Management UI
- [ ] **Goals list page**
  - [ ] `app/(dashboard)/goals/page.tsx`
  - [ ] Fetch from `/api/v1/goals`
  - [ ] Display goal cards in grid
  - [ ] Filter by status (active, completed, paused)
  - [ ] Sort by priority, target date

- [ ] **Goal creation wizard**
  - [ ] `app/(dashboard)/goals/new/page.tsx`
  - [ ] Multi-step form (Goal Details → Amount & Timeline → Review)
  - [ ] Goal category selection with icons
  - [ ] Target amount input with currency formatting
  - [ ] Date picker for start and target dates
  - [ ] Submit to `POST /api/v1/goals`

- [ ] **Goal detail page**
  - [ ] `app/(dashboard)/goals/[id]/page.tsx`
  - [ ] Fetch from `/api/v1/goals/:id`
  - [ ] Display progress chart
  - [ ] Show milestones timeline
  - [ ] Contribution history table
  - [ ] Add contribution button
  - [ ] Edit/delete goal actions

---

## 🏗️ Backend Modules - Parallel Track

### Week 1-2: Budget Management Module

- [ ] **Domain Layer**
  - [ ] Create `src/modules/budget-management/domain/entities/budget.entity.ts`
    - [ ] Properties: userId, category, amount, period, startDate, endDate
    - [ ] Business logic: isExceeded(), remainingAmount(), percentageUsed()
  
  - [ ] Create `src/modules/budget-management/domain/value-objects/`
    - [ ] `budget-category.vo.ts` (FOOD, TRANSPORT, ENTERTAINMENT, etc.)
    - [ ] `budget-period.vo.ts` (DAILY, WEEKLY, MONTHLY, YEARLY)
    - [ ] `budget-amount.vo.ts` with currency validation

  - [ ] Create `src/modules/budget-management/domain/repositories/budget.repository.interface.ts`
    - [ ] findById(id)
    - [ ] findByUserId(userId)
    - [ ] findActiveByUserAndPeriod(userId, period)
    - [ ] save(budget)
    - [ ] delete(id)

- [ ] **Application Layer**
  - [ ] Create commands:
    - [ ] `application/commands/create-budget.command.ts`
    - [ ] `application/commands/handlers/create-budget.handler.ts`
    - [ ] `application/commands/update-budget.command.ts`
    - [ ] `application/commands/handlers/update-budget.handler.ts`
  
  - [ ] Create queries:
    - [ ] `application/queries/get-budget.query.ts`
    - [ ] `application/queries/get-budget-spending.query.ts`
    - [ ] `application/queries/handlers/budget.query-handlers.ts`
  
  - [ ] Create DTOs:
    - [ ] `application/dto/create-budget.dto.ts`
    - [ ] `application/dto/update-budget.dto.ts`
    - [ ] `application/dto/budget-response.dto.ts`

- [ ] **Infrastructure Layer**
  - [ ] Create `infrastructure/persistence/budget.repository.ts`
    - [ ] Implement BudgetRepositoryInterface
    - [ ] Use Prisma for database operations
    - [ ] Map domain entities to Prisma models

- [ ] **Presentation Layer**
  - [ ] Create `presentation/budget.controller.ts`
    - [ ] POST /budgets - Create budget
    - [ ] GET /budgets - List user budgets
    - [ ] GET /budgets/:id - Get budget details
    - [ ] GET /budgets/:id/spending - Get current spending
    - [ ] PATCH /budgets/:id - Update budget
    - [ ] DELETE /budgets/:id - Delete budget

- [ ] **Database Schema**
  - [ ] Add to `prisma/schema.prisma`:
    ```prisma
    model Budget {
      id          String   @id @default(uuid())
      userId      String
      user        User     @relation(fields: [userId], references: [id])
      category    String
      amount      Decimal  @db.Decimal(15, 2)
      period      String   // DAILY, WEEKLY, MONTHLY, YEARLY
      startDate   DateTime
      endDate     DateTime
      isActive    Boolean  @default(true)
      createdAt   DateTime @default(now())
      updatedAt   DateTime @updatedAt
      
      @@map("budgets")
      @@index([userId, period, isActive])
    }
    ```
  - [ ] Run migration: `pnpm prisma migrate dev --name add_budget_module`

- [ ] **Event Integration**
  - [ ] Listen to TransactionCreatedEvent
  - [ ] Check if transaction exceeds any active budget
  - [ ] Publish BudgetExceededEvent if threshold crossed
  - [ ] Connect to Alert module for notifications

### Week 2-3: Simulation Engine Enhancement

- [ ] **Complete existing calculators**
  - [ ] Enhance `calculate_emi` function
    - [ ] Add amortization schedule calculation
    - [ ] Include total interest payable
    - [ ] Prepayment impact calculation
  
  - [ ] Complete `calculate_compound_interest`
    - [ ] Support different compounding frequencies
    - [ ] Handle inflation adjustment
    - [ ] Return year-by-year breakdown
  
  - [ ] Complete `calculate_sip_returns`
    - [ ] Support step-up SIP
    - [ ] Include XIRR calculation
    - [ ] Tax-saving instrument comparison

- [ ] **Add new simulation functions**
  - [ ] Create `calculate_retirement_corpus` in function registry
    - [ ] Inputs: current age, retirement age, monthly income, expenses, inflation
    - [ ] Output: Required corpus, monthly SIP needed, coverage percentage
    - [ ] Generate 3 scenarios with different return rates
  
  - [ ] Create `calculate_goal_sip` 
    - [ ] Inputs: target amount, timeline, expected returns
    - [ ] Output: Monthly SIP required, total invested, returns
    - [ ] Include step-up recommendations
  
  - [ ] Create `calculate_home_affordability`
    - [ ] Inputs: monthly income, existing EMIs, down payment
    - [ ] Output: Maximum loan amount, recommended property price
    - [ ] EMI-to-income ratio check (40% max as per RBI)
  
  - [ ] Create `monte_carlo_simulation`
    - [ ] Run 10,000 scenarios with random returns
    - [ ] Calculate percentile outcomes (10th, 25th, 50th, 75th, 90th)
    - [ ] Return probability distribution
    - [ ] Visualize with histogram data

- [ ] **Create simulation endpoints**
  - [ ] POST /api/v1/simulations/emi
  - [ ] POST /api/v1/simulations/retirement
  - [ ] POST /api/v1/simulations/sip
  - [ ] POST /api/v1/simulations/home-loan
  - [ ] POST /api/v1/simulations/monte-carlo

### Week 3-4: Alert & Notification System

- [ ] **Alert Engine Infrastructure**
  - [ ] Create `src/modules/alerts/` module structure
  - [ ] Design alert rule schema
  - [ ] Implement rule matching engine
  - [ ] Create alert priority scoring algorithm

- [ ] **Notification Delivery Service**
  - [ ] Install dependencies: `pnpm add @sendgrid/mail node-cron`
  - [ ] Create email templates with Handlebars
  - [ ] Set up SendGrid account and API key
  - [ ] Implement email sending function
  - [ ] Add email queue with Bull (Redis-backed)

- [ ] **Push Notification Setup**
  - [ ] Set up Firebase Cloud Messaging (FCM)
  - [ ] Create device token registration endpoint
  - [ ] Implement push notification sender
  - [ ] Handle notification click actions

- [ ] **In-App Notification Center**
  - [ ] Create notification model in Prisma
  - [ ] REST endpoints: GET /notifications, PATCH /notifications/:id/read
  - [ ] WebSocket event for real-time push
  - [ ] Unread count badge logic

- [ ] **Implement Alert Types**
  - [ ] Spending spike alert (>20% increase from baseline)
  - [ ] Budget exceeded alert (90% threshold + 100% threshold)
  - [ ] Goal off-track alert (monthly contribution missed)
  - [ ] Bill reminder (3 days before due date)
  - [ ] Unusual merchant alert (first-time merchant with high amount)

---

## 🤖 ML Services - Week 4+

### Transaction Categorization Model (Critical for MVP)

- [ ] **Data Preparation**
  - [ ] Export existing transactions from PostgreSQL
  - [ ] Create labeling interface (simple web form)
  - [ ] Manually label 500+ transactions across categories
  - [ ] Create category mapping file (merchant → category)
  - [ ] Split into train (80%), validation (10%), test (10%)

- [ ] **Model Development**
  - [ ] Set up Jupyter notebook for experimentation
  - [ ] Implement rule-based baseline (regex merchant matching)
  - [ ] Train XGBoost classifier
    - [ ] Features: merchant name, amount, day of week, time
    - [ ] Encode categorical features
    - [ ] Hyperparameter tuning with Optuna (50 trials)
  - [ ] Add BERT embeddings for merchant names
  - [ ] Create ensemble (rule-based + XGBoost + BERT)
  - [ ] Evaluate on test set (target: >90% accuracy)

- [ ] **FastAPI Service**
  - [ ] Create `ml-services/categorization/` folder
  - [ ] Implement `/predict` endpoint
  - [ ] Load model on startup (singleton pattern)
  - [ ] Add batch prediction endpoint `/predict/batch`
  - [ ] Implement feedback endpoint `/feedback` for corrections
  - [ ] Deploy locally with Docker

- [ ] **Backend Integration**
  - [ ] Create HTTP client in backend to ML service
  - [ ] Auto-categorize transactions on creation
  - [ ] Add re-categorization job (cron: daily)
  - [ ] Store prediction confidence score

---

## 🔧 DevOps & Infrastructure

### Week 1-2: Development Environment

- [ ] **Docker Compose Setup**
  - [ ] Create `docker-compose.dev.yml` for all services
  - [ ] Add services: postgres, neo4j, mongodb, redis, kafka, zookeeper, clickhouse, qdrant
  - [ ] Create `make dev-up` command to start all
  - [ ] Create `make dev-down` command to stop all
  - [ ] Add volume mounts for data persistence

- [ ] **Seed Data Scripts**
  - [ ] Create `backend/prisma/seed.ts`
  - [ ] Generate test users (5)
  - [ ] Generate test accounts (10)
  - [ ] Generate test transactions (100)
  - [ ] Generate test goals (10)
  - [ ] Run: `pnpm prisma db seed`

- [ ] **Environment Documentation**
  - [ ] Update SETUP_GUIDE.md with complete setup steps
  - [ ] Create troubleshooting section
  - [ ] Document common errors and solutions

### Week 3-4: CI/CD Pipeline

- [ ] **GitHub Actions Workflows**
  - [ ] Create `.github/workflows/backend-ci.yml`
    - [ ] Run on PR to main
    - [ ] Steps: Install deps, lint, test, build
    - [ ] Upload coverage report
  
  - [ ] Create `.github/workflows/frontend-ci.yml`
    - [ ] Run on PR to main
    - [ ] Steps: Install deps, lint, type check, test, build
  
  - [ ] Create `.github/workflows/security.yml`
    - [ ] Dependabot auto-update
    - [ ] npm audit check
    - [ ] SAST with CodeQL

- [ ] **Deployment Pipeline**
  - [ ] Research hosting options (AWS vs GCP vs Vercel)
  - [ ] Set up staging environment
  - [ ] Configure auto-deploy on merge to main
  - [ ] Set up database backup strategy

---

## 📝 Documentation & Quality

### Ongoing Tasks

- [ ] **API Documentation**
  - [ ] Ensure all endpoints have Swagger decorators
  - [ ] Add request/response examples
  - [ ] Document error codes
  - [ ] Create Postman collection

- [ ] **Code Quality**
  - [ ] Set up ESLint rules for frontend and backend
  - [ ] Configure Prettier for code formatting
  - [ ] Add pre-commit hooks with Husky
  - [ ] Run lint on all existing code and fix issues

- [ ] **Testing**
  - [ ] Write unit tests for Budget module
  - [ ] Write unit tests for Simulation functions
  - [ ] Write E2E tests for critical user flows
  - [ ] Set up test coverage reporting

---

## 📊 Progress Tracking

### Overall MVP Completion

**Backend Modules:**
- [x] User Management (100%)
- [x] Goal Management (100%)
- [x] Financial Data (80%)
- [x] AI Reasoning (75%)
- [x] RAG Pipeline (95%)
- [x] Knowledge Graph (70%)
- [ ] Budget Management (5% → Target: 100%)
- [ ] Simulation Engine (50% → Target: 100%)
- [ ] Alert System (10% → Target: 100%)
- [ ] Notification Service (0% → Target: 100%)

**Frontend:**
- [ ] Web App (0% → Target: 80%)
- [ ] Mobile App (0% → Target: 0% - defer to Phase 2)

**ML Services:**
- [ ] Transaction Categorization (0% → Target: 100%)
- [ ] Anomaly Detection (0% → Target: 60%)

**Infrastructure:**
- [ ] Docker Compose (30% → Target: 100%)
- [ ] CI/CD Pipeline (0% → Target: 80%)
- [ ] Production Deployment (0% → Target: 0% - Week 8+)

---

## 🎯 This Week's Top 5 Priorities

1. **Run pending database migrations** - Unblock all dependent work
2. **Create and configure Next.js frontend project** - Start frontend development
3. **Complete Budget Management module** - Critical MVP feature
4. **Build authentication flow (frontend)** - Needed for all features
5. **Set up Docker Compose for local dev** - Improve dev experience

---

## 📅 Daily Standup Template

**Yesterday:**
- 

**Today:**
- 

**Blockers:**
- 

**Notes:**
- 

---

## 🏆 Completed Milestones

- [x] Backend core infrastructure setup
- [x] Database schema design (polyglot persistence)
- [x] User Management module implementation
- [x] Goal Management module implementation
- [x] AI Reasoning with LLM integration
- [x] RAG Pipeline with semantic search
- [x] Security & authentication framework

---

**Next Review:** February 21, 2026 (End of Week 1)  
**Sprint Goal:** Complete database setup, initialize frontend, finish Budget module  
**Risk Items:** Frontend development capacity, ML model training data availability
