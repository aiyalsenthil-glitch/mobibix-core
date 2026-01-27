# syntax=docker/dockerfile:1

# ============================================
# Base Stage - Dependencies
# ============================================
FROM node:20-alpine AS base

RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files
COPY package*.json ./

# ============================================
# Development Stage - Hot reload
# ============================================
FROM base AS development

# Install all dependencies
RUN npm ci

# Copy application source
COPY . .

# Expose Next.js dev server port
EXPOSE 3000

# Start in development mode
CMD ["npm", "run", "dev"]

# ============================================
# Builder Stage - Build Next.js app
# ============================================
FROM base AS builder

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build arguments for Firebase config
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID

# Build the application
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ============================================
# Production Stage - Minimal runtime
# ============================================
FROM node:20-alpine AS production

RUN apk add --no-cache libc6-compat curl

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost_REPLACED:3000/api/health || exit 1

CMD ["node", "server.js"]
