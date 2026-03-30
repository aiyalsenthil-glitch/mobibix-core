import { Module } from '@nestjs/common';
import { CoreModule } from '../../core/core.module';
import { LedgerController } from './ledger.controller';
import { LedgerService } from './ledger.service';
import { LedgerRemindersCron } from './ledger-reminders.cron';

@Module({
  imports: [CoreModule],
  controllers: [LedgerController],
  providers: [LedgerService, LedgerRemindersCron],
})
export class LedgerModule {}
