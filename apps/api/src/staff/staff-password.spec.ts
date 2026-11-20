import {
  hashPassword,
  staffUsername,
  validPassword,
  verifyPassword,
} from './staff-password.js';

describe('Staff credentials', () => {
  it('uses salted hashes and rejects invalid or unknown credentials', async () => {
    const password = 'local-fixture-password';
    const first = await hashPassword(password);
    const second = await hashPassword(password);
    expect(first).not.toBe(second);
    expect(first).not.toContain(password);
    await expect(verifyPassword(password, first)).resolves.toBe(true);
    await expect(verifyPassword('incorrect-password', first)).resolves.toBe(
      false,
    );
    await expect(verifyPassword(password)).resolves.toBe(false);
  });

  it('normalizes usernames and rejects unbounded passwords', () => {
    expect(staffUsername('  Cashier-01  ')).toBe('cashier-01');
    expect(staffUsername('a b')).toBe('');
    expect(validPassword('short')).toBe(false);
    expect(validPassword('x'.repeat(129))).toBe(false);
  });
});
