import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { PurchaseOrderService } from './purchase-order.service';
import { CreatePurchaseOrderDto } from './dto/po/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/po/update-purchase-order.dto';
import { PurchaseOrderResponseDto } from './dto/po/purchase-order.response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, POStatus } from '@prisma/client';

@Controller('purchase-orders')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class PurchaseOrderController {
  constructor(private readonly poService: PurchaseOrderService) {}

  @Post()
  @HttpCode(201)
  async create(
    @Req() req: any,
    @Body() dto: CreatePurchaseOrderDto,
  ): Promise<PurchaseOrderResponseDto> {
    return this.poService.create(req.user.tenantId, dto);
  }

  @Get()
  async findAll(
    @Req() req: any,
    @Query('shopId') shopId?: string,
    @Query('supplierId') supplierId?: string,
    @Query('status') status?: POStatus,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ) {
    return this.poService.findAll(req.user.tenantId, {
      shopId,
      supplierId,
      status,
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }

  @Get(':id')
  async findOne(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<PurchaseOrderResponseDto> {
    return this.poService.findOne(req.user.tenantId, id);
  }

  @Patch(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseOrderDto,
  ): Promise<PurchaseOrderResponseDto> {
    return this.poService.update(req.user.tenantId, id, dto);
  }

  @Post(':id/transition')
  @HttpCode(200)
  async transition(
    @Req() req: any,
    @Param('id') id: string,
    @Body('status') newStatus: POStatus,
  ): Promise<PurchaseOrderResponseDto> {
    return this.poService.transitionStatus(
      req.user.tenantId,
      id,
      newStatus,
      req.user.sub,
    );
  }
}
