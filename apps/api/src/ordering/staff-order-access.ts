import { ForbiddenException } from '@nestjs/common';
import type { StaffActor } from '../staff/staff-auth.service.js';

export const staffProductionStatuses = [
  'ACCEPTED',
  'PROCESSING',
  'READY',
  'COMPLETED',
] as const;

export function staffOrderScope(actor: StaffActor) {
  if (actor.role === 'OWNER_ADMIN') return {};
  if (actor.role !== 'PRODUCTION')
    throw new ForbiddenException(
      'Your staff role does not allow order access.',
    );
  return {
    productionStaffId: actor.id,
    status: { in: [...staffProductionStatuses] },
  };
}
