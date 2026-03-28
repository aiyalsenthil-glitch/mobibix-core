import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../core/prisma/prisma.service';

@Injectable()
export class FitnessJwtStrategy extends PassportStrategy(Strategy, 'fitness-jwt') {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => req?.cookies?.fitness_access_token,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    if (!payload.sub || payload.role !== 'FITNESS_USER') {
      throw new UnauthorizedException('Invalid fitness token');
    }
    const profile = await this.prisma.fitnessProfile.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, fullName: true, phone: true, goalType: true },
    });
    if (!profile) throw new UnauthorizedException('Fitness profile not found');
    return { fitnessProfileId: profile.id, ...profile };
  }
}
