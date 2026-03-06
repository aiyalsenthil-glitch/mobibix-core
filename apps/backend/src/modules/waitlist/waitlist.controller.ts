import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WaitlistService } from './waitlist.service';
import { JoinWaitlistDto } from './dto/waitlist.dto';
import { Public } from '../../core/auth/decorators/public.decorator';

@ApiTags('Public')
@Controller('v1/public/waitlist')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Join the MobiBix waitlist' })
  @ApiResponse({ status: 201, description: 'Successfully joined waitlist' })
  async joinWaitlist(@Body() dto: JoinWaitlistDto) {
    return this.waitlistService.join(dto);
  }
}
