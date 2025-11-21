import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    schema: './src/db/schema.ts',
    out: './drizzle/migrations',
    dialect: 'sqlite',
    driver: 'd1-http',
    dbCredentials: {
        wranglerConfigPath: './wrangler.toml',
        databaseId: 'happy-db',
    },
});
