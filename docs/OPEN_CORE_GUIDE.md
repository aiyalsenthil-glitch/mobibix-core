# 📦 Self-Hosting Guide: MobiBix Open Core

MobiBix Core is designed to be fully sovereign and offline-capable. This guide will walk you through setting up your production-grade instance.

---

## 🛠 Prerequisites

Ensure your host machine has the following:
- **Docker & Docker Compose**
- **Node.js 20+** (if running without Docker)
- **PostgreSQL 15+**
- **Redis 7+**

---

## 🚀 Two-Minute Setup

### 1. Environment Configuration
Copy the template and configure your secrets:
```bash
cp .env.example .env
```

### 2. Launch Services
```bash
docker-compose up -d
```
This will start:
- `backend`: The NestJS engine
- `web`: The Next.js dashboard
- `db`: PostgreSQL
- `redis`: For background jobs

### 3. Database Migration
```bash
cd apps/backend
npx prisma migrate deploy
npx prisma db seed
```

---

## ☁️ Running Without Cloud Integration

By default, MobiBix Core is a "Dark System" (works 100% offline). 

- **WhatsApp/AI Features**: In the Core version, these modules are stubbed. They will log actions to the backend console but will not perform external network calls.
- **Telemetry**: You can disable system health tracking by setting `MB_TELEMETRY_ENABLED=false` in your `.env`.

---

## 🧩 Troubleshooting

- **Redis Error**: Ensure the Redis port (6379) is not occupied by a local instance.
- **DB Connection**: If using Docker for DB but running backend locally, use `localhost` in `DATABASE_URL`. If both are in Docker, use the service name `db`.

---

© 2026 MobiBix Enterprise.