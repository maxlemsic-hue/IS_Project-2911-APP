import {
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
@Injectable()
export class PrismaService implements OnModuleDestroy {
  private readonly client?: PrismaClient;
  constructor(config: ConfigService) {
    const connectionString = config.get<string>('DATABASE_URL');
    if (connectionString)
      this.client = new PrismaClient({
        adapter: new PrismaPg({
          connectionString,
          connectionTimeoutMillis: 3000,
          query_timeout: 3000,
        }),
      });
  }
  get database(): PrismaClient {
    if (!this.client)
      throw new ServiceUnavailableException('Database unavailable');
    return this.client;
  }
  async isHealthy(): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
  async onModuleDestroy(): Promise<void> {
    await this.client?.$disconnect();
  }
}
