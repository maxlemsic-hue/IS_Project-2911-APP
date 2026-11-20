import { BadRequestException } from '@nestjs/common';
import {
  enteredCents,
  paymentAmounts,
  php,
  receiptImage,
  receiptLimit,
} from './payment-rules.js';

describe('Order payment rules', () => {
  it('rounds the snapshot total half up and rounds the minimum deposit up to the cent', () => {
    const totals = paymentAmounts('10.0050', 500n);
    expect(php(totals.due)).toBe('10.01');
    expect(php(totals.deposit)).toBe('5.01');
    expect(totals.verified).toBeLessThan(totals.deposit);
  });

  it.each([0, 1, '0', '1e3', '-1', '12.345', '1,000', ' 12', '1'.repeat(29)])(
    'rejects invalid verified amount %j',
    (value) => expect(() => enteredCents(value)).toThrow(BadRequestException),
  );

  it('preserves decimal precision without floating-point arithmetic', () => {
    expect(php(enteredCents('99999999999999999999999.99'))).toBe(
      '99999999999999999999999.99',
    );
  });

  it('rejects HTML, truncated signatures and oversized inputs', () => {
    expect(() => receiptImage(Buffer.from('<svg/>'))).toThrow(
      BadRequestException,
    );
    expect(() =>
      receiptImage(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    ).toThrow(BadRequestException);
    expect(() => receiptImage(Buffer.alloc(receiptLimit + 1))).toThrow(
      BadRequestException,
    );
  });
});
