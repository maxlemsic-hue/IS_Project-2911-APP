import { existsSync, readFileSync } from 'node:fs';
import { parse } from 'dotenv';
import { Client } from 'pg';

// Use the same API-local environment file and precedence as Nest.
export async function checkDevelopmentDatabase() {
  let client;
  try {
    const file = new URL('../.env', import.meta.url);
    const { DATABASE_URL: connectionString } = {
      ...(existsSync(file) ? parse(readFileSync(file)) : {}),
      ...process.env,
    };
    const url = new URL(connectionString ?? '');
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error();
    client = new Client({
      connectionString,
      connectionTimeoutMillis: 3000,
      query_timeout: 3000,
    });
    const { host, database } = client.connectionParameters;
    if (!['localhost', '127.0.0.1', '::1'].includes(host) || !database)
      throw new Error();
    await client.connect();
    await client.query('SELECT 1');
  } catch {
    throw new Error(
      'PostgreSQL is unavailable or the API connection is misconfigured. Start the local PostgreSQL service, then check DATABASE_URL in apps/api/.env and any terminal overrides.',
    );
  } finally {
    await client?.end().catch(() => {});
  }
}
