import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { GoogleExchangeDto } from './dto/google-exchange.dto';
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('REMOVED_AUTH_PROVIDER')
  async loginWithFirebase(
    @Body() body: { idToken?: string; tenantCode?: string },
  ) {
    if (!body?.idToken) {
      throw new UnauthorizedException('Missing idToken');
    }

    return this.authService.loginWithFirebase(body.idToken);
  }
  @Public()
  @Post('google/exchange')
  exchangeToken(@Body() dto: GoogleExchangeDto) {
    return this.authService.exchangeGoogleToken(dto);
  }
}
