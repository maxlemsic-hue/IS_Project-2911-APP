import { BadRequestException } from '@nestjs/common';

export function record(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new BadRequestException('Enter valid catalog details.');
  return body as Record<string, unknown>;
}
export function text(value: unknown, label: string, max = 200) {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.trim().length > max ||
    value.split('').some((character) => character.charCodeAt(0) < 32)
  )
    throw new BadRequestException(`Enter ${label} of up to ${max} characters.`);
  return value.trim();
}
export function optionalText(value: unknown, max = 5000) {
  if (value === null || value === undefined || value === '') return null;
  if (
    typeof value !== 'string' ||
    value.trim().length > max ||
    value.includes(String.fromCharCode(0))
  )
    throw new BadRequestException(
      'Enter valid text within the supported length.',
    );
  return value.trim() || null;
}
export function id(value: unknown) {
  if (
    typeof value !== 'string' ||
    !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value)
  )
    throw new BadRequestException('Enter a valid catalog ID.');
  return value;
}
export function integer(value: unknown, minimum = 1) {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < minimum ||
    value > 2147483647
  )
    throw new BadRequestException(
      'Enter a whole number within the supported range.',
    );
  return value;
}
export function price(value: unknown) {
  if (
    typeof value !== 'string' ||
    !/^(0|[1-9]\d{0,13})(\.\d{1,4})?$/.test(value)
  )
    throw new BadRequestException(
      'Price must be a nonnegative decimal with up to 14 whole digits and 4 decimal places.',
    );
  return value;
}
function slug(value: unknown) {
  const result = text(value, 'a URL slug');
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(result))
    throw new BadRequestException(
      'Use lowercase words separated by hyphens for the slug.',
    );
  return result;
}
export function productInput(body: unknown) {
  const input = record(body);
  const allowed = [
    'name',
    'slug',
    'categoryId',
    'description',
    'specificationText',
    'unitPrice',
    'minimumOrderQuantity',
    'sellingUnitLabel',
    'publicationStatus',
    'isAvailable',
    'version',
    'attributes',
  ];
  if (Object.keys(input).some((key) => !allowed.includes(key)))
    throw new BadRequestException(
      'Unsupported product fields. SKU is assigned automatically.',
    );
  if (
    !['DRAFT', 'PUBLISHED'].includes(String(input.publicationStatus)) ||
    typeof input.isAvailable !== 'boolean'
  )
    throw new BadRequestException(
      'Choose Draft or Published and an availability value. Use Archive to archive a product.',
    );
  const attributes = input.attributes ?? [];
  if (!Array.isArray(attributes) || attributes.length > 30)
    throw new BadRequestException('Use up to 30 product attributes.');
  const seen = new Set<string>();
  const entries = attributes.map((entry: unknown, sortOrder: number) => {
    const attribute = record(entry);
    const key = text(attribute.key, 'an attribute key', 80).toLowerCase();
    if (seen.has(key))
      throw new BadRequestException('Attribute keys must be unique.');
    seen.add(key);
    return {
      key,
      label: text(attribute.label, 'an attribute label'),
      value: text(attribute.value, 'an attribute value', 2000),
      unit: optionalText(attribute.unit, 80),
      sortOrder,
    };
  });
  return {
    name: text(input.name, 'a product name'),
    slug: slug(input.slug),
    categoryId: id(input.categoryId),
    description: optionalText(input.description),
    specificationText: optionalText(input.specificationText),
    unitPrice: price(input.unitPrice),
    minimumOrderQuantity: integer(input.minimumOrderQuantity),
    sellingUnitLabel: text(input.sellingUnitLabel, 'a selling unit', 80),
    publicationStatus: input.publicationStatus as 'DRAFT' | 'PUBLISHED',
    isAvailable: input.isAvailable,
    attributes: entries,
  };
}
export function categoryInput(body: unknown) {
  const input = record(body);
  if (
    Object.keys(input).some(
      (key) =>
        !['name', 'slug', 'description', 'isActive', 'sortOrder'].includes(key),
    ) ||
    typeof input.isActive !== 'boolean'
  )
    throw new BadRequestException(
      'Enter valid category fields and an active value.',
    );
  return {
    name: text(input.name, 'a category name'),
    slug: slug(input.slug),
    description: optionalText(input.description),
    isActive: input.isActive,
    sortOrder: integer(input.sortOrder, 0),
  };
}
