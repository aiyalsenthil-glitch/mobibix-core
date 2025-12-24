import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('REMOVED_AUTH_PROVIDER')
  async loginWithFirebase(
    @Body() body: { idToken?: string; tenantCode?: string },
  ) {
    if (!body?.idToken) {
      throw new UnauthorizedException('Missing idToken');
    }

    return this.authService.loginWithFirebase(body.idToken);
  }
}
