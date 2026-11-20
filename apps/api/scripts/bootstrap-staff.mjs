import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { PrismaService } from '../dist/prisma/prisma.service.js';
import { createStaffAccount } from '../dist/staff/staff-accounts.service.js';

config({
  path: fileURLToPath(new URL('../.env', import.meta.url)),
  quiet: true,
});
let prisma;
try {
  const [username, displayName] = process.argv.slice(2);
  const target = new URL(process.env.DATABASE_URL ?? '');
  if (
    process.stdin.isTTY ||
    !username ||
    !displayName ||
    process.env.NODE_ENV === 'production' ||
    !['postgres:', 'postgresql:'].includes(target.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) ||
    target.searchParams.get('schema') !== 'public'
  ) {
    throw new Error(
      'Use this script with a local database and a password piped through standard input.',
    );
  }
  const password = readFileSync(0, 'utf8').replace(/\r?\n$/, '');
  prisma = new PrismaService(new ConfigService(process.env));
  await prisma.database.$transaction(async (db) => {
    await db.$executeRaw`LOCK TABLE "public"."StaffUser" IN SHARE ROW EXCLUSIVE MODE`;
    if (await db.staffUser.count({ where: { role: 'OWNER_ADMIN' } }))
      throw new Error('An Owner/Admin already exists.');
    await createStaffAccount(db, {
      username,
      displayName,
      password,
      role: 'OWNER_ADMIN',
    });
  });
  console.log('Initial Owner/Admin created.');
} catch {
  console.error(
    'Could not bootstrap staff. Check that the local staff migration is applied, the username and password are valid, and no Owner/Admin exists yet.',
  );
  process.exitCode = 1;
} finally {
  await prisma?.onModuleDestroy();
}
