import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

import { PrismaService } from '../prisma/prisma.service';
import { FirebaseAdminService } from '../REMOVED_AUTH_PROVIDER/REMOVED_AUTH_PROVIDERAdmin';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard, // 🔥 PROVIDE HERE
    RolesGuard,
    PrismaService,
    FirebaseAdminService,
  ],
  exports: [
    JwtAuthGuard, // 🔥 EXPORT GUARD
    RolesGuard,
    JwtModule, // 🔥 EXPORT JwtService
  ],
})
export class AuthModule {}
