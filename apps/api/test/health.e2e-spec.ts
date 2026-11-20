import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Health HTTP contract', () => {
  let app: INestApplication;
  beforeEach(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({ isHealthy: async () => false })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });
  afterEach(async () => {
    await app.close();
  });
  it('returns general health while database is unavailable', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect({ status: 'ok', service: 'twenty9-eleven-api' });
    await request(app.getHttpServer())
      .get('/api/v1/health/database')
      .expect(503)
      .expect({ status: 'unavailable', service: 'twenty9-eleven-database' });
  });
});
