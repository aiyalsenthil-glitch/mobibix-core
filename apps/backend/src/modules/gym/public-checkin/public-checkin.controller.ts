import { Controller, Post, Body } from '@nestjs/common';
import { PublicCheckinService } from './public-checkin.service';
import { Public } from '../../../core/auth/decorators/public.decorator';

@Public()
@Controller('public/checkin')
export class PublicCheckinController {
  constructor(private readonly service: PublicCheckinService) {}

  // STEP A: Lookup member by phone
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
