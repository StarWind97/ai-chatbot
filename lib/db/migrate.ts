import dotenv from 'dotenv';
import { expand } from 'dotenv-expand';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import fs from 'node:fs';
import path from 'node:path';

// Define environment variable loading function following Next.js priority rules
const loadEnvironmentVariables = () => {
  const nodeEnv = process.env.NODE_ENV;
  const cwd = process.cwd();

  // Define all possible env file paths
  const envPaths = {
    // Base .env file (lowest priority)
    base: path.resolve(cwd, '.env'),
    // Environment specific files
    environment: path.resolve(
      cwd,
      nodeEnv === 'production' ? '.env.production' : '.env.development',
    ),
    // Local overrides (not loaded in test environment)
    local: path.resolve(cwd, '.env.local'),
    // Environment specific local overrides (highest priority)
    environmentLocal: path.resolve(
      cwd,
      nodeEnv === 'production'
        ? '.env.production.local'
        : '.env.development.local',
    ),
  };

  // Load files in order of priority (low to high)
  // We load all files that exist and let dotenv-expand handle variable overrides
  const loadedFiles = [];

  // 1. Base .env file (lowest priority)
  if (fs.existsSync(envPaths.base)) {
    expand(dotenv.config({ path: envPaths.base }));
    loadedFiles.push(path.basename(envPaths.base));
  }

  // 2. Environment specific file (.env.development or .env.production)
  if (fs.existsSync(envPaths.environment)) {
    expand(dotenv.config({ path: envPaths.environment }));
    loadedFiles.push(path.basename(envPaths.environment));
  }

  // 3. Local override file (.env.local) - skipped in test environment
  if (nodeEnv !== 'test' && fs.existsSync(envPaths.local)) {
    expand(dotenv.config({ path: envPaths.local }));
    loadedFiles.push(path.basename(envPaths.local));
  }

  // 4. Environment specific local file (highest priority)
  if (fs.existsSync(envPaths.environmentLocal)) {
    expand(dotenv.config({ path: envPaths.environmentLocal }));
    loadedFiles.push(path.basename(envPaths.environmentLocal));
  }

  if (loadedFiles.length > 0) {
    console.log(`Loaded environment variables from: ${loadedFiles.join(', ')}`);
  } else {
    console.warn(
      'No .env files found. Using environment variables from the system.',
    );
  }
};

// Load environment variables before running migrations
loadEnvironmentVariables();

const runMigrate = async () => {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL is not defined');
  }

  const connection = postgres(process.env.POSTGRES_URL, { max: 1 });
  const db = drizzle(connection);

  console.log('⏳ Running migrations...');

  const start = Date.now();
  await migrate(db, { migrationsFolder: './lib/db/migrations' });
  const end = Date.now();

  console.log('✅ Migrations completed in', end - start, 'ms');
  process.exit(0);
};

runMigrate().catch((err) => {
  console.error('❌ Migration failed');
  console.error(err);
  process.exit(1);
});
