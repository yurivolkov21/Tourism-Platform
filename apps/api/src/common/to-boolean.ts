import { Transform } from 'class-transformer';

/**
 * Strict query-string → boolean mapping. `@Type(() => Boolean)` (and the global
 * `enableImplicitConversion`) coerce via `Boolean(value)`, so the string
 * `'false'` becomes `true` — `?isApproved=false` silently flipped filters
 * (Wave B2 adversarial-review finding). Only the literals `'true'`/`'false'`
 * (and real booleans) map; anything else is returned untouched so `@IsBoolean`
 * rejects it with a 400 instead of a silent coercion.
 */
export function toBooleanValue(value: unknown): unknown {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

/**
 * Property decorator: strict boolean transform for query DTOs (see
 * {@link toBooleanValue}). Reads the RAW value from `obj[key]` — with
 * `enableImplicitConversion`, the `value` argument arrives already coerced
 * (`Boolean('false') === true`), so it is useless for this purpose.
 */
export function ToBoolean(): PropertyDecorator {
  return Transform(({ obj, key }) =>
    toBooleanValue((obj as Record<string, unknown>)[key]),
  );
}
