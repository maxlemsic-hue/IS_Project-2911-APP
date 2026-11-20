import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import type { StaffActor } from '../staff/staff-auth.service.js';
import { CurrentStaff, StaffGuard, StaffRoles } from '../staff/staff.guard.js';
import { AdminOrdersService } from './admin-orders.service.js';

@Controller('admin/orders')
@UseGuards(StaffGuard)
export class AdminOrdersController {
  constructor(private readonly orders: AdminOrdersService) {}

  @Get()
  @StaffRoles('OWNER_ADMIN', 'PRODUCTION')
  @Header('Cache-Control', 'no-store')
  list(@CurrentStaff() actor: StaffActor) {
    return this.orders.list(actor);
  }

  @Get(':reference')
  @StaffRoles('OWNER_ADMIN', 'PRODUCTION')
  @Header('Cache-Control', 'no-store')
  details(
    @CurrentStaff() actor: StaffActor,
    @Param('reference') reference: string,
  ) {
    return this.orders.details(actor, reference);
  }

  @Patch(':reference/status')
  @Header('Cache-Control', 'no-store')
  update(
    @CurrentStaff() actor: StaffActor,
    @Param('reference') reference: string,
    @Body() body: unknown,
  ) {
    return this.orders.update(actor.id, reference, body);
  }

  @Patch(':reference/assignment')
  @Header('Cache-Control', 'no-store')
  assign(
    @CurrentStaff() actor: StaffActor,
    @Param('reference') reference: string,
    @Body() body: unknown,
  ) {
    return this.orders.assign(actor.id, reference, body);
  }

  @Get(':reference/audit')
  @Header('Cache-Control', 'no-store')
  audit(@Param('reference') reference: string) {
    return this.orders.audit(reference);
  }
}
