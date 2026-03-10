import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class CustomerNotesService {
  constructor(private readonly prisma: PrismaService) {}

  async listNotes(tenantId: string, customerId: string) {
    return this.prisma.customerNote.findMany({
      where: { tenantId, customerId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, fullName: true } },
      },
    });
  }

  async createNote(
    tenantId: string,
    customerId: string,
    authorId: string,
    content: string,
  ) {
    return this.prisma.customerNote.create({
      data: { tenantId, customerId, authorId, content },
      include: {
        author: { select: { id: true, fullName: true } },
      },
    });
  }

  async deleteNote(
    tenantId: string,
    customerId: string,
    noteId: string,
    userId: string,
    role: UserRole,
  ) {
    const note = await this.prisma.customerNote.findFirst({
      where: { id: noteId, tenantId, customerId, deletedAt: null },
    });

    if (!note) throw new NotFoundException('Note not found');

    // Only owner or the author can delete
    if (role !== UserRole.OWNER && note.authorId !== userId) {
      throw new ForbiddenException("Cannot delete another user's note");
    }

    return this.prisma.customerNote.update({
      where: { id: noteId },
      data: { deletedAt: new Date(), deletedBy: userId },
    });
  }
}
