import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { CustomerNotesService } from './customer-notes.service';
import { CustomerNotesController } from './customer-notes.controller';

@Module({
  imports: [HttpModule.register({ timeout: 10000 }), ConfigModule],
  controllers: [CustomersController, CustomerNotesController],
  providers: [CustomersService, CustomerNotesService],
  exports: [CustomersService],
})
export class CustomersModule {}
