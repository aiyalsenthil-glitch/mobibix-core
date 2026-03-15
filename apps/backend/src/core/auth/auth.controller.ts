import {
  Body,
  Controller,
  Post,
  UnauthorizedException,
  Get,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { GoogleExchangeDto } from './dto/google-exchange.dto';
import { FirebaseAdminService } from '../REMOVED_AUTH_PROVIDER/REMOVED_AUTH_PROVIDERAdmin';
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly REMOVED_AUTH_PROVIDERAdmin: FirebaseAdminService,
  ) {}

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
