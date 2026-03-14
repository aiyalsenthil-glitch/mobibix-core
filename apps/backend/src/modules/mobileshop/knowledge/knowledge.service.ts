import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CreateFaultDiagnosisDto, CreateRepairNoteDto } from './dto/knowledge.dto';

@Injectable()
export class KnowledgeService {
  constructor(private prisma: PrismaService) {}

  async getChecklist(faultType: string, tenantId: string) {
    // Try to find tenant-specific checklist first, then fall back to global (tenantId: null)
    const checklists = await this.prisma.faultDiagnosis.findMany({
      where: {
        faultType: { equals: faultType, mode: 'insensitive' },
        OR: [{ tenantId }, { tenantId: null }],
      },
      orderBy: { tenantId: 'desc' }, // Non-null tenantId comes first
      take: 1
    });
    return checklists[0] || null;
  }

  async getRepairNotes(brand: string, model: string, faultType: string, tenantId: string) {
    return this.prisma.repairKnowledge.findMany({
      where: {
        brand: { equals: brand, mode: 'insensitive' },
        model: { equals: model, mode: 'insensitive' },
        faultType: { equals: faultType, mode: 'insensitive' },
        OR: [{ tenantId }, { tenantId: null }],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createFaultDiagnosis(tenantId: string | null, dto: CreateFaultDiagnosisDto) {
    return this.prisma.faultDiagnosis.upsert({
      where: { faultType: dto.faultType },
      update: {
        steps: dto.steps,
        description: dto.description,
        tenantId,
      },
      create: {
        ...dto,
        tenantId,
      },
    });
  }

  async createRepairNote(tenantId: string | null, userId: string, dto: CreateRepairNoteDto) {
    return this.prisma.repairKnowledge.create({
      data: {
        ...dto,
        tenantId,
        userId,
      },
    });
  }

  /**
   * Quick access integration for Job Cards
   */
  async getKnowledgeForJob(tenantId: string, jobCardId: string) {
    const job = await this.prisma.jobCard.findFirst({
        where: { id: jobCardId, tenantId },
        select: { deviceBrand: true, deviceModel: true, customerComplaint: true }
    });

    if (!job) return null;

    const [checklist, notes] = await Promise.all([
        this.getChecklist(job.customerComplaint, tenantId),
        this.getRepairNotes(job.deviceBrand, job.deviceModel, job.customerComplaint, tenantId)
    ]);

    return {
        checklist,
        notes,
        jobDetails: {
            brand: job.deviceBrand,
            model: job.deviceModel,
            problem: job.customerComplaint
        }
    };
  }
}
