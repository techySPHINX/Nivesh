# Nivesh - Complete Setup Guide

This guide will help you set up and run the Nivesh AI Financial Strategist platform on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 20.x or higher ([Download](https://nodejs.org/))
- **pnpm** 10.x or higher (`npm install -g pnpm`)
- **Docker** and **Docker Compose** ([Download](https://www.docker.com/))
- **Firebase Account** for authentication
- **Git** for version control

## Step 1: Clone the Repository

```bash
git clone <repository-url>
cd Nivesh
```

## Step 2: Set Up Infrastructure (Docker)

Start all required services using Docker Compose:

```bash
# Start all services in detached mode
docker-compose up -d

# Verify all services are running
docker-compose ps

# View logs if needed
docker-compose logs -f
```

This will start:
- PostgreSQL (Port 5432)
- Neo4j (Ports 7474, 7687)
- MongoDB (Port 27017)
- Redis (Port 6379)
- ClickHouse (Ports 8123, 9000)
- Kafka + Zookeeper (Port 9092)
- Qdrant (Ports 6333, 6334)
- Prometheus (Port 9090)

## Step 3: Backend Setup

### 3.1 Install Dependencies

```bash
cd backend
pnpm install
```

### 3.2 Configure Environment Variables

Create a `.env` file in the `backend` directory:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DATABASE_URL="postgresql://nivesh_user:nivesh_password@localhost:5432/nivesh_db"

# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=nivesh_neo4j_password

# MongoDB
MONGODB_URI=mongodb://nivesh:nivesh_mongo_password@localhost:27017/nivesh_chat?authSource=admin

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=nivesh_redis_password

# ClickHouse
CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=8123
CLICKHOUSE_DATABASE=nivesh_analytics
CLICKHOUSE_USERNAME=nivesh
CLICKHOUSE_PASSWORD=nivesh_clickhouse_password

# Kafka
KAFKA_BROKERS=localhost:9092

# Qdrant
QDRANT_URL=http://localhost:6333

# Firebase Admin
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="your-private-key"
FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=7d

# Google Gemini API
GEMINI_API_KEY=your-gemini-api-key

# Server
PORT=3000
NODE_ENV=development
```

### 3.3 Set Up Firebase Admin SDK

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Navigate to **Project Settings** > **Service Accounts**
4. Click **Generate New Private Key**
5. Save the JSON file securely
6. Copy the values to your `.env` file

### 3.4 Run Database Migrations

```bash
# Generate Prisma client
pnpm prisma:generate

# Run migrations
pnpm prisma:migrate

# Seed the database with sample data
pnpm prisma:seed
```

### 3.5 Start the Backend Server

```bash
# Development mode with hot reload
pnpm dev

# Production build
pnpm build
pnpm start:prod
```

The backend API will be available at `http://localhost:3000`

## Step 4: Frontend Setup

### 4.1 Install Dependencies

```bash
cd frontend
pnpm install
```

### 4.2 Configure Environment Variables

Create a `.env.local` file in the `frontend` directory:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Firebase configuration:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=http://localhost:3000

# Environment
NEXT_PUBLIC_ENV=development
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false
```

### 4.3 Get Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Project Settings** > **General**
4. Scroll to **Your apps** section
5. Click on the web app icon (</>) or add a new web app
6. Copy the Firebase configuration values to `.env.local`

### 4.4 Enable Firebase Authentication

1. In Firebase Console, go to **Authentication**
2. Click **Get Started**
3. Enable the following sign-in methods:
   - **Email/Password**
   - **Google** (configure OAuth consent screen)

### 4.5 Start the Frontend Server

```bash
# Development mode
pnpm dev
```

The frontend will be available at `http://localhost:3001`

## Step 5: Verify the Setup

### Backend Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-14T...",
  "uptime": 1234.56
}
```

### Frontend Access

1. Open `http://localhost:3001` in your browser
2. You should see the login page
3. Click **Sign Up** to create a new account
4. After signing up, you'll be redirected to the dashboard

### Database Verification

Check if the database has been seeded:

```bash
cd backend
pnpm prisma:studio
```

This opens Prisma Studio at `http://localhost:5555` where you can browse the database.

## Step 6: Test Key Features

### Test User Authentication
- Sign up with a new email
- Login with your credentials
- Try Google OAuth login
- Test password reset

### Test Dashboard
- View Net Worth card
- Check Goals progress
- Review Budget tracking
- See Recent transactions

### Test AI Chat
- Navigate to AI Assistant page
- Send a message
- Verify WebSocket connection (green indicator)
- Test streaming responses

## Troubleshooting

### Docker Services Not Starting

```bash
# Stop all containers
docker-compose down

# Remove volumes and restart
docker-compose down -v
docker-compose up -d
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# View PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### Prisma Migration Errors

```bash
# Reset the database
pnpm prisma:migrate reset

# Generate Prisma client
pnpm prisma:generate

# Run migrations again
pnpm prisma:migrate dev
```

### Frontend Build Errors

```bash
# Clean node_modules and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Clear Next.js cache
rm -rf .next
```

### Port Already in Use

If you see "Port already in use" errors:

```bash
# For backend (Port 3000)
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9

# For frontend (Port 3001)
lsof -ti:3001 | xargs kill -9
```

### Firebase Authentication Errors

1. Verify Firebase credentials in `.env` and `.env.local`
2. Check Firebase Console for enabled auth methods
3. Ensure OAuth redirect URIs are configured
4. Check browser console for detailed error messages

## Development Workflow

### Running Tests

```bash
# Backend unit tests
cd backend
pnpm test

# Backend e2e tests
pnpm test:e2e

# Frontend tests (if configured)
cd frontend
pnpm test
```

### Code Formatting

```bash
# Backend
cd backend
pnpm format

# Frontend
cd frontend
pnpm format
```

### Database Management

```bash
# Create a new migration
pnpm prisma:migrate dev --name migration_name

# Reset database
pnpm prisma:migrate reset

# Open Prisma Studio
pnpm prisma:studio
```

## Production Deployment

### Environment Variables

Ensure all production environment variables are set:
- Use strong passwords for all services
- Use production Firebase project
- Enable SSL/TLS for all connections
- Set JWT_SECRET to a strong random value
- Configure CORS properly

### Build Commands

```bash
# Backend
cd backend
pnpm build

# Frontend
cd frontend
pnpm build
```

### Docker Production Setup

```bash
# Use production docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

## Additional Resources

- [Backend Documentation](./backend/README.md)
- [Frontend Documentation](./frontend/README.md)
- [API Documentation](./docs/API_REFERENCE.md)
- [Architecture Guide](./docs/BACKEND_ARCHITECTURE.md)
- [Contributing Guidelines](./CONTRIBUTING.md)

## Getting Help

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review the logs: `docker-compose logs -f`
3. Search existing GitHub issues
4. Create a new issue with:
   - Your environment details
   - Error messages
   - Steps to reproduce

## Next Steps

After successfully setting up the platform:

1. Explore the [Implementation Plan](./IMPLEMENTATION_PLAN.md)
2. Review the [TODO List](./TODO.md) for upcoming features
3. Check [Contributing Guidelines](./CONTRIBUTING.md) to contribute
4. Read the [LLM Integration Guide](./backend/LLM_INTEGRATION_GUIDE.md)

---

**Happy Coding! 🚀**
