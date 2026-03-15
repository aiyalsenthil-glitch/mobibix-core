import { Module } from '@nestjs/common';
import { PartnersService } from './partners.service';
import { PartnersController } from './partners.controller';
import { PartnerAuthService } from './auth/partner-auth.service';
import { PartnerAuthController } from './auth/partner-auth.controller';
import { PartnerJwtStrategy } from './auth/strategies/partner-jwt.strategy';
import { PartnerExpiryCron } from './partner-expiry.cron';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { EmailModule } from '../../common/email/email.module';

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [PartnersController, PartnerAuthController],
  providers: [PartnersService, PartnerAuthService, PartnerJwtStrategy, PartnerExpiryCron],
  exports: [PartnersService],
})
export class PartnersModule {}
