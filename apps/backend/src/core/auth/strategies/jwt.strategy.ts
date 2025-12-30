import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET as string,
    });
  }
  async validate(payload: any) {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid JWT payload');
    }

    return {
      sub: payload.sub, // ✅ MUST be `sub`
      tenantId: payload.tenantId ?? null,
      role: payload.role,
      permissions: payload.permissions ?? [],
    };
  }
}
