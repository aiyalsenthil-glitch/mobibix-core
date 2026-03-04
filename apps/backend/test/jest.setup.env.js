// jest.setup.env.js — plain JS so no ts-jest compilation needed
// Runs before test framework: loads .env with override so DATABASE_URL
// is available when PrismaService constructor runs.
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });
