import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../core/prisma/prisma.service';

@Injectable()
export class GymAttendanceCron implements OnModuleInit {
  private readonly logger = new Logger(GymAttendanceCron.name);

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {}

  @Cron('0 0 * * *') // every day at 12:00 AM
  async autoCheckout() {
    await this.prisma.gymAttendance.updateMany({
      where: {
        checkOutTime: null,
      },
      data: {
        checkOutTime: new Date(),
      },
    });
  }
}
