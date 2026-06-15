import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ApiError, ApiResponse } from '@tourism/core';
import * as Sentry from '@sentry/node';
import { Request, Response } from 'express';

/**
 * Catch-all exception filter — converts any thrown error into the standard
 * `ApiResponse` envelope (`data: null` + structured `error`). Guarantees a
 * uniform client-facing error shape; hides stack traces from the wire; reports
 * 5xx to Sentry (ADR-0008). Registered globally via `APP_FILTER`. (Ported.)
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let error: ApiError = {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        error = { code: this.statusToCode(status), message: res };
      } else if (res && typeof res === 'object') {
        const r = res as Record<string, unknown>;
        const message =
          (Array.isArray(r.message)
            ? (r.message as string[]).join('; ')
            : (r.message as string)) ??
          (r.error as string) ??
          exception.message;
        error = {
          code: (r.code as string) ?? this.statusToCode(status),
          message,
          ...(r.details ? { details: r.details } : {}),
        };
      }
    } else if (exception instanceof Error) {
      error = { code: 'INTERNAL_SERVER_ERROR', message: exception.message };
    }

    // 5xx → log with stack + report to Sentry (no-op if SENTRY_DSN unset).
    // 4xx are expected client problems — no noise.
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${status}`,
        exception as Error,
      );
      Sentry.captureException(exception);
    }

    const body: ApiResponse<null> = { data: null, error };
    response.status(status).json(body);
  }

  /**
   * Maps common HTTP statuses to stable string codes so frontends switch on
   * `error.code`, not numeric status. Unlisted statuses fall back to
   * `INTERNAL_SERVER_ERROR` (usually a programmer mistake worth the loud label).
   */
  private statusToCode(status: number): string {
    const map: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.CONFLICT]: 'CONFLICT',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
      [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
    };
    return map[status] ?? 'INTERNAL_SERVER_ERROR';
  }
}
