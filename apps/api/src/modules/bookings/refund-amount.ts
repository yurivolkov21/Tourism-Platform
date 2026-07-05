import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/**
 * Classifies an admin refund request against the booking total. An omitted
 * amount (or one that equals the total) is a FULL refund; a value strictly
 * between 0 and the total is PARTIAL. Anything ≤0 or >total is rejected. The
 * returned `amount` is a `Decimal` for currency-safe provider conversion.
 */
export function classifyRefund(
  total: Prisma.Decimal,
  amount?: number,
): { partial: boolean; amount: Prisma.Decimal } {
  if (amount === undefined) return { partial: false, amount: total };
  if (amount <= 0 || amount > total.toNumber()) {
    throw new BadRequestException({
      code: 'INVALID_REFUND_AMOUNT',
      message: `Refund amount must be greater than 0 and at most the booking total (${total.toString()})`,
    });
  }
  const value = new Prisma.Decimal(amount);
  return { partial: !value.equals(total), amount: value };
}
