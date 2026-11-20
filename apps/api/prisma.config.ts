import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

config({
  path: fileURLToPath(new URL('./.env', import.meta.url)),
  quiet: true,
});

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Keep existing local setups working; managed environments must set DIRECT_URL.
    url: process.env['DIRECT_URL'] || process.env['DATABASE_URL'],
  },
});
