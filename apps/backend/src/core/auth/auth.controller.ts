// apps/backend/src/core/auth/auth.controller.ts
import { Body, Controller, Post, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ExchangeDto } from './dto/exchange.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('exchange')
  async exchange(@Body() body: ExchangeDto) {
    const { idToken } = body;

    if (!idToken) {
      throw new BadRequestException('idToken is required');
    }

    // 1️⃣ Verify Firebase ID token
    const decoded = await this.authService.verifyFirebaseIdToken(idToken);

    // 2️⃣ Find or create user
    // (role + tenant handled internally: owner / staff invite)
    const user = await this.authService.findOrCreateUser(decoded);

    // 3️⃣ Issue backend JWT
    const token = this.authService.createBackendToken(user);

    return {
      token,
      userId: user.id,
      tenantId: user.tenantId ?? null,
      role: user.role,
    };
  }
}
