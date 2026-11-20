import { fileURLToPath } from 'node:url';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { PrismaService } from '../dist/prisma/prisma.service.js';

// Master Price List, first sheet, rows 2, 3, 6 and 10. Public fields only.
const samples = [
  {
    name: 'The Gather Collection — Invitations',
    slug: 'the-gather-collection-invitations',
    products: [
      ['Little Gather', 'little-gather', '4 × 6 in', '18.00'],
      ['Classic Gather', 'classic-gather', '5 × 7 in', '27.00'],
    ],
  },
  {
    name: 'The Keepsake Collection — Magnets',
    slug: 'the-keepsake-collection-magnets',
    products: [['Mini Keepsake', 'mini-keepsake', '2 × 2 in', '20.00']],
  },
  {
    name: 'The Little Things Collection — Stickers',
    slug: 'the-little-things-collection-stickers',
    products: [['Tiny Things', 'tiny-things', '1–2 in sticker', '8.00']],
  },
];

config({
  path: fileURLToPath(new URL('../.env', import.meta.url)),
  quiet: true,
});
let prisma;
try {
  const target = new URL(process.env.DATABASE_URL || '');
  if (
    process.env.NODE_ENV === 'production' ||
    !['postgres:', 'postgresql:'].includes(target.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) ||
    target.searchParams.get('schema') !== 'public'
  ) {
    throw new Error('Sample seed requires a local public schema');
  }
  prisma = new PrismaService(new ConfigService(process.env));
  const count = await prisma.database.$transaction(async (db) => {
    let inserted = 0;
    for (const { name, slug, products } of samples) {
      const category =
        (await db.category.findUnique({ where: { slug } })) ??
        (await db.category.create({ data: { name, slug } }));
      for (const [
        productName,
        productSlug,
        specificationText,
        unitPrice,
      ] of products) {
        if (await db.product.findUnique({ where: { slug: productSlug } }))
          continue;
        await db.product.create({
          data: {
            categoryId: category.id,
            name: productName,
            slug: productSlug,
            specificationText,
            unitPrice,
            minimumOrderQuantity: 25,
            publicationStatus: 'PUBLISHED',
            isAvailable: true,
          },
        });
        inserted++;
      }
    }
    return inserted;
  });
  console.log(`Catalog sample products inserted: ${count}.`);
} catch {
  console.error(
    'Catalog sample seed failed. Verify the local connection and apply the approved catalog migration first.',
  );
  process.exitCode = 1;
} finally {
  await prisma?.onModuleDestroy();
}
