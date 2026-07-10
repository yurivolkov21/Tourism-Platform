import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import {
  createRemoteJWKSet,
  decodeProtectedHeader,
  errors as joseErrors,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyResult,
} from 'jose';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type {
  AuthenticatedRequest,
  SupabaseAuthIdentity,
} from '../types/authenticated-request';

/**
 * Global guard that verifies a Supabase JWT in the `Authorization` header and
 * attaches the identity (+ matching local user row) to the request. (Ported
 * from the donor.)
 *
 * - Supabase issues access tokens at the FRONTEND; the BE verifies them
 *   cryptographically (never trusts the FE).
 * - Modern Supabase signs asymmetrically (ES256/RS256/EdDSA) via a public
 *   JWKS endpoint — no shared secret. Legacy HS256 projects fall back to the
 *   configured secret.
 * - `req.currentUser` is the local DB row so downstream handlers needn't look
 *   it up. Runs BEFORE `RolesGuard`; `@Public()` routes short-circuit.
 */
@Injectable()
export class SupabaseJwtGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseJwtGuard.name);

  /** Cached remote JWKS fetcher (jose handles caching + refresh cooldown). */
  private readonly remoteJwks: ReturnType<typeof createRemoteJWKSet>;

  /** HS256 key bytes, or `null` when no legacy secret is set (modern projects). */
  private readonly hsKey: Uint8Array | null;

  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const jwksUrl = this.config.getOrThrow<string>('supabase.jwksUrl');
    this.remoteJwks = createRemoteJWKSet(new URL(jwksUrl), {
      cacheMaxAge: 10 * 60 * 1000, // 10 min — matches Supabase Edge cache
      cooldownDuration: 30 * 1000, // 30s between forced re-fetches
    });

    const hsSecret = this.config.get<string>('supabase.jwtSecret') ?? '';
    this.hsKey = hsSecret
      ? new Uint8Array(Buffer.from(hsSecret, 'utf8'))
      : null;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(req);

    if (!token) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Missing or malformed Authorization header',
      });
    }

    const payload = await this.verifyToken(token);

    const claims = payload as Record<string, unknown>;
    const emailClaim = claims.email;
    const subClaim = payload.sub;
    const identity: SupabaseAuthIdentity = {
      sub: typeof subClaim === 'string' ? subClaim : '',
      email: typeof emailClaim === 'string' ? emailClaim : '',
      emailVerified: Boolean(
        claims.email_verified ?? claims.email_confirmed_at,
      ),
      raw: claims,
    };

    if (!identity.sub) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'JWT missing sub claim',
      });
    }
    if (!identity.email) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'JWT missing email claim',
      });
    }

    // `currentUser` may be null on the first /auth/sync call — that's fine.
    req.supabaseUser = identity;
    req.currentUser = await this.prisma.user.findUnique({
      where: { supabaseId: identity.sub },
    });

    return true;
  }

  /** Extracts the bearer token; `null` when missing/malformed. */
  private extractToken(req: AuthenticatedRequest): string | null {
    const header = req.headers.authorization;
    if (!header || typeof header !== 'string') return null;
    const [scheme, value] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !value) return null;
    return value.trim();
  }

  /**
   * Verifies the JWT against the right key family. The `alg` header only PICKS
   * a verifier (decoding ≠ trusting); the JWKS path whitelists ES256/RS256/EdDSA
   * to prevent alg-confusion. jose errors collapse to a generic 401 (real
   * reason logged at WARN, never leaked to the client).
   */
  private async verifyToken(token: string): Promise<JWTPayload> {
    let alg: string;
    try {
      alg = decodeProtectedHeader(token).alg ?? '';
    } catch {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Invalid JWT format',
      });
    }

    try {
      let result: JWTVerifyResult<JWTPayload>;
      if (alg === 'HS256') {
        if (!this.hsKey) {
          throw new UnauthorizedException({
            code: 'UNAUTHORIZED',
            message:
              'HS256 token received but SUPABASE_JWT_SECRET is not configured. ' +
              'Migrate to asymmetric keys or set the legacy secret.',
          });
        }
        result = await jwtVerify(token, this.hsKey, { algorithms: ['HS256'] });
      } else {
        result = await jwtVerify(token, this.remoteJwks, {
          algorithms: ['ES256', 'RS256', 'EdDSA'],
        });
      }
      return result.payload;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      const reason =
        err instanceof joseErrors.JOSEError
          ? `${err.code}: ${err.message}`
          : (err as Error).message;
      this.logger.warn(`JWT verification failed (${reason})`);
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      });
    }
  }
}
