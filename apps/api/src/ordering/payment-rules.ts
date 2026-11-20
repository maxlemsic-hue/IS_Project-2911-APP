import { BadRequestException } from '@nestjs/common';
import { crc32 } from 'node:zlib';

export const receiptLimit = 5 * 1024 * 1024;
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function validDimensions(width: number, height: number) {
  return width > 0 && height > 0 && width <= 8192 && height <= 8192;
}

function hasJpegFrame(content: Buffer) {
  if (
    content.length <= 16 ||
    content.readUInt16BE(0) !== 0xffd8 ||
    content.readUInt16BE(content.length - 2) !== 0xffd9
  )
    return false;
  let frame = false;
  let offset = 2;
  while (offset + 4 <= content.length && content[offset++] === 0xff) {
    while (offset < content.length && content[offset] === 0xff) offset++;
    const marker = content[offset++];
    if (offset + 2 > content.length) return false;
    const size = content.readUInt16BE(offset);
    if (size < 2 || offset + size > content.length - 2) return false;
    if (marker >= 0xc0 && marker <= 0xc2) {
      if (
        size < 8 ||
        !validDimensions(
          content.readUInt16BE(offset + 5),
          content.readUInt16BE(offset + 3),
        )
      )
        return false;
      frame = true;
    }
    if (marker === 0xda)
      return frame && size >= 6 && offset + size < content.length - 2;
    offset += size;
  }
  return false;
}

export function receiptImage(content: Buffer) {
  if (!content.length || content.length > receiptLimit)
    throw new BadRequestException('Choose an image of up to 5 MB.');
  if (content.subarray(0, 8).equals(pngSignature)) {
    let offset = 8;
    let hasPixels = false;
    while (offset + 12 <= content.length) {
      const length = content.readUInt32BE(offset);
      const kind = content.toString('ascii', offset + 4, offset + 8);
      const end = offset + 12 + length;
      if (end > content.length) break;
      if (
        crc32(content.subarray(offset + 4, end - 4)) !==
        content.readUInt32BE(end - 4)
      )
        break;
      if (
        offset === 8 &&
        (kind !== 'IHDR' ||
          length !== 13 ||
          !validDimensions(
            content.readUInt32BE(offset + 8),
            content.readUInt32BE(offset + 12),
          ))
      )
        break;
      if (kind === 'IDAT' && length) hasPixels = true;
      if (kind === 'IEND') {
        if (!length && hasPixels && end === content.length) return 'image/png';
        break;
      }
      offset = end;
    }
  }
  if (hasJpegFrame(content)) return 'image/jpeg';
  throw new BadRequestException(
    'Receipt must be a valid PNG or JPEG image up to 8,192 pixels per side.',
  );
}

export function enteredCents(value: unknown) {
  if (
    typeof value !== 'string' ||
    !/^(0|[1-9]\d{0,27})(\.\d{1,2})?$/.test(value)
  )
    throw new BadRequestException(
      'Enter the PHP amount actually received, with up to two decimal places.',
    );
  const cents = roundedCents(value);
  if (!cents)
    throw new BadRequestException('Amount received must be greater than zero.');
  return cents;
}

export function roundedCents(value: string) {
  const [whole, fraction = ''] = value.split('.');
  return (
    BigInt(whole) * 100n +
    BigInt(fraction.padEnd(2, '0').slice(0, 2)) +
    (fraction.length > 2 && fraction[2] >= '5' ? 1n : 0n)
  );
}

export function php(cents: bigint) {
  return `${cents / 100n}.${(cents % 100n).toString().padStart(2, '0')}`;
}

export function paymentAmounts(total: string, verified: bigint) {
  const due = roundedCents(total);
  const deposit = (due + 1n) / 2n;
  return { due, deposit, verified };
}
