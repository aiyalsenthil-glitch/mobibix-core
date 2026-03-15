import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BusinessCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async listActive() {
    return this.prisma.businessCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async listAll() {
    return this.prisma.businessCategory.findMany({
      orderBy: [{ isActive: 'desc' }, { sortOrder: 'asc' }],
    });
  }

  async create(data: {
    name: string;
    description?: string;
    isComingSoon?: boolean;
    sortOrder?: number;
  }) {
    return this.prisma.businessCategory.create({
      data: {
        name: data.name,
        description: data.description,
        isComingSoon: data.isComingSoon ?? false,
        sortOrder: data.sortOrder ?? 0,
        isActive: true,
      },
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      isComingSoon?: boolean;
      isActive?: boolean;
      sortOrder?: number;
    },
  ) {
    return this.prisma.businessCategory.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.businessCategory.delete({
      where: { id },
    });
  }
}
