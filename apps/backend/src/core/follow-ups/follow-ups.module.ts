import { Module } from '@nestjs/common';
import { WhatsAppModule } from '../../modules/whatsapp/whatsapp.module';
import { FollowUpsController } from './follow-ups.controller';
import { FollowUpsService } from './follow-ups.service';

@Module({
  imports: [WhatsAppModule],
  controllers: [FollowUpsController],
  providers: [FollowUpsService],
  exports: [FollowUpsService],
})
export class FollowUpsModule {}
