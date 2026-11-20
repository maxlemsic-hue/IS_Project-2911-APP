import { Body, Controller, Header, Post, UseGuards } from '@nestjs/common';
import type { StaffActor } from '../staff/staff-auth.service.js';
import { CurrentStaff, StaffGuard, StaffRoles } from '../staff/staff.guard.js';
import { OrderingService } from './ordering.service.js';

@Controller('pos/orders')
@UseGuards(StaffGuard)
@StaffRoles('OWNER_ADMIN', 'CASHIER')
export class PosOrdersController {
  constructor(private readonly orders: OrderingService) {}
  @Post()
  @Header('Cache-Control', 'no-store')
  submit(@CurrentStaff() actor: StaffActor, @Body() body: unknown) {
    return this.orders.submit(body, actor);
  }
}
