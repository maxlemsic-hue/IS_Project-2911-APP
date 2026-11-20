import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { StaffModule } from '../staff/staff.module.js';
import {
  CatalogController,
  PublicCatalogController,
} from './catalog.controller.js';
import { CatalogService } from './catalog.service.js';

@Module({
  imports: [PrismaModule, StaffModule],
  controllers: [CatalogController, PublicCatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}
