import { Module } from '@nestjs/common';
import { AppController } from './gym-app.controller';

@Module({
  controllers: [AppController],
})
export class GymAppModule {}
