import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => req?.cookies?.accessToken,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
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
      userTenantId: payload.userTenantId ?? null,
      role: payload.role,
      permissions: payload.permissions ?? [],
    };
  }
}
