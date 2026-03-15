import { Controller, Post, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PublicCheckinService } from './public-checkin.service';
import { Public } from '../../../core/auth/decorators/public.decorator';
import { SkipSubscriptionCheck } from '../../../core/auth/decorators/skip-subscription-check.decorator';

@Public()
@SkipSubscriptionCheck()
@Throttle({ default: { limit: 20, ttl: 60000 } }) // SECURITY: 20 requests per minute
@Controller('public/checkin')
export class PublicCheckinController {
  constructor(private readonly service: PublicCheckinService) {}

  // STEP A: Lookup member by phone
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // Even stricter: 10/min
  @Post('lookup')
  lookup(@Body() body: { tenantCode: string; phone: string }) {
    return this.service.lookupMember(body.tenantCode, body.phone);
  }

  // STEP B: Confirm check-in / check-out
  @Post('confirm')
  confirm(@Body() body: { tenantCode: string; memberId: string }) {
    return this.service.confirmAttendance(body.tenantCode, body.memberId);
  }
}
