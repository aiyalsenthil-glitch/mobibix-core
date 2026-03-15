# Docker Setup for Mobibix

## Prerequisites

1. **Install Docker Desktop** (Windows): https://docs.docker.com/desktop/install/windows-install/
2. **VS Code Extension**: Install "Docker" extension by Microsoft

## Quick Start

### 1. Initial Setup

```bash
# Copy environment template
copy .env.example .env

# Edit .env and fill in your Firebase config
# You can find these in Firebase Console → Project Settings
```

### 2. Place Firebase Service Account

```bash
# Place your Firebase service account JSON in:
apps/backend/secrets/REMOVED_AUTH_PROVIDER-service-account.json

# Make sure this file exists before starting containers
```

### 3. Start All Services

```bash
# Start everything (first run will build images ~5-10 min)
docker-compose up

# Or run in background (detached mode)
docker-compose up -d

# Watch logs
docker-compose logs -f
```

### 4. Run Database Migrations

```bash
# After containers are running, apply Prisma migrations
docker-compose exec backend npx prisma migrate deploy

# Or generate Prisma Client if needed
docker-compose exec backend npx prisma generate
```

### 5. Access Your Applications

- **Frontend (Mobibix Web)**: http://localhost_REPLACED:3001
- **Backend API**: http://localhost_REPLACED:3000
- **PostgreSQL**: localhost_REPLACED:5432
- **PgBouncer (pooled)**: localhost_REPLACED:6432

## Common Commands

```bash
# Stop all containers
docker-compose down

# Stop and remove volumes (⚠️ deletes database data)
docker-compose down -v

# Rebuild containers after code changes
docker-compose build

# Rebuild and restart specific service
docker-compose up --build backend

# View logs for specific service
docker-compose logs -f backend
docker-compose logs -f mobibix-web

# Execute commands in running container
docker-compose exec backend npm run test
docker-compose exec backend npx prisma studio

# Restart a service
docker-compose restart backend

# View running containers
docker-compose ps

# Shell into container
docker-compose exec backend sh
docker-compose exec postgres psql -U postgres -d mobibix
```

## Development Workflow

### Hot Reload is Enabled ✅

Both backend and frontend support hot-reload:

- **Backend**: Edit files in `apps/backend/src/` → auto-restarts
- **Frontend**: Edit files in `apps/mobibix-web/` → auto-reloads

### Database Management

```bash
# Run Prisma Studio (database GUI)
docker-compose exec backend npx prisma studio
# Opens at http://localhost_REPLACED:5555

# Create new migration
docker-compose exec backend npx prisma migrate dev --name your_migration_name

# Reset database (dev only!)
docker-compose exec backend npx prisma migrate reset

# Check migration status
docker-compose exec backend npx prisma migrate status

# Seed database
docker-compose exec backend npm run seed
```

### Debugging

1. **Backend debugger** is exposed on port 9229
2. In VS Code:
   - Open Command Palette (Ctrl+Shift+P)
   - "Debug: Attach to Node Process"
   - Select the backend container

Or add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "attach",
  "name": "Docker: Attach to Backend",
  "port": 9229,
  "address": "localhost",
  "localRoot": "${workspaceFolder}/apps/backend",
  "remoteRoot": "/app",
  "skipFiles": ["<node_internals>/**"]
}
```

## Production Deployment

### Build Production Images

```bash
# Build production backend
docker build -t mobibix-backend:prod --target production ./apps/backend

# Build production frontend
docker build -t mobibix-web:prod --target production ./apps/mobibix-web
```

### Production docker-compose

Create `docker-compose.prod.yml`:

```yaml
version: "3.8"
services:
  backend:
    build:
      context: ./apps/backend
      target: production
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET}
    # ... other production configs

  mobibix-web:
    build:
      context: ./apps/mobibix-web
      target: production
    environment:
      NODE_ENV: production
    # ... other production configs
```

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs backend

# Check if port is in use
netstat -ano | findstr :3000

# Remove old containers
docker-compose down --remove-orphans
```

### Database connection errors

```bash
# Check if postgres is healthy
docker-compose ps

# Test connection
docker-compose exec backend npx prisma db pull

# Check environment variables
docker-compose exec backend env | grep DATABASE_URL
```

### Hot reload not working

```bash
# Restart the service
docker-compose restart backend

# Check volume mounts
docker-compose exec backend ls -la /app/src
```

### Firebase authentication issues

1. Verify `GOOGLE_APPLICATION_CREDENTIALS` path in container:

   ```bash
   docker-compose exec backend cat /app/secrets/REMOVED_AUTH_PROVIDER-service-account.json
   ```

2. Check Firebase Admin SDK initialization logs:
   ```bash
   docker-compose logs backend | grep -i REMOVED_AUTH_PROVIDER
   ```

### Out of disk space

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Full cleanup (⚠️ removes everything not running)
docker system prune -a --volumes
```

## VS Code Docker Extension

### Features

1. **Container Explorer**: View/manage containers in sidebar
2. **Right-click actions**:
   - View Logs
   - Attach Shell
   - Restart
   - Stop/Start
3. **Docker Compose**: Right-click `docker-compose.yml` → Compose Up

### Tips

- Right-click container → "Attach Visual Studio Code" to open full VS Code in container
- Use "Docker: Logs" command for cleaner log viewing
- Enable Docker context menu in Explorer for Dockerfiles

## Architecture

```
┌─────────────────┐
│  Mobibix Web    │  Port 3001 (Next.js)
│  (Frontend)     │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Backend API    │  Port 3000 (NestJS)
│  (NestJS)       │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  PgBouncer      │  Port 6432 (Connection Pooler)
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  PostgreSQL     │  Port 5432 (Database)
└─────────────────┘
```

## Environment Variables Reference

### Backend Container

- `DATABASE_URL`: Prisma connection string (via PgBouncer)
- `JWT_SECRET`: JWT signing secret
- `JWT_EXPIRES_IN`: Token expiration (default: "7d")
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to Firebase service account JSON
- `PORT`: API port (default: 3000)
- `NODE_ENV`: Environment (development/production)

### Frontend Container

- `NEXT_PUBLIC_API_URL`: Backend API URL
- `NEXT_PUBLIC_FIREBASE_*`: Firebase client config
- `NODE_ENV`: Environment

## Next Steps

1. Set up CI/CD pipeline (GitHub Actions with Docker)
2. Configure production database (managed PostgreSQL)
3. Add Redis for caching (optional)
4. Set up monitoring (Prometheus/Grafana)
5. Configure backup strategy for postgres volume
