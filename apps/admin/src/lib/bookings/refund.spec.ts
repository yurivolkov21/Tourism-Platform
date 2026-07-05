import { validateRefundAmount } from './refund';

describe('validateRefundAmount', () => {
  it('accepts a value between 0 and the total', () => {
    expect(validateRefundAmount('30', '99.00')).toEqual({ amount: 30 });
    expect(validateRefundAmount('99.00', '99.00')).toEqual({ amount: 99 });
  });
  it('rejects zero, negative, or > total', () => {
    expect(validateRefundAmount('0', '99.00').error).toBeTruthy();
    expect(validateRefundAmount('-5', '99.00').error).toBeTruthy();
    expect(validateRefundAmount('120', '99.00').error).toBeTruthy();
  });
  it('rejects a non-number or more than 2 decimals', () => {
    expect(validateRefundAmount('abc', '99.00').error).toBeTruthy();
    expect(validateRefundAmount('10.005', '99.00').error).toBeTruthy();
  });
});
