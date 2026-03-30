import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { FitnessAuthService } from './fitness-auth.service';
import { FitnessAuthController } from './fitness-auth.controller';
import { FitnessProfileController } from './fitness-profile.controller';
import { FitnessGymController } from './fitness-gym.controller';
import { FitnessMetricsController } from './fitness-metrics.controller';
import { FitnessProController } from './fitness-pro.controller';
import { FitnessAiController } from './fitness-ai.controller';
import { FitnessJwtStrategy } from './strategies/fitness-jwt.strategy';
import { FitnessJwtGuard } from './guards/fitness-jwt.guard';
import { PrismaService } from '../../core/prisma/prisma.service';
import { FirebaseAdminService } from '../../core/REMOVED_AUTH_PROVIDER/REMOVED_AUTH_PROVIDERAdmin';
import { AiModule } from '../../core/ai/ai.module';

@Module({
  imports: [
    PassportModule,
    AiModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [
    FitnessAuthController,
    FitnessProfileController,
    FitnessGymController,
    FitnessMetricsController,
    FitnessProController,
    FitnessAiController,
  ],
  providers: [
    FitnessAuthService,
    FitnessJwtStrategy,
    FitnessJwtGuard,
    PrismaService,
    FirebaseAdminService,
  ],
})
export class FitnessModule {}
