# Self-Hosting Guide

## Prerequisites
- Docker & Docker Compose
- Node.js 20+
- PostgreSQL 15+
- Redis 7+

## Quick Start
1. Copy .env.example to .env
2. Run docker-compose up -d
3. Run npx prisma migrate deploy
4. Access at http://localhost_REPLACED:3000