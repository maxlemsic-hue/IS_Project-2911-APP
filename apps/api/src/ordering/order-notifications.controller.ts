import {
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  Param,
  Patch,
} from '@nestjs/common';
import { OrderNotificationsService } from './order-notifications.service.js';

@Controller('orders/:reference/notifications')
export class OrderNotificationsController {
  constructor(private readonly notifications: OrderNotificationsService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  list(
    @Param('reference') reference: string,
    @Headers('authorization') auth?: string,
  ) {
    return this.notifications.list(reference, auth);
  }

  @Patch(':id/read')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  markRead(
    @Param('reference') reference: string,
    @Param('id') id: string,
    @Headers('authorization') auth?: string,
  ) {
    return this.notifications.markRead(reference, id, auth);
  }
}
