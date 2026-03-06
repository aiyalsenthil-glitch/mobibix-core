import { Module } from '@nestjs/common';
import { WaitlistController } from './waitlist.controller';
import { EmailModule } from '../../common/email/email.module';
import { WaitlistService } from './waitlist.service';

@Module({
  imports: [EmailModule],
  controllers: [WaitlistController],
  providers: [WaitlistService],
})
export class WaitlistModule {}
