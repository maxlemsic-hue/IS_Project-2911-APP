import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { StaffAuthService } from './staff-auth.service.js';
import { StaffAuthController } from './staff-auth.controller.js';
import { StaffGuard } from './staff.guard.js';
import { StaffAccountsService } from './staff-accounts.service.js';
import { StaffAccountsController } from './staff-accounts.controller.js';

@Module({
  imports: [PrismaModule],
  controllers: [StaffAuthController, StaffAccountsController],
  providers: [StaffAuthService, StaffGuard, StaffAccountsService],
  exports: [StaffGuard, StaffAuthService],
})
export class StaffModule {}
