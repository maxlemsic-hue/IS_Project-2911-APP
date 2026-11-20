import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import type { PrismaService } from '../prisma/prisma.service.js';
describe('HealthController', () => {
  const isHealthy = vi.fn();
  const controller = new HealthController({
    isHealthy,
  } as unknown as PrismaService);
  it('reports health independently of database', () =>
    expect(controller.health()).toEqual({
      status: 'ok',
      service: 'twenty9-eleven-api',
    }));
  it('reports database success', async () => {
    isHealthy.mockResolvedValue(true);
    expect(await controller.database()).toEqual({
      status: 'ok',
      service: 'twenty9-eleven-database',
    });
  });
  it('reports unavailable safely', async () => {
    isHealthy.mockResolvedValue(false);
    await expect(controller.database()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
