import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
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
 * Reads the email-confirmation state out of a Supabase access token.
 *
 * The claim is NOT where it first appears to be: an access token carries no
 * top-level `email_confirmed_at`, and `email_verified` lives inside
 * `user_metadata` — that is where the OAuth providers and the email provider
 * both write it. Reading only the top level marked EVERY caller unverified.
 *
 * When nothing states it anywhere, the answer is "verified": the token shape
 * simply does not carry the fact, and treating silence as a denial locks out
 * every user of such a token. Only an explicit falsy value denies.
 */
function readEmailVerified(claims: Record<string, unknown>): boolean {
  const meta = claims.user_metadata as Record<string, unknown> | undefined;
  const stated = [
    claims.email_verified,
    claims.email_confirmed_at,
    meta?.['email_verified'],
    meta?.['email_confirmed_at'],
  ].find((value) => value !== undefined && value !== null);
  return stated === undefined ? true : Boolean(stated);
}

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
    if (isPublic) {
      // Optional identity (chat personalization): a public route stays public,
      // but a PRESENT, VALID bearer still attaches the user. Invalid/expired
      // tokens are ignored — never a 401 on a public route.
      await this.tryAttachIdentity(
        context.switchToHttp().getRequest<AuthenticatedRequest>(),
      );
      return true;
    }

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
      emailVerified: readEmailVerified(claims),
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
    // Enforced here, not left to the Supabase project's "Confirm email" toggle:
    // the whole mirror relies on a JWT proving the caller owns the address (it
    // is what makes relinking an existing row by email safe), so an unconfirmed
    // address must not reach a protected route even if that toggle is off.
    if (!identity.emailVerified) {
      throw new ForbiddenException({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Confirm your email address before using your account',
      });
    }

    // `currentUser` may be null on the first /auth/sync call — that's fine.
    req.supabaseUser = identity;
    req.currentUser = await this.prisma.user.findUnique({
      where: { supabaseId: identity.sub },
    });

    return true;
  }

  /** Best-effort identity attach for public routes — swallows every failure. */
  private async tryAttachIdentity(req: AuthenticatedRequest): Promise<void> {
    const token = this.extractToken(req);
    if (!token) return;
    try {
      const payload = await this.verifyToken(token);
      const claims = payload as Record<string, unknown>;
      const sub = typeof payload.sub === 'string' ? payload.sub : '';
      const email = typeof claims.email === 'string' ? claims.email : '';
      if (!sub || !email) return;
      req.supabaseUser = {
        sub,
        email,
        emailVerified: readEmailVerified(claims),
        raw: claims,
      };
      req.currentUser = await this.prisma.user.findUnique({
        where: { supabaseId: sub },
      });
    } catch {
      // Public route: an invalid token is treated as anonymous, not an error.
    }
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
