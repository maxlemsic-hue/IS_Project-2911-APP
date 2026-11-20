export function priceUnits(price: string) {
  const [whole, fraction = ''] = price.split('.');
  return BigInt(whole) * 10000n + BigInt(fraction.padEnd(4, '0'));
}
export function money(units: bigint) {
  const whole = (units / 10000n).toLocaleString('en-PH');
  const fraction = (units % 10000n)
    .toString()
    .padStart(4, '0')
    .replace(/0{0,2}$/, '')
    .padEnd(2, '0');
  return '₱' + whole + '.' + fraction;
}
