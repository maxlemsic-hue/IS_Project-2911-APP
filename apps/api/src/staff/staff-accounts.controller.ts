import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { StaffActor } from './staff-auth.service.js';
import { CurrentStaff, StaffGuard } from './staff.guard.js';
import { StaffAccountsService } from './staff-accounts.service.js';

@Controller('admin/staff')
@UseGuards(StaffGuard)
export class StaffAccountsController {
  constructor(private readonly accounts: StaffAccountsService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  list() {
    return this.accounts.list();
  }

  @Post()
  @Header('Cache-Control', 'no-store')
  create(@Body() body: unknown) {
    return this.accounts.create(body);
  }

  @Patch(':id/active')
  @Header('Cache-Control', 'no-store')
  active(
    @CurrentStaff() actor: StaffActor,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.accounts.setActive(actor.id, id, body);
  }
}
