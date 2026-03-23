import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

// ─── Module-level caches (survive across requests) ───────────────────────────

// TTL cache: userId → { tokenVersion, expiresAt }
const tokenVersionCache = new Map<string, { tokenVersion: number; expiresAt: number }>();
const CACHE_TTL_MS = 30_000; // 30s — revoked tokens invalidate within this window

// Deduplication: userId → in-flight DB promise
// Prevents thundering herd when N parallel requests hit simultaneously on a cold cache
const pendingFetches = new Map<string, Promise<number | null>>(); 

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req) => req?.cookies?.accessToken,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      jsonWebTokenOptions: {
        clockTolerance: 30,
      },
    });
  }

  async validate(payload: any) {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid JWT payload');
    }

    let tokenVersion: number | null = null;
    const cached = tokenVersionCache.get(payload.sub);

    if (cached && cached.expiresAt > Date.now()) {
      // ✅ Cache hit — zero DB cost
      tokenVersion = cached.tokenVersion;
    } else {
      // Cache miss — deduplicate simultaneous fetches for the same userId
      let pending = pendingFetches.get(payload.sub);
      if (!pending) {
        pending = this.prisma.user
          .findUnique({
            where: { id: payload.sub, deletedAt: null },
            select: { tokenVersion: true },
          })
          .then((user) => {
            if (!user) return null;
            tokenVersionCache.set(payload.sub, {
              tokenVersion: user.tokenVersion,
              expiresAt: Date.now() + CACHE_TTL_MS,
            });
            return user.tokenVersion;
          })
          .finally(() => pendingFetches.delete(payload.sub));

        pendingFetches.set(payload.sub, pending);
      }
      // All concurrent callers await the same promise — only 1 DB call made
      tokenVersion = await pending;
    }

    if (tokenVersion === null || tokenVersion !== payload.tokenVersion) {
      tokenVersionCache.delete(payload.sub);
      return null;
    }

    return {
      id: payload.sub,
      userId: payload.sub,
      sub: payload.sub,
      tenantId: payload.tenantId ?? null,
      shopId: payload.shopId ?? null,
      userTenantId: payload.userTenantId ?? null,
      role: payload.role,
      isSystemOwner: payload.isSystemOwner ?? false,
      isDistributor: payload.isDistributor ?? false,
      tokenVersion,
      permissions: payload.permissions ?? [],
    };
  }
}

/** Call this when a user's token is revoked (logout, password change, etc.) */
export function evictTokenVersionCache(userId: string) {
  tokenVersionCache.delete(userId);
}
