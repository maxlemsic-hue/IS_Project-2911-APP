import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../dist/prisma/prisma.service.js';

config({
  path: fileURLToPath(new URL('../.env', import.meta.url)),
  quiet: true,
});

let prisma;
try {
  const url = new URL(process.env.DATABASE_URL || '');
  if (
    !['postgresql:', 'postgres:'].includes(url.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    (url.port && url.port !== '5432') ||
    url.pathname !== '/twenty9_eleven' ||
    !url.username ||
    decodeURIComponent(url.username) === 'postgres'
  ) {
    throw new Error('invalid local project configuration');
  }
  prisma = new PrismaService(new ConfigService(process.env));
  if (!(await prisma.isHealthy())) throw new Error('database unavailable');
  console.log('Local project database: Prisma SELECT 1 passed.');
} catch {
  console.error(
    'Local database check failed. Verify PostgreSQL, the dedicated role, and apps/api/.env; see docs/database-deployment.md. No credentials or internal errors are printed.',
  );
  process.exitCode = 1;
} finally {
  try {
    await prisma?.onModuleDestroy();
  } catch {
    console.error('Database connection cleanup failed.');
    process.exitCode = 1;
  }
}
