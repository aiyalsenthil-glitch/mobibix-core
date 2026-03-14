import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { 
  CreateFaultDiagnosisDto, 
  CreateRepairKnowledgeDto, 
  CreateFaultTypeDto 
} from './dto/knowledge.dto';

@Injectable()
export class KnowledgeService {
  constructor(private prisma: PrismaService) {}

  async createFaultType(dto: CreateFaultTypeDto) {
    return this.prisma.faultType.upsert({
      where: { name: dto.name },
      update: {},
      create: { name: dto.name },
    });
  }

  async getChecklist(faultTypeId: string, tenantId: string) {
    const checklists = await this.prisma.faultDiagnosis.findMany({
      where: {
        faultTypeId,
        OR: [{ tenantId }, { tenantId: null }],
      },
      include: {
        steps: {
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { tenantId: 'desc' },
      take: 1
    });
    return checklists[0] || null;
  }

  async getRepairNotes(phoneModelId: string | null, faultTypeId: string, tenantId: string) {
    return this.prisma.repairKnowledge.findMany({
      where: {
        phoneModelId,
        faultTypeId,
        OR: [{ tenantId }, { tenantId: null }],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createFaultDiagnosis(tenantId: string | null, dto: CreateFaultDiagnosisDto) {
    return this.prisma.$transaction(async (tx) => {
      // Clear existing diagnosis for this tenant + fault type to overwrite
      const existing = await tx.faultDiagnosis.findFirst({
        where: { tenantId, faultTypeId: dto.faultTypeId }
      });

      if (existing) {
        await tx.faultDiagnosisStep.deleteMany({
          where: { guideId: existing.id }
        });
        
        return tx.faultDiagnosis.update({
          where: { id: existing.id },
          data: {
            description: dto.description,
            steps: {
              create: dto.steps.map(s => ({
                order: s.order,
                stepText: s.stepText
              }))
            }
          },
          include: { steps: true }
        });
      }

      return tx.faultDiagnosis.create({
        data: {
          faultTypeId: dto.faultTypeId,
          tenantId,
          description: dto.description,
          steps: {
            create: dto.steps.map(s => ({
              order: s.order,
              stepText: s.stepText
            }))
          }
        },
        include: { steps: true }
      });
    });
  }

  async createRepairNote(tenantId: string | null, userId: string, dto: CreateRepairKnowledgeDto) {
    return this.prisma.repairKnowledge.create({
      data: {
        ...dto,
        tenantId,
        userId,
      },
    });
  }

  async getKnowledgeForJob(tenantId: string, jobCardId: string) {
    const job = await this.prisma.jobCard.findFirst({
      where: { id: jobCardId, tenantId },
      select: { deviceBrand: true, deviceModel: true, customerComplaint: true }
    });

    if (!job) throw new NotFoundException('Job card not found');

    // 1. Find FaultType (Best effort match by name for now, should ideally be selected in UI)
    const faultType = await this.prisma.faultType.findFirst({
      where: { name: { equals: job.customerComplaint, mode: 'insensitive' } }
    });

    if (!faultType) return { checklist: null, notes: [], jobDetails: job };

    // 2. Find PhoneModel (Best effort match)
    const phoneModel = await this.prisma.phoneModel.findFirst({
      where: {
        modelName: { equals: job.deviceModel, mode: 'insensitive' },
        brand: { name: { equals: job.deviceBrand, mode: 'insensitive' } }
      }
    });

    const [checklist, notes] = await Promise.all([
      this.getChecklist(faultType.id, tenantId),
      this.getRepairNotes(phoneModel?.id || null, faultType.id, tenantId)
    ]);

    return {
      checklist,
      notes,
      jobDetails: {
        brand: job.deviceBrand,
        model: job.deviceModel,
        problem: job.customerComplaint,
        phoneModelId: phoneModel?.id,
        faultTypeId: faultType.id
      }
    };
  }
}
