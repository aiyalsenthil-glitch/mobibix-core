import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../core/prisma/prisma.service';

@Injectable()
export class GymAttendanceCron implements OnModuleInit {
  private readonly logger = new Logger(GymAttendanceCron.name);

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.logger.log('🔥 GymAttendanceCron CONSTRUCTOR LOADED');
  }

  @Cron('59 23 * * *') // production
  //@Cron('*/10 * * * * *') // every 10 seconds
  async autoCloseAttendance() {
    const now = new Date();

    const result = await this.prisma.gymAttendance.updateMany({
      where: { checkOutTime: null },
      data: { checkOutTime: now },
    });

    if (result.count > 0) {
      this.logger.log(`Auto-closed ${result.count} attendance records`);
    }
  }
}
