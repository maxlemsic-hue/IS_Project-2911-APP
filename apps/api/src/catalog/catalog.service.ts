import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { receiptImage, receiptLimit } from '../ordering/payment-rules.js';
import {
  categoryInput,
  id,
  integer,
  productInput,
  record,
  text,
} from './catalog-input.js';

const imageMetadata = {
  id: true,
  productId: true,
  altText: true,
  contentType: true,
  createdAt: true,
};
const details = {
  category: true,
  attributes: { orderBy: { sortOrder: 'asc' as const } },
  images: {
    where: { archivedAt: null },
    select: imageMetadata,
    orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }],
  },
};
@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}
  list(search = '', categoryId?: string) {
    return this.prisma.database.product.findMany({
      where: {
        ...(categoryId ? { categoryId: id(categoryId) } : {}),
        ...(search
          ? {
              OR: [
                {
                  name: {
                    contains: text(search, 'a search term'),
                    mode: 'insensitive',
                  },
                },
                { sku: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: details,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }
  categories() {
    return this.prisma.database.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }
  private async write<T>(
    work: (db: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.prisma.database.$transaction(work);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException('That slug is already in use.');
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      )
        throw new NotFoundException('Catalog record was not found.');
      throw error;
    }
  }
  saveProduct(actorId: string, body: unknown, productId?: string) {
    const input = productInput(body);
    const version = productId ? integer(record(body).version) : undefined;
    if (productId) id(productId);
    return this.write(async (db) => {
      const category = await db.category.findFirst({
        where: { id: input.categoryId, archivedAt: null },
      });
      if (!category)
        throw new BadRequestException(
          'Choose an existing, unarchived category.',
        );
      const { attributes, ...data } = input;
      let savedId: string;
      if (productId) {
        const changed = await db.product.updateMany({
          where: { id: productId, version, archivedAt: null },
          data: { ...data, version: { increment: 1 } },
        });
        if (!changed.count)
          throw new ConflictException(
            'This product changed or was archived. Reload before editing.',
          );
        savedId = productId;
        await db.productAttribute.deleteMany({ where: { productId } });
        if (attributes.length)
          await db.productAttribute.createMany({
            data: attributes.map((attribute) => ({ ...attribute, productId })),
          });
      } else {
        const product = await db.product.create({
          data: { ...data, attributes: { create: attributes } },
        });
        savedId = product.id;
      }
      await db.staffAudit.create({
        data: {
          staffUserId: actorId,
          productId: savedId,
          action: productId ? 'PRODUCT_UPDATED' : 'PRODUCT_CREATED',
        },
      });
      return db.product.findUniqueOrThrow({
        where: { id: savedId },
        include: details,
      });
    });
  }
  archiveProduct(actorId: string, productId: string, body: unknown) {
    id(productId);
    const version = integer(record(body).version);
    return this.write(async (db) => {
      const changed = await db.product.updateMany({
        where: { id: productId, version, archivedAt: null },
        data: {
          archivedAt: new Date(),
          publicationStatus: 'ARCHIVED',
          isAvailable: false,
          version: { increment: 1 },
        },
      });
      if (!changed.count)
        throw new ConflictException(
          'This product changed or was archived. Reload before editing.',
        );
      await db.staffAudit.create({
        data: { staffUserId: actorId, productId, action: 'PRODUCT_ARCHIVED' },
      });
      return db.product.findUniqueOrThrow({
        where: { id: productId },
        include: details,
      });
    });
  }
  saveCategory(actorId: string, body: unknown, categoryId?: string) {
    const data = categoryInput(body);
    if (categoryId) id(categoryId);
    return this.write(async (db) => {
      if (
        categoryId &&
        !(await db.category.findFirst({
          where: { id: categoryId, archivedAt: null },
        }))
      )
        throw new NotFoundException('Category is archived or unavailable.');
      const category = categoryId
        ? await db.category.update({ where: { id: categoryId }, data })
        : await db.category.create({ data });
      await db.staffAudit.create({
        data: {
          staffUserId: actorId,
          categoryId: category.id,
          action: categoryId ? 'CATEGORY_UPDATED' : 'CATEGORY_CREATED',
        },
      });
      return category;
    });
  }
  archiveCategory(actorId: string, categoryId: string) {
    id(categoryId);
    return this.write(async (db) => {
      const changed = await db.category.updateMany({
        where: { id: categoryId, archivedAt: null },
        data: { archivedAt: new Date(), isActive: false },
      });
      if (!changed.count)
        throw new ConflictException(
          'Category is already archived or unavailable.',
        );
      await db.staffAudit.create({
        data: { staffUserId: actorId, categoryId, action: 'CATEGORY_ARCHIVED' },
      });
      return db.category.findUniqueOrThrow({ where: { id: categoryId } });
    });
  }
  async upload(
    actorId: string,
    productId: string,
    altText: unknown,
    file?: { buffer: Buffer },
  ) {
    id(productId);
    if (!file?.buffer || file.buffer.length > receiptLimit)
      throw new BadRequestException('Choose a PNG or JPEG image up to 5 MB.');
    let contentType: string;
    try {
      contentType = receiptImage(file.buffer);
    } catch {
      throw new BadRequestException(
        'Choose a valid PNG or JPEG image up to 5 MB and 8,192 pixels per side.',
      );
    }
    const alt = text(altText, 'image alternative text');
    return this.write(async (db) => {
      // Serialize uploads and product edits so the image cap and archive checks are atomic.
      const locked = await db.product.updateMany({
        where: { id: productId, archivedAt: null },
        data: { version: { increment: 1 } },
      });
      if (!locked.count)
        throw new NotFoundException('Product is archived or unavailable.');
      if (
        (await db.productImage.count({
          where: { productId, archivedAt: null },
        })) >= 5
      )
        throw new BadRequestException('A product can have up to five images.');
      const image = await db.productImage.create({
        data: {
          productId,
          altText: alt,
          contentType,
          content: Uint8Array.from(file.buffer),
        },
        select: imageMetadata,
      });
      await db.staffAudit.create({
        data: {
          staffUserId: actorId,
          productId,
          action: 'PRODUCT_IMAGE_ADDED',
        },
      });
      return image;
    });
  }
  removeImage(actorId: string, productId: string, imageId: string) {
    id(productId);
    id(imageId);
    return this.write(async (db) => {
      const locked = await db.product.updateMany({
        where: { id: productId, archivedAt: null },
        data: { version: { increment: 1 } },
      });
      if (!locked.count)
        throw new NotFoundException('Product is archived or unavailable.');
      const changed = await db.productImage.updateMany({
        where: { id: imageId, productId, archivedAt: null },
        data: { archivedAt: new Date() },
      });
      if (!changed.count) throw new NotFoundException('Image was not found.');
      await db.staffAudit.create({
        data: {
          staffUserId: actorId,
          productId,
          action: 'PRODUCT_IMAGE_REMOVED',
        },
      });
    });
  }
  publicImages(productId: string) {
    id(productId);
    return this.prisma.database.productImage.findMany({
      where: {
        productId,
        archivedAt: null,
        product: {
          publicationStatus: 'PUBLISHED',
          isAvailable: true,
          archivedAt: null,
          category: { isActive: true, archivedAt: null },
        },
      },
      select: imageMetadata,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }
  async image(imageId: string, staff = false) {
    id(imageId);
    const image = await this.prisma.database.productImage.findFirst({
      where: {
        id: imageId,
        archivedAt: null,
        ...(staff
          ? {}
          : {
              product: {
                publicationStatus: 'PUBLISHED',
                isAvailable: true,
                archivedAt: null,
                category: { isActive: true, archivedAt: null },
              },
            }),
      },
    });
    if (!image) throw new NotFoundException('Image is unavailable.');
    return image;
  }
  audit(productId?: string, categoryId?: string) {
    const where = productId
      ? { productId: id(productId) }
      : { categoryId: id(categoryId) };
    return this.prisma.database.staffAudit.findMany({
      where,
      select: {
        id: true,
        action: true,
        occurredAt: true,
        staffUser: { select: { username: true, displayName: true } },
      },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
    });
  }
}
