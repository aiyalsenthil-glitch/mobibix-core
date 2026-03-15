import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseAdminService } from '../REMOVED_AUTH_PROVIDER/REMOVED_AUTH_PROVIDERAdmin';
import { AuthVerificationService } from './services/auth-verification.service';
import { UserResolutionService } from './services/user-resolution.service';
import { TokenFactoryService } from './services/token-factory.service';
import { RefreshTokenCleanupCron } from './services/refresh-token-cleanup.cron';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET environment variable is not defined');
        }
        return {
          secret,
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthVerificationService,
    UserResolutionService,
    TokenFactoryService,
    RefreshTokenCleanupCron, // ✅ Weekly token cleanup
    JwtAuthGuard,
    RolesGuard,
    JwtStrategy,
    PrismaService,
    FirebaseAdminService,
  ],
  exports: [JwtAuthGuard, RolesGuard, JwtModule, PassportModule],
})
export class AuthModule {}
