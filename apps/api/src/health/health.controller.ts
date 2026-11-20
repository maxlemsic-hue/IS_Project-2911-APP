import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}
  @Get()
  health() {
    return { status: 'ok', service: 'twenty9-eleven-api' };
  }
  @Get('database')
  async database() {
    if (!(await this.prisma.isHealthy()))
      throw new ServiceUnavailableException({
        status: 'unavailable',
        service: 'twenty9-eleven-database',
      });
    return { status: 'ok', service: 'twenty9-eleven-database' };
  }
}
