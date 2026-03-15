import { Module, Global } from '@nestjs/common';
import { DocumentNumberService } from './services/document-number.service';
import { PhoneService } from './services/phone.service';
import { PrismaModule } from '../core/prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [DocumentNumberService, PhoneService],
  exports: [DocumentNumberService, PhoneService],
})
export class CommonModule {}
