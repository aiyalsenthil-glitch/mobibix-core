#!/bin/bash

# ==============================================================================
# Supabase Local Backup Script
# Description: Dumps the PostgreSQL database from Supabase and stores it locally.
# Requirements: postgresql-client (sudo apt install postgresql-client)
# Usage: ./backup-db.sh
# ==============================================================================

# Configuration
BACKUP_DIR="/home/aiyal/Documents/gym-saas/apps/backend/db_backups"
KEEP_DAYS=7
ENV_FILE="/home/aiyal/Documents/gym-saas/apps/backend/.env"

# Load environment variables
if [ -f "$ENV_FILE" ]; then
  # Try DIRECT_URL first (better for maintenance), fall back to DATABASE_URL
  DB_URL=$(grep '^DIRECT_URL=' "$ENV_FILE" | cut -d '=' -f2-)
  if [ -z "$DB_URL" ]; then
    DB_URL=$(grep '^DATABASE_URL=' "$ENV_FILE" | cut -d '=' -f2-)
  fi
  
  # Remove potential quotes or whitespace
  DB_URL=$(echo $DB_URL | sed "s/^'//;s/'$//;s/^\"//;s/\"$//;s/[[:space:]]//g")
else
  echo "❌ Error: .env file not found at $ENV_FILE"
  exit 1
fi

if [ -z "$DB_URL" ]; then
  echo "❌ Error: Could not find database connection string in .env"
  exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Timestamp for the filename
TIMESTAMP=$(date +"%Y%m%d_%H%M")
FILENAME="supabase_backup_$TIMESTAMP.sql"
FULL_PATH="$BACKUP_DIR/$FILENAME"

echo "----------------------------------------------------"
echo "📅 Date: $(date)"
echo "🚀 Starting backup from Supabase..."

# Run pg_dump
# -v: verbose output
# --clean: include DROP TABLE statements
# --if-exists: used with --clean
if command -v pg_dump >/dev/null 2>&1; then
  pg_dump "$DB_URL" --clean --if-exists > "$FULL_PATH"
else
  echo "❌ Error: pg_dump not found. Please install postgresql-client:"
  echo "   sudo apt update && sudo apt install postgresql-client-common postgresql-client"
  exit 1
fi

if [ $? -eq 0 ]; then
  echo "✅ SQL Dump completed: $FILENAME"
  
  # Compress the backup
  gzip -f "$FULL_PATH"
  echo "📦 Compressed: ${FILENAME}.gz"
  
  # Set permissions (only user can read)
  chmod 600 "${FULL_PATH}.gz"
  
  # Cleanup old backups
  echo "🧹 Removing backups older than $KEEP_DAYS days..."
  find "$BACKUP_DIR" -type f -name "supabase_backup_*.sql.gz" -mtime +$KEEP_DAYS -delete
  
  echo "✨ Backup job finished successfully."
  echo "📍 Location: $BACKUP_DIR"
else
  echo "❌ Error: pg_dump failed. Check your connection/credentials."
  # Remove failed file if it exists
  [ -f "$FULL_PATH" ] && rm "$FULL_PATH"
  exit 1
fi
echo "----------------------------------------------------"
