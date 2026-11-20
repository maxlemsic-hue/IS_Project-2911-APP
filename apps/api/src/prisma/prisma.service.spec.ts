import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service.js';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  disconnect: vi.fn(),
  client: vi.fn(),
}));

vi.mock('@prisma/adapter-pg', () => ({ PrismaPg: class {} }));
vi.mock('../generated/prisma/client.js', () => ({
  PrismaClient: class {
    constructor() {
      mocks.client();
    }
    $queryRaw = mocks.query;
    $disconnect = mocks.disconnect;
  },
}));

describe('PrismaService lifecycle and safe health checks', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('remains available without a database URL and allocates no client', async () => {
    const service = new PrismaService(new ConfigService({ DATABASE_URL: '' }));
    expect(await service.isHealthy()).toBe(false);
    await service.onModuleDestroy();
    expect(mocks.client).not.toHaveBeenCalled();
  });

  it('checks the database through a query and closes its client', async () => {
    mocks.query.mockResolvedValue([{ '?column?': 1 }]);
    const service = new PrismaService(
      new ConfigService({ DATABASE_URL: 'test-only' }),
    );
    expect(await service.isHealthy()).toBe(true);
    expect(mocks.query).toHaveBeenCalledOnce();
    await service.onModuleDestroy();
    expect(mocks.disconnect).toHaveBeenCalledOnce();
  });

  it('does not propagate database errors or private details', async () => {
    mocks.query.mockRejectedValue(new Error('private driver error'));
    const service = new PrismaService(
      new ConfigService({ DATABASE_URL: 'test-only' }),
    );
    expect(await service.isHealthy()).toBe(false);
    await service.onModuleDestroy();
  });
});
