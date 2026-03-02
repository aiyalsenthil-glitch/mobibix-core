import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { GRNService } from './grn.service';
import { CreateGRNDto } from './dto/grn/create-grn.dto';
import { GRNResponseDto } from './dto/grn/grn.response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('grns')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class GRNController {
  constructor(private readonly grnService: GRNService) {}

  @Post()
  @HttpCode(201)
  async create(
    @Req() req: any,
    @Body() dto: CreateGRNDto,
  ): Promise<GRNResponseDto> {
    return this.grnService.create(req.user.tenantId, dto);
  }

  @Get()
  async findAll(@Req() req: any, @Query('shopId') shopId?: string) {
    return this.grnService.findAll(req.user.tenantId, shopId);
  }

  @Get(':id')
  async findOne(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<GRNResponseDto> {
    return this.grnService.findOne(req.user.tenantId, id);
  }

  @Post(':id/confirm')
  @HttpCode(200)
  async confirm(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<GRNResponseDto> {
    return this.grnService.confirm(req.user.tenantId, id, {
      id: req.user.sub,
      role: req.user.role,
    });
  }
}
