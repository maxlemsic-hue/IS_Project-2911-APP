import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { StaffActor } from '../staff/staff-auth.service.js';
import { CurrentStaff, StaffGuard, StaffRoles } from '../staff/staff.guard.js';
import { OrderConversationService } from './order-conversation.service.js';
import { privateOrderAccess } from './ordering.service.js';
import { receiptLimit } from './payment-rules.js';

function receiptFile(receipt: { content: Uint8Array; contentType: string }) {
  const extension = receipt.contentType === 'image/png' ? 'png' : 'jpg';
  return new StreamableFile(receipt.content, {
    type: receipt.contentType,
    disposition: `attachment; filename="receipt.${extension}"`,
  });
}

@Controller('orders/:reference')
export class CustomerConversationController {
  constructor(private readonly service: OrderConversationService) {}

  @Get('progress')
  @Header('Cache-Control', 'no-store')
  progress(
    @Param('reference') reference: string,
    @Headers('authorization') auth?: string,
  ) {
    return this.service.progress(privateOrderAccess(reference, auth));
  }

  @Get('conversation')
  @Header('Cache-Control', 'no-store')
  conversation(
    @Param('reference') reference: string,
    @Headers('authorization') auth?: string,
  ) {
    return this.service.conversation(privateOrderAccess(reference, auth));
  }

  @Post('conversation')
  @HttpCode(204)
  message(
    @Param('reference') reference: string,
    @Body() body: unknown,
    @Headers('authorization') auth?: string,
  ) {
    return this.service.message(privateOrderAccess(reference, auth), body);
  }

  @Post('receipts')
  @Header('Cache-Control', 'no-store')
  @UseInterceptors(
    FileInterceptor('receipt', {
      limits: { fileSize: receiptLimit, files: 1, fields: 0 },
    }),
  )
  upload(
    @Param('reference') reference: string,
    @UploadedFile() file?: { buffer: Buffer },
    @Headers('authorization') auth?: string,
  ) {
    return this.service.upload(privateOrderAccess(reference, auth), file);
  }

  @Get('receipts/:id')
  @Header('Cache-Control', 'no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  async image(
    @Param('reference') reference: string,
    @Param('id') id: string,
    @Headers('authorization') auth?: string,
  ) {
    return receiptFile(
      await this.service.image(privateOrderAccess(reference, auth), id),
    );
  }
}

@Controller('admin/orders/:reference')
@UseGuards(StaffGuard)
export class AdminConversationController {
  constructor(private readonly service: OrderConversationService) {}

  @Get('progress')
  @StaffRoles('OWNER_ADMIN', 'PRODUCTION')
  @Header('Cache-Control', 'no-store')
  progress(
    @CurrentStaff() actor: StaffActor,
    @Param('reference') reference: string,
  ) {
    return this.service.progress({ reference }, actor);
  }

  @Patch('progress')
  @StaffRoles('OWNER_ADMIN', 'PRODUCTION')
  @Header('Cache-Control', 'no-store')
  advance(
    @CurrentStaff() actor: StaffActor,
    @Param('reference') reference: string,
    @Body() body: unknown,
  ) {
    return this.service.advance(actor, reference, body);
  }

  @Get('conversation')
  @Header('Cache-Control', 'no-store')
  conversation(@Param('reference') reference: string) {
    return this.service.conversation({ reference });
  }

  @Post('conversation')
  @HttpCode(204)
  message(
    @CurrentStaff() actor: StaffActor,
    @Param('reference') reference: string,
    @Body() body: unknown,
  ) {
    return this.service.message({ reference }, body, actor.id);
  }

  @Get('receipts/:id')
  @Header('Cache-Control', 'no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  async image(@Param('reference') reference: string, @Param('id') id: string) {
    return receiptFile(await this.service.image({ reference }, id));
  }

  @Patch('receipts/:id')
  @HttpCode(204)
  verify(
    @CurrentStaff() actor: StaffActor,
    @Param('reference') reference: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.service.verify(actor.id, reference, id, body);
  }

  @Post('accept')
  @HttpCode(204)
  accept(
    @CurrentStaff() actor: StaffActor,
    @Param('reference') reference: string,
    @Body() body: unknown,
  ) {
    return this.service.accept(actor.id, reference, body);
  }
}
