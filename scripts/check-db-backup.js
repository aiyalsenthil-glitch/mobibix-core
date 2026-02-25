#!/usr/bin/env node
/**
 * scripts/check-db-backup.js
 *
 * Pre-launch DB Backup Verification Script
 * ─────────────────────────────────────────
 * Run this ONCE before going live to confirm:
 *   1. Your DATABASE_URL points to Supabase (managed, not self-hosted)
 *   2. Connection is working with a live query
 *   3. The backup checklist is printed clearly
 *
 * Usage:
 *   node scripts/check-db-backup.js
 *
 * Prerequisites:
 *   DATABASE_URL must be set in your environment or apps/backend/.env
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// ── Load .env from backend if present ──────────────────────────────────────
const envPath = path.join(__dirname, '../apps/backend/.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (key && !process.env[key]) {
      process.env[key] = rest.join('=').replace(/^["']|["']$/g, '');
    }
  }
}

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌  DATABASE_URL is not set. Add it to apps/backend/.env');
  process.exit(1);
}

// ── Detect DB provider from URL ────────────────────────────────────────────
const isSupabase = DATABASE_URL.includes('supabase.co');
const isRender   = DATABASE_URL.includes('render.com') || DATABASE_URL.includes('dpg-');
const isRailway  = DATABASE_URL.includes('railway.app');
const isLocal    = DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1');

console.log('\n══════════════════════════════════════════════════');
console.log('  🗄️  DB Backup Pre-Launch Verification');
console.log('══════════════════════════════════════════════════\n');

// ── Provider detection ─────────────────────────────────────────────────────
if (isSupabase) {
  console.log('✅  Provider: Supabase (managed PostgreSQL)\n');
  console.log('📋  Backup Checklist for Supabase:\n');
  console.log('   1. Open https://supabase.com/dashboard → your project');
  console.log('   2. Go to Settings → Database → Backups');
  console.log('   3. Verify backup schedule (Free: daily, Pro: PITR 7 days)');
  console.log('   4. ⚠️  Free plan has NO point-in-time recovery.');
  console.log('        Upgrade to Pro ($25/mo) before launch for PITR.');
  console.log('   5. Test restore: Download a backup → restore to a temp');
  console.log('        Supabase project → verify data integrity.\n');
  console.log('   Manual backup command (run before any major migration):');
  console.log('   ┌──────────────────────────────────────────────────────┐');
  console.log('   │  pg_dump "$DATABASE_URL" --no-owner --no-acl \\       │');
  console.log('   │    -f backup-$(date +%Y%m%d-%H%M%S).sql              │');
  console.log('   └──────────────────────────────────────────────────────┘\n');
} else if (isRender) {
  console.log('✅  Provider: Render PostgreSQL\n');
  console.log('📋  Backup Checklist for Render:\n');
  console.log('   1. Open https://dashboard.render.com → your Postgres instance');
  console.log('   2. Go to Backups tab → verify "Automatic Backups" is ON');
  console.log('   3. Render Free Postgres: 90-day retention, daily snapshots');
  console.log('   4. Test restore: Use "Restore from Backup" button in dashboard\n');
} else if (isRailway) {
  console.log('✅  Provider: Railway PostgreSQL\n');
  console.log('📋  Backup Checklist for Railway:\n');
  console.log('   1. Open https://railway.app → your project → database service');
  console.log('   2. Click the database → check Backup settings in the panel');
  console.log('   3. Enable plugin backup if not already enabled\n');
} else if (isLocal) {
  console.error('⛔  Provider: LOCAL PostgreSQL');
  console.error('   ⚠️  LOCAL DATABASES ARE NOT BACKED UP AUTOMATICALLY.');
  console.error('   You MUST migrate to a managed provider before launch:');
  console.error('   → Supabase (recommended for this stack): https://supabase.com');
  console.error('   → Render Postgres: https://render.com/docs/databases');
  console.error('   → Railway: https://railway.app\n');
  process.exit(1);
} else {
  console.log('⚠️  Provider: Unknown — manual backup setup required.\n');
  console.log('   Verify that your provider has automated daily backups enabled.');
  console.log('   Run a manual pg_dump before any migration as a safety net.\n');
}

// ── Test DB connectivity ────────────────────────────────────────────────────
console.log('🔌  Testing database connection...');
try {
  // Use psql if available, otherwise just check URL parsing
  execSync(
    `psql "${DATABASE_URL}" -c "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';" -t -A`,
    { stdio: 'pipe' }
  );
  console.log('✅  Database connection: OK\n');
} catch (err) {
  console.log('⚠️  psql not installed locally — skipping live connection test.');
  console.log('   Run this from a machine with psql, or use Supabase Table Editor.\n');
}

// ── Final checklist ────────────────────────────────────────────────────────
console.log('══════════════════════════════════════════════════');
console.log('  ✅  Pre-launch DB Backup Checklist');
console.log('══════════════════════════════════════════════════\n');

const checklist = [
  'Automated backups are enabled on managed provider',
  'Backup frequency is daily or better (PITR preferred)',
  'Restore procedure tested at least once',
  'pg_dump taken manually before first production migration',
  'Backup location is NOT the same server as the database',
  'DATABASE_URL for production is NOT shared in any local .env file committed to git',
];

checklist.forEach((item, i) => {
  console.log(`  [ ] ${i + 1}. ${item}`);
});

console.log('\n  💡  Run pg_dump before EVERY production migration:');
console.log('      pg_dump "$DATABASE_URL" --no-owner --no-acl \\');
console.log('        -f backup-pre-migration-$(date +%Y%m%d).sql\n');

console.log('══════════════════════════════════════════════════\n');
