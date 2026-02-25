import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AdminCorsService } from './admin-cors.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { IsString, IsOptional, IsBoolean, IsUrl } from 'class-validator';

class CreateCorsOriginDto {
  @IsUrl({
    require_tld: false, // allow localhost
    require_protocol: true,
    protocols: ['http', 'https'],
  })
  origin: string;

  @IsOptional()
  @IsString()
  label?: string;
}

class UpdateCorsOriginDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

@Controller('admin/cors')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminCorsController {
  constructor(private readonly corsService: AdminCorsService) {}

  @Get()
  findAll() {
    return this.corsService.findAll();
  }

  @Post()
  create(@Body() dto: CreateCorsOriginDto) {
    return this.corsService.create(dto.origin, dto.label);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCorsOriginDto) {
    return this.corsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.corsService.remove(id);
  }
}
