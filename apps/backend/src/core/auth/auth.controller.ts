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

    // Pass tenantCode to AuthService to ensure correct tenant context
    return this.authService.loginWithFirebase(body.idToken, body.tenantCode);
  }
  @Public()
  @Post('google/exchange')
  exchangeToken(@Body() dto: GoogleExchangeDto) {
    return this.authService.exchangeGoogleToken(dto);
  }
  @Public()
  @Get('debug/REMOVED_AUTH_PROVIDER-claims')
  async debugFirebaseClaims(@Req() req: any) {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return { error: 'Missing Authorization Bearer token' };
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = await this.REMOVED_AUTH_PROVIDERAdmin.verifyIdToken(token);

    return decoded;
  }
}
