import { Module } from '@nestjs/common';
import { fileURLToPath } from 'node:url';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthModule } from './health/health.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { OrderingModule } from './ordering/ordering.module.js';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: fileURLToPath(new URL('../.env', import.meta.url)),
    }),
    PrismaModule,
    HealthModule,
    OrderingModule,
    CatalogModule,
  ],
})
export class AppModule {}
