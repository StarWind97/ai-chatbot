import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import fs from 'node:fs';
import path from 'node:path';

// Determine the .env file path based on NODE_ENV
const nodeEnv = process.env.NODE_ENV;
const cwd = process.cwd(); // Use current working directory to resolve paths correctly

const envPath = path.resolve(cwd, '.env');
const envLocalPath = path.resolve(cwd, '.env.local');
const envProductionPath = path.resolve(cwd, '.env.production');

let pathsToTry: string[] = [];

if (nodeEnv === 'production') {
  // Production: prioritize .env.production, fallback to .env
  pathsToTry = [envProductionPath, envPath];
} else {
  // Development or other (inc. undefined): prioritize .env.local, fallback to .env
  pathsToTry = [envLocalPath, envPath];
}

let loadedPath: string | undefined;
for (const p of pathsToTry) {
  if (fs.existsSync(p)) {
    loadedPath = p;
    break; // Stop checking once the prioritized file is found
  }
}

if (loadedPath) {
  console.log(
    `Attempting to load environment variables from: ${path.basename(loadedPath)}`,
  );
  config({ path: loadedPath });
} else {
  console.warn(
    `Warning: No suitable .env file found in prioritized list (${pathsToTry.map((p) => path.basename(p)).join(', ')}). Proceeding without loading a specific .env file.`,
  );
  // The application might still work if environment variables are set globally
  // or via other means. The check for POSTGRES_URL later will determine this.
}

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
