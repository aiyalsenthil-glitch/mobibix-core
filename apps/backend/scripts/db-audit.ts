import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const dbSize = await prisma.$queryRawUnsafe<any[]>(
    `SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size`
  );
  console.log('\n=== DATABASE TOTAL SIZE ===');
  console.log(dbSize[0].db_size);

  const top = await prisma.$queryRawUnsafe<any[]>(`
    SELECT
      c.relname AS tablename,
      pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
      pg_size_pretty(pg_table_size(c.oid))          AS data_size,
      pg_size_pretty(pg_indexes_size(c.oid))        AS index_size,
      s.n_live_tup::text AS live_rows,
      s.n_dead_tup::text AS dead_rows
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY pg_total_relation_size(c.oid) DESC
    LIMIT 35
  `);

  console.log('\n=== TOP 35 TABLES BY SIZE ===');
  console.log('TOTAL        DATA         INDEXES      LIVE_ROWS    TABLE');
  console.log('------------ ------------ ------------ ------------ --------------------');
  top.forEach((r: any) =>
    console.log(
      (r.total_size as string).padEnd(13),
      (r.data_size as string).padEnd(13),
      (r.index_size as string).padEnd(13),
      (r.live_rows as string).padEnd(13),
      r.tablename
    )
  );

  const dead = await prisma.$queryRawUnsafe<any[]>(`
    SELECT relname AS tablename, n_dead_tup AS dead_rows, n_live_tup AS live_rows,
      ROUND(n_dead_tup::numeric / NULLIF(n_live_tup + n_dead_tup, 0) * 100, 1) AS dead_pct,
      last_autovacuum
    FROM pg_stat_user_tables
    WHERE n_dead_tup > 100 AND schemaname = 'public'
    ORDER BY n_dead_tup DESC
  `);

  if (dead.length > 0) {
    console.log('\n=== TABLES WITH DEAD TUPLES (bloat) ===');
    console.table(dead);
  } else {
    console.log('\n=== NO SIGNIFICANT DEAD TUPLE BLOAT ===');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
