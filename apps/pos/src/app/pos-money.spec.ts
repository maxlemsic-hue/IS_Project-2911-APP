import { money, priceUnits } from './pos-money';
describe('POS exact estimates', () => {
  it('sums different prices and quantities without floating-point arithmetic', () => {
    expect(money(priceUnits('12.3456') * 17n + priceUnits('18') * 25n)).toBe('₱659.8752');
  });
  it('retains cents and optional extra precision', () => {
    expect(money(priceUnits('0'))).toBe('₱0.00');
    expect(money(priceUnits('22.5000'))).toBe('₱22.50');
    expect(money(priceUnits('0.0001'))).toBe('₱0.0001');
  });
});
