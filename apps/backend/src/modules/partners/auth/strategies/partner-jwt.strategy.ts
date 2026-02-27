import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PartnerJwtStrategy extends PassportStrategy(Strategy, 'partner-jwt') {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('PARTNER_JWT_SECRET') || configService.get<string>('JWT_SECRET')!,
    });
  }

  async validate(payload: any) {
    if (payload.role !== 'PARTNER') {
      throw new UnauthorizedException('Invalid partner token');
    }
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
