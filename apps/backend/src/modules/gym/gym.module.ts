import { Module } from '@nestjs/common';
import { GymMembersController } from './gym-members.controller';
import { MembersModule } from '../../core/members/members.module';
import { AuthModule } from '../../core/auth/auth.module';

@Module({
  imports: [AuthModule, MembersModule],
  controllers: [GymMembersController],
})
export class GymModule {}
