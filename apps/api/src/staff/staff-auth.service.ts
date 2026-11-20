import {
  ForbiddenException,
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Request } from 'express';
import type { StaffRole } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  staffUsername,
  validPassword,
  verifyPassword,
} from './staff-password.js';

export const staffCookie = 't29_staff';
export const sessionDuration = 8 * 60 * 60 * 1000;
export type StaffActor = {
  id: string;
  username: string;
  displayName: string;
  role: StaffRole;
};
export type StaffRequest = Request & { staff: StaffActor };

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class StaffAuthService {
  private attempts = 0;
  private windowEnds = 0;
  private verifying = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  assertLocal(request: Request) {
    if (
      this.config.get('NODE_ENV') === 'production' ||
      !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(
        request.socket.remoteAddress ?? '',
      )
    )
      throw new UnauthorizedException(
        'Staff login is available on the local development machine.',
      );
    if (
      !['GET', 'HEAD'].includes(request.method) &&
      request.headers['x-staff-request'] !== '1'
    )
      throw new ForbiddenException(
        'Use the staff application for this action.',
      );
  }

  private token(request: Request) {
    const value = request.headers.cookie
      ?.split(';')
      .find((part) => part.trim().startsWith(staffCookie + '='));
    return value?.trim().match(/^t29_staff=([A-Za-z0-9_-]{43})$/)?.[1];
  }

  async login(request: Request, body: unknown) {
    this.assertLocal(request);
    const { username: input, password } = (body ?? {}) as Record<
      string,
      unknown
    >;
    const username = staffUsername(input);
    if (!username || !validPassword(password))
      throw new UnauthorizedException('Invalid username or password.');
    const now = Date.now();
    if (now >= this.windowEnds) {
      this.windowEnds = now + 60_000;
      this.attempts = 0;
    }
    if (this.attempts >= 15 || this.verifying >= 3)
      throw new HttpException(
        'Too many sign-in attempts. Try again shortly.',
        429,
      );
    this.attempts++;
    this.verifying++;
    try {
      const db = this.prisma.database;
      const account = await db.staffUser.findUnique({
        where: { username },
        select: {
          id: true,
          username: true,
          displayName: true,
          role: true,
          active: true,
          passwordHash: true,
        },
      });
      const matches = await verifyPassword(password, account?.passwordHash);
      if (!matches || !account?.active)
        throw new UnauthorizedException('Invalid username or password.');
      const token = randomBytes(32).toString('base64url');
      const prior = this.token(request);
      await db.$transaction(async (tx) => {
        const [active] = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM "public"."StaffUser" WHERE id=${account.id}::uuid AND active FOR SHARE
        `;
        if (!active)
          throw new UnauthorizedException('Invalid username or password.');
        if (prior)
          await tx.$executeRaw`UPDATE "public"."StaffSession" SET "revokedAt" = clock_timestamp()
          WHERE "tokenHash" = ${tokenHash(prior)} AND "revokedAt" IS NULL`;
        await tx.$executeRaw`INSERT INTO "public"."StaffSession" (id,"staffUserId","tokenHash","expiresAt")
          VALUES (${randomUUID()}::uuid,${account.id}::uuid,${tokenHash(token)}, clock_timestamp() + interval '8 hours')`;
      });
      const actor: StaffActor = {
        id: account.id,
        username: account.username,
        displayName: account.displayName,
        role: account.role,
      };
      return { actor, token };
    } finally {
      this.verifying--;
    }
  }

  async authenticate(request: Request) {
    this.assertLocal(request);
    const token = this.token(request);
    if (!token) throw new UnauthorizedException('Sign in to continue.');
    const [actor] = await this.prisma.database.$queryRaw<StaffActor[]>`
      SELECT u.id,u.username,u."displayName",u.role
      FROM "public"."StaffSession" s JOIN "public"."StaffUser" u ON u.id=s."staffUserId"
      WHERE s."tokenHash" = ${tokenHash(token)} AND s."revokedAt" IS NULL
        AND s."expiresAt" > clock_timestamp() AND u.active
    `;
    if (!actor) throw new UnauthorizedException('Sign in to continue.');
    return actor;
  }

  async logout(request: Request) {
    this.assertLocal(request);
    const token = this.token(request);
    if (token)
      await this.prisma.database.$executeRaw`
      UPDATE "public"."StaffSession" SET "revokedAt" = clock_timestamp()
      WHERE "tokenHash" = ${tokenHash(token)} AND "revokedAt" IS NULL
    `;
  }
}
