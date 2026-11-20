import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { OrderingService } from './ordering.service.js';

@Controller()
export class OrderingController {
  constructor(private readonly ordering: OrderingService) {}

  @Get('products')
  products() {
    return this.ordering.products();
  }

  @Post('orders')
  @Header('Cache-Control', 'no-store')
  submit(@Body() body: unknown) {
    return this.ordering.submit(body);
  }

  @Get('orders/:reference')
  @Header('Cache-Control', 'no-store')
  retrieve(
    @Param('reference') reference: string,
    @Headers('authorization') authorization?: string,
  ) {
    return this.ordering.retrieve(reference, authorization);
  }

  @Post('orders/:reference/confirm')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  confirm(
    @Param('reference') reference: string,
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
  ) {
    return this.ordering.confirm(reference, body, authorization);
  }
}
