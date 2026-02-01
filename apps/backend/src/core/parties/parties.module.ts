import { Module, Global } from '@nestjs/common';
import { PartiesService } from './parties.service';

@Global()
@Module({
  providers: [PartiesService],
  exports: [PartiesService],
})
export class PartiesModule {}
