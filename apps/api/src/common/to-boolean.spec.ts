import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ListAdminReviewsQueryDto } from '../modules/reviews/dto/list-admin-reviews-query.dto';
import { toBooleanValue } from './to-boolean';

describe('toBooleanValue', () => {
  it('maps the query-string literals to real booleans', () => {
    expect(toBooleanValue('true')).toBe(true);
    expect(toBooleanValue('false')).toBe(false);
  });

  it('passes real booleans through', () => {
    expect(toBooleanValue(true)).toBe(true);
    expect(toBooleanValue(false)).toBe(false);
  });

  it('returns anything else untouched so IsBoolean rejects it (400, not coercion)', () => {
    expect(toBooleanValue('yes')).toBe('yes');
    expect(toBooleanValue('1')).toBe('1');
    expect(toBooleanValue('')).toBe('');
    expect(toBooleanValue(0)).toBe(0);
  });
});

describe('ToBoolean on a real query DTO (implicit-conversion regression)', () => {
  // The adversarial review proved `@Type(() => Boolean)` + the global
  // enableImplicitConversion turned `?isApproved=false` into `true` — the
  // Pending tab returned approved reviews. Lock the fixed behavior in.
  const opts = { enableImplicitConversion: true } as const;

  it("parses 'false' as real false and 'true' as true", () => {
    const pending = plainToInstance(
      ListAdminReviewsQueryDto,
      { isApproved: 'false' },
      opts,
    );
    expect(pending.isApproved).toBe(false);
    const approved = plainToInstance(
      ListAdminReviewsQueryDto,
      { isApproved: 'true' },
      opts,
    );
    expect(approved.isApproved).toBe(true);
  });

  it('rejects garbage instead of coercing it', () => {
    const dto = plainToInstance(
      ListAdminReviewsQueryDto,
      { isApproved: 'yes' },
      opts,
    );
    expect(validateSync(dto).length).toBeGreaterThan(0);
  });
});
