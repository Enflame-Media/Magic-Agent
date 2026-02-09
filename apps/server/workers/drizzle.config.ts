import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle Kit Configuration for D1 SQLite
 *
 * This config is used for migration generation only (drizzle-kit generate).
 * Actual migration application is done via wrangler d1 execute commands.
 *
 * Usage:
 *   yarn db:generate  - Generate SQL migrations from schema changes
 *
 * Environment handling:
 *   - dev: uses 'happy-dev' database
 *   - prod: uses 'happy-prod' database
 *   See scripts/db-init.sh for environment-specific migration application.
 */
export default defineConfig({
    schema: './src/db/schema.ts',
    out: './drizzle/migrations',
    dialect: 'sqlite',
});
