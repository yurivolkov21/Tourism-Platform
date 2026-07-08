import { formatMoney } from './money';

test('USD gets the dollar sign', () => {
  expect(formatMoney('USD', 120)).toBe('$120');
});

test('other currencies keep their code as a label', () => {
  expect(formatMoney('EUR', 99.5)).toBe('EUR 99.5');
});
