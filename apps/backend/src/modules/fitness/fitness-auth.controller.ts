import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  HttpCode,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../core/auth/decorators/public.decorator';
import { SkipSubscriptionCheck } from '../../core/auth/decorators/skip-subscription-check.decorator';
import { FitnessAuthService } from './fitness-auth.service';
import { randomBytes } from 'crypto';
import type { Response, Request } from 'express';

@Controller('fitness/auth')
@Public()
@SkipSubscriptionCheck()
export class FitnessAuthController {
  constructor(private readonly fitnessAuthService: FitnessAuthService) {}

  private cookieOptions(maxAge: number) {
    const isProd = process.env.NODE_ENV === 'production';
    return {
      httpOnly: true,
      sameSite: isProd ? ('none' as const) : ('lax' as const),
      secure: isProd,
      maxAge,
      path: '/',
    };
  }

  private csrfOptions(maxAge: number) {
    const isProd = process.env.NODE_ENV === 'production';
    return {
      httpOnly: false,
      sameSite: isProd ? ('none' as const) : ('lax' as const),
      secure: isProd,
      maxAge,
      path: '/',
    };
  }

  @Post('REMOVED_AUTH_PROVIDER')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async loginWithFirebase(
    @Body() body: { idToken?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!body?.idToken) throw new UnauthorizedException('Missing idToken');

    const { accessToken, profile } = await this.fitnessAuthService.loginWithFirebase(body.idToken);

    const maxAge = this.fitnessAuthService.accessTokenTtlMs;
    res.cookie('fitness_access_token', accessToken, this.cookieOptions(maxAge));

    const csrfToken = randomBytes(32).toString('hex');
    res.cookie('csrfToken', csrfToken, this.csrfOptions(maxAge));
    res.cookie('fitness_session_hint', '1', this.csrfOptions(maxAge));

    return { profile, csrfToken };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const isProd = process.env.NODE_ENV === 'production';
    const clearOpts = {
      sameSite: isProd ? ('none' as const) : ('lax' as const),
      secure: isProd,
      path: '/',
    };
    res.clearCookie('fitness_access_token', clearOpts);
    res.clearCookie('fitness_session_hint', clearOpts);
    return { success: true };
  }
}
