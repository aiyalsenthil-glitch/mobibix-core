# syntax=docker/dockerfile:1

# ============================================
# Base Stage - Common dependencies
# ============================================
FROM node:20-alpine AS base

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl libc6-compat curl

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# ============================================
# Development Stage - Hot reload support
# ============================================
FROM base AS development

# Install all dependencies (including devDependencies)
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy application source
COPY . .

# Expose ports (app + debugger)
EXPOSE 3000 9229

# Start in development mode with watch
CMD ["npm", "run", "start:dev"]

# ============================================
# Builder Stage - Compile TypeScript
# ============================================
FROM base AS builder

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build the application
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# ============================================
# Production Stage - Minimal runtime image
# ============================================
FROM node:20-alpine AS production

# Install OpenSSL for Prisma runtime
RUN apk add --no-cache openssl curl

WORKDIR /app

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    chown -R nestjs:nodejs /app

USER nestjs

# Expose application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost_REPLACED:3000/health || exit 1

# Start the application
CMD ["node", "dist/src/main.js"]
