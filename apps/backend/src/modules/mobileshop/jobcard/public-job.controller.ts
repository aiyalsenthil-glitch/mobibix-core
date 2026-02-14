import { Controller, Get, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../../core/auth/decorators/public.decorator';
import { SkipSubscriptionCheck } from '../../../core/auth/decorators/skip-subscription-check.decorator';
import { JobCardsService } from '../jobcard/job-cards.service';

@Public()
@SkipSubscriptionCheck()
@Throttle({ default: { limit: 30, ttl: 60000 } }) // SECURITY: 30 requests per minute
@Controller('public/job')
export class PublicJobController {
  constructor(private readonly service: JobCardsService) {}

  @Get(':publicToken')
  get(@Param('publicToken') token: string) {
    return this.service.publicStatus(token);
  }
}
