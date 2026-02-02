import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../../../core/auth/decorators/public.decorator';
import { JobCardsService } from '../jobcard/job-cards.service';

@Controller('public/job')
export class PublicJobController {
  constructor(private readonly service: JobCardsService) {}

  @Public()
  @Get(':publicToken')
  get(@Param('publicToken') token: string) {
    return this.service.publicStatus(token);
  }
}
