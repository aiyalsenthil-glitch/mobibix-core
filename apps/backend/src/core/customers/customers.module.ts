import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { CustomerNotesService } from './customer-notes.service';
import { CustomerNotesController } from './customer-notes.controller';

@Module({
  controllers: [CustomersController, CustomerNotesController],
  providers: [CustomersService, CustomerNotesService],
  exports: [CustomersService],
})
export class CustomersModule {}
