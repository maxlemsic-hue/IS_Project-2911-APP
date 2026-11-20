import {
  createParamDecorator,
  ForbiddenException,
  Injectable,
  SetMetadata,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { StaffRole } from '../generated/prisma/client.js';
import { StaffAuthService, type StaffRequest } from './staff-auth.service.js';

const staffRoles = 'staff.roles';
export const StaffRoles = (...roles: StaffRole[]) =>
  SetMetadata(staffRoles, roles);
export const CurrentStaff = createParamDecorator(
  (_value: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<StaffRequest>().staff,
);

@Injectable()
export class StaffGuard implements CanActivate {
  constructor(
    private readonly auth: StaffAuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<StaffRequest>();
    const actor = await this.auth.authenticate(request);
    const roles = this.reflector.getAllAndOverride<StaffRole[]>(staffRoles, [
      context.getHandler(),
      context.getClass(),
    ]) ?? ['OWNER_ADMIN'];
    if (!roles.includes(actor.role))
      throw new ForbiddenException(
        'Your staff role does not allow this action.',
      );
    request.staff = actor;
    return true;
  }
}
