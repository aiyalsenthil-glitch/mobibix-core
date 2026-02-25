import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { BusinessCategoryService } from './business-category.service';

@Controller('platform/business-categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BusinessCategoryController {
  constructor(
    private readonly businessCategoryService: BusinessCategoryService,
  ) {}

  // Public to authenticated users (used during onboarding)
  @Get()
  async listActive() {
    return this.businessCategoryService.listActive();
  }

  // Admin APIs
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get('all')
  async listAll() {
    return this.businessCategoryService.listAll();
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post()
  async create(
    @Body()
    data: {
      name: string;
      description?: string;
      isComingSoon?: boolean;
      sortOrder?: number;
    },
  ) {
    return this.businessCategoryService.create(data);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body()
    data: {
      name?: string;
      description?: string;
      isComingSoon?: boolean;
      isActive?: boolean;
      sortOrder?: number;
    },
  ) {
    return this.businessCategoryService.update(id, data);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.businessCategoryService.delete(id);
  }
}
