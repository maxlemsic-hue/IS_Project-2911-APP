import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PosOrdersController } from './pos-orders.controller.js';
import { OrderingController } from './ordering.controller.js';
import { OrderingService } from './ordering.service.js';
import { AdminOrdersController } from './admin-orders.controller.js';
import { AdminOrdersService } from './admin-orders.service.js';
import { StaffModule } from '../staff/staff.module.js';
import {
  AdminConversationController,
  CustomerConversationController,
} from './order-conversation.controller.js';
import { OrderConversationService } from './order-conversation.service.js';
import { OrderNotificationsController } from './order-notifications.controller.js';
import { OrderNotificationsService } from './order-notifications.service.js';

@Module({
  imports: [PrismaModule, StaffModule],
  controllers: [
    OrderingController,
    PosOrdersController,
    AdminOrdersController,
    CustomerConversationController,
    AdminConversationController,
    OrderNotificationsController,
  ],
  providers: [
    OrderingService,
    AdminOrdersService,
    OrderConversationService,
    OrderNotificationsService,
  ],
})
export class OrderingModule {}
