import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { HsnService } from './hsn.service';

@Controller('core/hsn')
export class HsnController {
  constructor(private readonly hsnService: HsnService) {}

  // Using UseGuards if implied by other modules, but for now assuming public or global auth
  @Get('search')
  async search(@Query('query') query: string) {
    return this.hsnService.search(query || '');
  }
}
