import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentStaff, StaffGuard } from '../staff/staff.guard.js';
import type { StaffActor } from '../staff/staff-auth.service.js';
import { receiptLimit } from '../ordering/payment-rules.js';
import { CatalogService } from './catalog.service.js';

function imageFile(image: { content: Uint8Array; contentType: string }) {
  return new StreamableFile(image.content, {
    type: image.contentType,
    disposition: 'inline',
  });
}
@Controller('admin/catalog')
@UseGuards(StaffGuard)
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}
  @Get('products')
  @Header('Cache-Control', 'no-store')
  products(
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.catalog.list(search, categoryId);
  }
  @Post('products')
  create(@CurrentStaff() actor: StaffActor, @Body() body: unknown) {
    return this.catalog.saveProduct(actor.id, body);
  }
  @Patch('products/:id')
  update(
    @CurrentStaff() actor: StaffActor,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.catalog.saveProduct(actor.id, body, id);
  }
  @Patch('products/:id/archive')
  archive(
    @CurrentStaff() actor: StaffActor,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.catalog.archiveProduct(actor.id, id, body);
  }
  @Get('categories')
  @Header('Cache-Control', 'no-store')
  categories() {
    return this.catalog.categories();
  }
  @Post('categories')
  createCategory(@CurrentStaff() actor: StaffActor, @Body() body: unknown) {
    return this.catalog.saveCategory(actor.id, body);
  }
  @Patch('categories/:id')
  updateCategory(
    @CurrentStaff() actor: StaffActor,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.catalog.saveCategory(actor.id, body, id);
  }
  @Patch('categories/:id/archive')
  archiveCategory(@CurrentStaff() actor: StaffActor, @Param('id') id: string) {
    return this.catalog.archiveCategory(actor.id, id);
  }
  @Post('products/:id/images')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: receiptLimit, files: 1, fields: 1, fieldSize: 1000 },
    }),
  )
  upload(
    @CurrentStaff() actor: StaffActor,
    @Param('id') id: string,
    @Body('altText') altText: unknown,
    @UploadedFile() file?: { buffer: Buffer },
  ) {
    return this.catalog.upload(actor.id, id, altText, file);
  }
  @Delete('products/:id/images/:imageId')
  @HttpCode(204)
  removeImage(
    @CurrentStaff() actor: StaffActor,
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ) {
    return this.catalog.removeImage(actor.id, id, imageId);
  }
  @Get('images/:id')
  @Header('Cache-Control', 'no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Content-Security-Policy', "default-src 'none'; sandbox")
  async image(@Param('id') id: string) {
    return imageFile(await this.catalog.image(id, true));
  }
  @Get('products/:id/audit')
  @Header('Cache-Control', 'no-store')
  productAudit(@Param('id') id: string) {
    return this.catalog.audit(id);
  }
  @Get('categories/:id/audit')
  @Header('Cache-Control', 'no-store')
  categoryAudit(@Param('id') id: string) {
    return this.catalog.audit(undefined, id);
  }
}
@Controller('catalog')
export class PublicCatalogController {
  constructor(private readonly catalog: CatalogService) {}
  @Get('products/:id/images')
  @Header('Cache-Control', 'no-store')
  images(@Param('id') productId: string) {
    return this.catalog.publicImages(productId);
  }
  @Get('images/:id')
  @Header('Cache-Control', 'no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Content-Security-Policy', "default-src 'none'; sandbox")
  async image(@Param('id') id: string) {
    return imageFile(await this.catalog.image(id));
  }
}
