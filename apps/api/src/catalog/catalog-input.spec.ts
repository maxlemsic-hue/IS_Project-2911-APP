import { BadRequestException } from '@nestjs/common';
import { categoryInput, price, productInput } from './catalog-input.js';

const product = {
  name: 'Sample print',
  slug: 'sample-print',
  categoryId: 'c2d8342f-70af-44c3-a813-bf01472cc1db',
  unitPrice: '12.3456',
  minimumOrderQuantity: 25,
  sellingUnitLabel: 'piece',
  publicationStatus: 'DRAFT',
  isAvailable: false,
};
describe('Catalog input', () => {
  it('retains exact decimal strings, specifications and attributes', () => {
    const value = productInput({
      ...product,
      specificationText: 'Front\nBack',
      attributes: [{ key: 'SIZE', label: 'Size', value: 'A5', unit: 'mm' }],
    });
    expect(value.unitPrice).toBe('12.3456');
    expect(value.specificationText).toBe('Front\nBack');
    expect(value.attributes[0].key).toBe('size');
  });
  it.each(['-1', '1.00001', '1e3', 'NaN', '100000000000000', 5, '', null])(
    'rejects invalid price %s',
    (value) => {
      expect(() => price(value)).toThrow(BadRequestException);
    },
  );
  it.each([0, 1.2, '25', 2147483648])(
    'rejects invalid minimum %s',
    (minimumOrderQuantity) => {
      expect(() => productInput({ ...product, minimumOrderQuantity })).toThrow(
        BadRequestException,
      );
    },
  );
  it('rejects supplied SKUs and arbitrary model fields', () => {
    expect(() => productInput({ ...product, sku: 'T29-P-000001' })).toThrow(
      BadRequestException,
    );
    expect(() => productInput({ ...product, estimatedUnitCost: '0' })).toThrow(
      BadRequestException,
    );
  });
  it('rejects duplicate normalized attribute keys', () => {
    const attribute = { key: 'SIZE', label: 'Size', value: 'A5' };
    expect(() =>
      productInput({
        ...product,
        attributes: [attribute, { ...attribute, key: 'size' }],
      }),
    ).toThrow(BadRequestException);
  });
  it('requires the dedicated archive action', () => {
    expect(() =>
      productInput({ ...product, publicationStatus: 'ARCHIVED' }),
    ).toThrow(BadRequestException);
  });
  it('validates category slugs, active flags and sort order', () => {
    expect(
      categoryInput({
        name: 'Cards',
        slug: 'cards',
        isActive: true,
        sortOrder: 2,
      }),
    ).toMatchObject({ name: 'Cards', sortOrder: 2 });
    expect(() =>
      categoryInput({
        name: 'Cards',
        slug: '../cards',
        isActive: true,
        sortOrder: 0,
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      categoryInput({
        name: 'Cards',
        slug: 'cards',
        isActive: 'true',
        sortOrder: 0,
      }),
    ).toThrow(BadRequestException);
  });
});
