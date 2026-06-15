import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ApiResponse } from '@tourism/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SKIP_TRANSFORM_KEY } from '../decorators/skip-transform.decorator';

/**
 * Global response interceptor that normalizes every successful controller
 * return value into the standard `ApiResponse` envelope. Controllers return
 * domain types; the wire format is the framework's responsibility.
 *
 * Failure path is handled by `HttpExceptionFilter`. Registered globally via
 * `APP_INTERCEPTOR`. (Ported from donor.)
 *
 * @template T Type of the inner `data` payload.
 */
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T> | T>
{
  constructor(private readonly reflector: Reflector) {}

  intercept(
    ctx: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T> | T> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_TRANSFORM_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    // Branch 0 — opt-out (e.g. payment webhook ack).
    if (skip) {
      return next.handle();
    }

    return next.handle().pipe(
      map((payload) => {
        // Branch 1 — already a fully-shaped envelope. Detect via `data` AND
        // (`error` or `meta`); strict enough that a domain object named `data`
        // won't false-match.
        if (
          payload &&
          typeof payload === 'object' &&
          'data' in (payload as object) &&
          ('error' in (payload as object) || 'meta' in (payload as object))
        ) {
          return payload as unknown as ApiResponse<T>;
        }

        // Branch 2 — list-with-meta convention: `{ items, meta }` → hoist meta,
        // unwrap items to data.
        if (
          payload &&
          typeof payload === 'object' &&
          'meta' in (payload as Record<string, unknown>) &&
          'items' in (payload as Record<string, unknown>)
        ) {
          const obj = payload as unknown as {
            items: T;
            meta: Record<string, unknown>;
          };
          return { data: obj.items, error: null, meta: obj.meta };
        }

        // Branch 3 — plain value (single resource, primitive, null).
        return { data: payload, error: null };
      }),
    );
  }
}
