import { Module, Global } from '@nestjs/common';
import { DocumentNumberService } from './services/document-number.service';
import { PrismaModule } from '../core/prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [DocumentNumberService],
  exports: [DocumentNumberService],
})
export class CommonModule {}
