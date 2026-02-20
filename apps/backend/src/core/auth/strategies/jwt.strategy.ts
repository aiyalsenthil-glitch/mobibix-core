import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req) => req?.cookies?.accessToken,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }
  async validate(payload: any) {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid JWT payload');
    }

    return {
      sub: payload.sub,
      tenantId: payload.tenantId ?? null,
      shopId: payload.shopId ?? null,
      userTenantId: payload.userTenantId ?? null,
      role: payload.role,
      isSystemOwner: payload.isSystemOwner ?? false,
      permissions: payload.permissions ?? [],
    };
  }
}
