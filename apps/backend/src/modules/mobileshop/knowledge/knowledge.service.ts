import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { RepairKnowledgeStatus, RepairKnowledgeSource } from '@prisma/client';
import {
  CreateFaultDiagnosisDto,
  CreateRepairKnowledgeDto,
  CreateFaultTypeDto,
} from './dto/knowledge.dto';

// 12 hours in milliseconds — knowledge rarely changes
const KNOWLEDGE_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

@Injectable()
export class KnowledgeService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // ──────────────────────────────────────────────
  // FAULT TYPES (Admin managed dropdown source)
  // ──────────────────────────────────────────────

  async createFaultType(dto: CreateFaultTypeDto) {
    return this.prisma.faultType.upsert({
      where: { name: dto.name },
      update: {},
      create: { name: dto.name },
    });
  }

  async listFaultTypes() {
    return this.prisma.faultType.findMany({
      orderBy: { name: 'asc' },
    });
  }

  // ──────────────────────────────────────────────
  // DIAGNOSIS CHECKLIST
  // ──────────────────────────────────────────────

  async getChecklist(faultTypeId: string, tenantId: string) {
    const cacheKey = `knowledge:checklist:${tenantId}:${faultTypeId}`;
    const cached = await this.cacheManager.get<any>(cacheKey);
    if (cached) return cached;

    const checklists = await this.prisma.faultDiagnosis.findMany({
      where: {
        faultTypeId,
        OR: [{ tenantId }, { tenantId: null }],
      },
      include: {
        steps: { orderBy: { order: 'asc' } },
        faultType: true,
      },
      // tenant-specific (non-null tenantId) sorts after null when DESC,
      // so we take the first which will be the tenant override
      orderBy: { tenantId: 'desc' },
      take: 1,
    });

    const result = checklists[0] || null;
    if (result) await this.cacheManager.set(cacheKey, result, KNOWLEDGE_CACHE_TTL_MS);
    return result;
  }

  async createFaultDiagnosis(tenantId: string | null, dto: CreateFaultDiagnosisDto) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.faultDiagnosis.findFirst({
        where: { tenantId, faultTypeId: dto.faultTypeId },
      });

      if (existing) {
        // Cascade delete takes care of old steps
        await tx.faultDiagnosisStep.deleteMany({ where: { guideId: existing.id } });
        const updated = await tx.faultDiagnosis.update({
          where: { id: existing.id },
          data: {
            description: dto.description,
            steps: {
              create: dto.steps.map((s) => ({ order: s.order, stepText: s.stepText })),
            },
          },
          include: { steps: true, faultType: true },
        });
        await this._bustChecklistCache(tenantId, dto.faultTypeId);
        return updated;
      }

      const created = await tx.faultDiagnosis.create({
        data: {
          faultTypeId: dto.faultTypeId,
          tenantId,
          description: dto.description,
          steps: {
            create: dto.steps.map((s) => ({ order: s.order, stepText: s.stepText })),
          },
        },
        include: { steps: true, faultType: true },
      });
      await this._bustChecklistCache(tenantId, dto.faultTypeId);
      return created;
    });
  }

  // ──────────────────────────────────────────────
  // REPAIR NOTES
  // ──────────────────────────────────────────────

  async getRepairNotes(phoneModelId: string | null, faultTypeId: string, tenantId: string) {
    const cacheKey = `knowledge:notes:${tenantId}:${phoneModelId ?? 'generic'}:${faultTypeId}`;
    const cached = await this.cacheManager.get<any>(cacheKey);
    if (cached) return cached;

    const notes = await this.prisma.repairKnowledge.findMany({
      where: {
        phoneModelId,
        faultTypeId,
        status: RepairKnowledgeStatus.APPROVED,
        OR: [{ tenantId }, { tenantId: null }],
      },
      orderBy: [
        { helpfulCount: 'desc' }, // Best notes surface first
        { createdAt: 'desc' },
      ],
    });

    await this.cacheManager.set(cacheKey, notes, KNOWLEDGE_CACHE_TTL_MS);
    return notes;
  }

  async createRepairNote(
    tenantId: string | null,
    userId: string,
    dto: CreateRepairKnowledgeDto,
  ) {
    // Community notes require moderation; Admin/System notes are auto-approved
    const source = dto.source ?? RepairKnowledgeSource.COMMUNITY;
    const status =
      source === RepairKnowledgeSource.COMMUNITY
        ? RepairKnowledgeStatus.PENDING
        : RepairKnowledgeStatus.APPROVED;

    const note = await this.prisma.repairKnowledge.create({
      data: { ...dto, tenantId, userId, source, status },
    });

    // Bust cache for this combination so new approved notes appear immediately
    if (status === RepairKnowledgeStatus.APPROVED) {
      await this._bustNotesCache(tenantId, dto.phoneModelId ?? null, dto.faultTypeId);
    }
    return note;
  }

  async voteOnNote(noteId: string, vote: 'helpful' | 'notHelpful') {
    const field = vote === 'helpful' ? { helpfulCount: { increment: 1 } } : { notHelpfulCount: { increment: 1 } };
    const note = await this.prisma.repairKnowledge.update({
      where: { id: noteId },
      data: field,
    });
    await this._bustNotesCache(note.tenantId, note.phoneModelId, note.faultTypeId);
    return { success: true };
  }

  async moderateNote(noteId: string, status: RepairKnowledgeStatus) {
    const note = await this.prisma.repairKnowledge.update({
      where: { id: noteId },
      data: { status },
    });
    await this._bustNotesCache(note.tenantId, note.phoneModelId, note.faultTypeId);
    return note;
  }

  // ──────────────────────────────────────────────
  // JOB CARD INTEGRATION
  // ──────────────────────────────────────────────

  async getKnowledgeForJob(tenantId: string, jobCardId: string) {
    const job = await this.prisma.jobCard.findFirst({
      where: { id: jobCardId, tenantId },
      select: { deviceBrand: true, deviceModel: true, customerComplaint: true },
    });

    if (!job) throw new NotFoundException('Job card not found');

    // Best-effort match fault type by complaint text
    const faultType = await this.prisma.faultType.findFirst({
      where: { name: { equals: job.customerComplaint, mode: 'insensitive' } },
    });

    if (!faultType) {
      return {
        checklist: null,
        notes: [],
        suggestedFaultTypes: await this._suggestFaultTypes(job.customerComplaint),
        jobDetails: { brand: job.deviceBrand, model: job.deviceModel, problem: job.customerComplaint },
      };
    }

    // Best-effort phone model resolution via existing compatibility data
    const phoneModel = await this.prisma.phoneModel.findFirst({
      where: {
        modelName: { equals: job.deviceModel, mode: 'insensitive' },
        brand: { name: { equals: job.deviceBrand, mode: 'insensitive' } },
      },
    });

    const [checklist, notes] = await Promise.all([
      this.getChecklist(faultType.id, tenantId),
      this.getRepairNotes(phoneModel?.id ?? null, faultType.id, tenantId),
    ]);

    return {
      checklist,
      notes,
      suggestedFaultTypes: null,
      jobDetails: {
        brand: job.deviceBrand,
        model: job.deviceModel,
        problem: job.customerComplaint,
        phoneModelId: phoneModel?.id ?? null,
        faultTypeId: faultType.id,
      },
    };
  }

  // ──────────────────────────────────────────────
  // PRIVATE HELPERS
  // ──────────────────────────────────────────────

  /** Return top 5 closest fault types when no exact match found */
  private async _suggestFaultTypes(complaint: string) {
    const words = complaint.toLowerCase().split(/\s+/).filter(Boolean);
    const all = await this.prisma.faultType.findMany({ select: { id: true, name: true } });
    // Simple word-overlap scoring — suitable for small sets (< 100 fault types)
    return all
      .map((ft) => {
        const nameWords = ft.name.toLowerCase().split(/\s+/);
        const score = words.filter((w) => nameWords.some((nw) => nw.includes(w))).length;
        return { ...ft, score };
      })
      .filter((ft) => ft.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ id, name }) => ({ id, name }));
  }

  private async _bustChecklistCache(tenantId: string | null, faultTypeId: string) {
    await this.cacheManager.del(`knowledge:checklist:${tenantId}:${faultTypeId}`);
  }

  private async _bustNotesCache(
    tenantId: string | null,
    phoneModelId: string | null,
    faultTypeId: string,
  ) {
    await this.cacheManager.del(
      `knowledge:notes:${tenantId}:${phoneModelId ?? 'generic'}:${faultTypeId}`,
    );
  }
}
