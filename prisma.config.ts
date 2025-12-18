import { config as dotenvConfig } from 'dotenv'
import { defineConfig } from 'prisma/config'

// Load environment variables from multiple possible sources
// Priority: .env.local > .env > .env.dev
dotenvConfig({ path: '.env.local' })
dotenvConfig({ path: '.env' })
dotenvConfig({ path: '.env.dev' })

// For prisma generate (no actual DB connection needed), provide a fallback URL
// This allows running `prisma generate` without a real database
const databaseUrl = process.env.DATABASE_URL || 'postgresql://localhost:5432/placeholder'

export default defineConfig({
    schema: 'prisma/schema.prisma',
    migrations: {
        path: 'prisma/migrations',
    },
    datasource: {
        url: databaseUrl,
    },
})
