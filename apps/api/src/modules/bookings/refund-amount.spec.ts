import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { classifyRefund } from './refund-amount';

const D = (v: string | number) => new Prisma.Decimal(v);

describe('classifyRefund', () => {
  it('treats an omitted amount as a full refund', () => {
    expect(classifyRefund(D('99.00'))).toEqual({
      partial: false,
      amount: D('99.00'),
    });
  });

  it('treats amount equal to the total as a full refund', () => {
    expect(classifyRefund(D('99.00'), 99)).toEqual({
      partial: false,
      amount: D('99.00'),
    });
  });

  it('classifies a value below the total as partial', () => {
    const res = classifyRefund(D('99.00'), 30);
    expect(res.partial).toBe(true);
    expect(res.amount.equals(D('30'))).toBe(true);
  });

  it('rejects zero / negative amounts', () => {
    expect(() => classifyRefund(D('99.00'), 0)).toThrow(BadRequestException);
    expect(() => classifyRefund(D('99.00'), -5)).toThrow(BadRequestException);
  });

  it('rejects an amount above the total', () => {
    expect(() => classifyRefund(D('99.00'), 99.01)).toThrow(
      BadRequestException,
    );
  });
});
