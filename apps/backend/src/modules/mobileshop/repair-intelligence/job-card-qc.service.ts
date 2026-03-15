import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';

@Injectable()
export class JobCardQCService {
  constructor(private prisma: PrismaService) {}

  /**
   * 📋 Feature 7: Fetch or Upsert QC Checklist
   */
  async getQC(jobCardId: string) {
    return this.prisma.jobCardQC.findUnique({
      where: { jobCardId },
    });
  }

  async saveQC(user: any, jobCardId: string, data: any) {
    return this.prisma.jobCardQC.upsert({
      where: { jobCardId },
      update: {
        ...data,
        completedByUserId: user.sub,
        completedAt: new Date(),
      },
      create: {
        ...data,
        jobCardId,
        completedByUserId: user.sub,
        completedAt: new Date(),
      },
    });
  }

  /**
   * ✅ Enforce QC Check before moving to READY
   */
  async validateQCBeforeReady(jobCardId: string) {
    const qc = await this.prisma.jobCardQC.findUnique({
      where: { jobCardId },
    });

    if (!qc) {
      throw new BadRequestException('QC Checklist must be completed before marking as READY');
    }

    // Verify all technical checks are true (Requirement from prompt: Camera, Mic, Speaker, Charging, WiFi)
    const requiredChecks = [
      qc.cameraWorking,
      qc.micWorking,
      qc.speakerWorking,
      qc.chargingWorking,
      qc.wifiWorking,
    ];

    if (requiredChecks.some(check => check === false)) {
      throw new BadRequestException('All technical quality checks must pass before marking as READY');
    }

    return true;
  }
}
