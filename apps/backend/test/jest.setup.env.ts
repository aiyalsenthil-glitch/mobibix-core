// test/jest.setup.env.ts
// Loads .env before AppModule bootstraps so DATABASE_URL is available.
// override:true ensures stale shell env vars (e.g. from a previous failed
// prisma generate run) do not shadow the real values in .env.
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });
