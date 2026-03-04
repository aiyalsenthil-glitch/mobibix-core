#!/bin/bash

# ==========================================
# Supabase Postgres Backup Script Instructions
# ==========================================

echo "🚀 To create a daily compressed pg_dump file natively:"
echo ""
echo "Because local 'pg_dump' binaries are not installed on this server, "
echo "you must use the official Supabase CLI (if authenticated) or run pg_dump via Docker:"
echo ""
echo "Option 1: Using Docker (Recommended Context-Free Method)"
echo 'docker run --rm -v $(pwd)/backups:/backups postgres:15 pg_dump "$DATABASE_URL" --no-owner --no-acl --clean -Z 9 > ./backups/db_backup_$(date +"%Y-%m-%d").sql.gz'
echo ""
echo "Option 2: Install postgresql-client"
echo "sudo apt-get install -y postgresql-client-common postgresql-client"
echo "Then re-run standard pg_dump commands."
echo ""
echo "For an automated cron job, place the docker command inside 'crontab -e'."
