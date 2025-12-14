// apps/backend/src/auth/auth.controller.ts
import { Body, Controller, Post, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ExchangeDto } from './dto/exchange.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('exchange')
  async exchange(@Body() body: ExchangeDto) {
    const { idToken, tenantCode } = body;
    if (!idToken) {
      throw new BadRequestException('idToken is required');
    }

    // Verify Firebase ID token (returns auth.DecodedIdToken)
    const decoded = await this.authService.verifyFirebaseIdToken(idToken);

    // Upsert / find user and attach tenant if tenantCode provided
    const user = await this.authService.findOrCreateUser(decoded, tenantCode);

    // Issue backend JWT
    const token = this.authService.createBackendToken(user);

    return {
      token,
      userId: user.id,
      tenantId: user.tenantId || null,
      role: user.role,
    };
  }
}
