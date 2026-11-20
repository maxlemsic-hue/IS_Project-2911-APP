import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  StaffAuthService,
  sessionDuration,
  staffCookie,
  type StaffActor,
} from './staff-auth.service.js';
import { CurrentStaff, StaffGuard, StaffRoles } from './staff.guard.js';

const cookie = { httpOnly: true, sameSite: 'strict', path: '/api/v1' } as const;

@Controller('staff')
export class StaffAuthController {
  constructor(private readonly auth: StaffAuthService) {}

  @Post('login')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async login(
    @Req() request: Request,
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { actor, token } = await this.auth.login(request, body);
    // Staff auth is loopback-only in this HTTP development environment.
    response.cookie(staffCookie, token, { ...cookie, maxAge: sessionDuration });
    return actor;
  }

  @Get('me')
  @Header('Cache-Control', 'no-store')
  @UseGuards(StaffGuard)
  @StaffRoles('OWNER_ADMIN', 'CASHIER', 'PRODUCTION')
  me(@CurrentStaff() actor: StaffActor) {
    return actor;
  }

  @Post('logout')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logout(request);
    response.clearCookie(staffCookie, cookie);
  }
}
