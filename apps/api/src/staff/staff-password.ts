import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
const options = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const dummy = `scrypt:${'0'.repeat(32)}:${'0'.repeat(128)}`;

function derive(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, options, (error, hash) => {
      if (error) reject(error);
      else resolve(hash);
    });
  });
}

export function staffUsername(value: unknown) {
  const username = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return /^[a-z0-9][a-z0-9._-]{2,39}$/.test(username) ? username : '';
}

export function validPassword(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 12 &&
    Buffer.byteLength(value) <= 128
  );
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await derive(password, salt);
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
}

export async function verifyPassword(password: string, encoded?: string) {
  const valid =
    encoded !== undefined &&
    /^scrypt:[0-9a-f]{32}:[0-9a-f]{128}$/.test(encoded);
  const [, salt, expected] = (valid ? encoded : dummy).split(':');
  const actual = await derive(password, Buffer.from(salt, 'hex'));
  return timingSafeEqual(actual, Buffer.from(expected, 'hex')) && valid;
}
