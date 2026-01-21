import { Controller, Get, Param } from '@nestjs/common';
import { JobCardsService } from '../jobcard/job-cards.service';

@Controller('public/job')
export class PublicJobController {
  constructor(private readonly service: JobCardsService) {}

  @Get(':publicToken')
  get(@Param('publicToken') token: string) {
    return this.service.publicStatus(token);
  }
}
