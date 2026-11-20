import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  hashPassword,
  staffUsername,
  validPassword,
} from './staff-password.js';

const accountFields = {
  id: true,
  username: true,
  displayName: true,
  role: true,
  active: true,
} satisfies Prisma.StaffUserSelect;
export function staffId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)
  );
}

export async function createStaffAccount(
  db: Prisma.TransactionClient,
  body: unknown,
) {
  const {
    username: input,
    displayName,
    password,
    role,
  } = (body ?? {}) as Record<string, unknown>;
  const username = staffUsername(input);
  if (!username)
    throw new BadRequestException(
      'Choose a username with 3–40 letters, digits, dots, underscores or hyphens.',
    );
  if (
    typeof displayName !== 'string' ||
    !displayName.trim() ||
    displayName.trim().length > 80 ||
    [0, 10, 13].some((code) => displayName.includes(String.fromCharCode(code)))
  )
    throw new BadRequestException('Enter a staff name of up to 80 characters.');
  if (!validPassword(password))
    throw new BadRequestException(
      'Choose a password with at least 12 characters and at most 128 bytes.',
    );
  if (role !== 'OWNER_ADMIN' && role !== 'CASHIER' && role !== 'PRODUCTION')
    throw new BadRequestException('Choose a valid staff role.');
  try {
    return await db.staffUser.create({
      data: {
        username,
        displayName: displayName.trim(),
        role,
        passwordHash: await hashPassword(password),
      },
      select: accountFields,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    )
      throw new ConflictException('Username is already in use.');
    throw error;
  }
}

@Injectable()
export class StaffAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.database.staffUser.findMany({
      select: accountFields,
      orderBy: { username: 'asc' },
    });
  }

  create(body: unknown) {
    return createStaffAccount(this.prisma.database, body);
  }

  setActive(actorId: string, id: string, body: unknown) {
    const { active } = (body ?? {}) as Record<string, unknown>;
    if (!staffId(id)) throw new NotFoundException('Staff account not found.');
    if (typeof active !== 'boolean')
      throw new BadRequestException('Choose active or inactive.');
    if (actorId === id.toLowerCase() && !active)
      throw new BadRequestException('You cannot disable your own account.');
    return this.prisma.database.$transaction(async (db) => {
      // Serialize account activation decisions so two owners cannot disable one another.
      await db.$executeRaw`LOCK TABLE "public"."StaffUser" IN SHARE ROW EXCLUSIVE MODE`;
      const actor = await db.staffUser.findUnique({
        where: { id: actorId },
        select: { active: true, role: true },
      });
      if (!actor?.active || actor.role !== 'OWNER_ADMIN')
        throw new ForbiddenException('An active Owner/Admin is required.');
      const account = await db.staffUser.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!account) throw new NotFoundException('Staff account not found.');
      const result = await db.staffUser.update({
        where: { id },
        data: { active },
        select: accountFields,
      });
      if (!active)
        await db.$executeRaw`UPDATE "public"."StaffSession" SET "revokedAt" = clock_timestamp()
        WHERE "staffUserId" = ${id}::uuid AND "revokedAt" IS NULL`;
      return result;
    });
  }
}
