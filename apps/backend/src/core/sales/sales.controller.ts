import {
  Body,
  Controller,
  Post,
  Req,
  BadRequestException,
  ForbiddenException,
  Get,
  Query,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SalesService } from './sales.service';
import { PaymentService } from './payment.service';
import { SalesInvoiceDto } from './dto/sales-invoice.dto';
import { CollectPaymentDto } from './dto/collect-payment.dto';
import { UserRole, ModuleType } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { ModuleScope } from '../auth/decorators/module-scope.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/permissions.enum';
import { TenantStatusGuard } from '../tenant/guards/tenant-status.guard';
import { GranularPermissionGuard } from '../permissions/guards/granular-permission.guard';
import { PermissionService } from '../permissions/permissions.service';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';

@Controller('mobileshop/sales')
@ModuleScope(ModuleType.MOBILE_SHOP)
@UseGuards(
  JwtAuthGuard,
  TenantRequiredGuard,
  RolesGuard,
  GranularPermissionGuard,
  TenantStatusGuard,
)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class SalesController {
  constructor(
    private readonly service: SalesService,
    private readonly paymentService: PaymentService,
    private readonly permissionService: PermissionService,
  ) {}

  @Post('invoice')
  @RequirePermission(ModuleType.MOBILE_SHOP, 'sale', 'create')
  async create(@Req() req: any, @Body() dto: SalesInvoiceDto) {
    const tenantId = req.user.tenantId;
    return this.service.createInvoice(tenantId, dto);
  }

  @Patch('invoice/:invoiceId')
  @RequirePermission(ModuleType.MOBILE_SHOP, 'sale', 'create')
  async update(
    @Req() req: any,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: SalesInvoiceDto,
  ) {
    const tenantId = req.user.tenantId;
    return this.service.updateInvoice(tenantId, invoiceId, dto);
  }

  @Post('invoice/:invoiceId/cancel')
  @RequirePermission(ModuleType.MOBILE_SHOP, 'sale', 'create')
  async cancel(@Req() req: any, @Param('invoiceId') invoiceId: string) {
    const tenantId = req.user.tenantId;
    return this.service.cancelInvoice(tenantId, invoiceId);
  }

  @Get('invoices')
  async list(
    @Req() req: any,
    @Query('shopId') shopId: string,
    @Query('fromJobCard') fromJobCard?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const tenantId = req.user.tenantId;
    if (!shopId) {
      throw new BadRequestException('shopId is required');
    }

    // RBAC: Staff with jobcard.view can see invoices IF fromJobCard=true
    const hasSaleView = await this.permissionService.hasPermission(
      req.user.id,
      tenantId,
      shopId,
      ModuleType.MOBILE_SHOP,
      'sale',
      'view',
    );

    if (!hasSaleView) {
      const hasJobView = await this.permissionService.hasPermission(
        req.user.id,
        tenantId,
        shopId,
        ModuleType.MOBILE_SHOP,
        'jobcard',
        'view',
      );

      if (!hasJobView || fromJobCard !== 'true') {
        throw new ForbiddenException(
          'You do not have permission to view these invoices',
        );
      }
    }

    // Parse pagination with defaults
    const skipNum = skip ? Math.max(0, parseInt(skip, 10)) : 0;
    const takeNum = take ? Math.min(100, parseInt(take, 10)) : 20;

    return this.service.listInvoices(
      tenantId,
      shopId,
      skipNum,
      takeNum,
      undefined,
      fromJobCard === 'true',
      req.query.status,
    );
  }

  @Get('invoice/:invoiceId')
  @RequirePermission(ModuleType.MOBILE_SHOP, 'sale', 'view')
  async getInvoice(@Req() req: any, @Param('invoiceId') invoiceId: string) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Invalid tenant');
    }
    return this.service.getInvoiceDetails(tenantId, invoiceId);
  }

  @Post('invoice/:invoiceId/payment')
  @Permissions(Permission.SALES_CREATE)
  async recordPayment(
    @Req() req: any,
    @Param('invoiceId') invoiceId: string,
    @Body()
    dto: {
      amount: number;
      paymentMethod: 'CASH' | 'CARD' | 'UPI' | 'BANK';
      transactionRef?: string;
      narration?: string;
    },
  ) {
    const tenantId = req.user.tenantId;
    // 🛡️ FINANCIAL SAFETY LOCK
    // Redirect legacy calls to the safe collectPayment method which handles Paisa conversion correctly.
    const collectDto: CollectPaymentDto = {
      paymentMethods: [
        {
          mode: dto.paymentMethod,
          amount: dto.amount, // Passed as Rupees (same as expected by collectPayment)
        },
      ],
      transactionRef: dto.transactionRef,
      narration: dto.narration,
    };
    return this.service.collectPayment(tenantId, invoiceId, collectDto);
  }

  @Post('invoice/:invoiceId/collect-payment')
  @RequirePermission(ModuleType.MOBILE_SHOP, 'sale', 'create')
  async collectPayment(
    @Req() req: any,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: CollectPaymentDto,
  ) {
    const tenantId = req.user.tenantId;
    return this.service.collectPayment(tenantId, invoiceId, dto);
  }

  @Post('invoice/:invoiceId/items')
  @Permissions(Permission.SALES_CREATE)
  async addItem(
    @Req() req: any,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: any, // Basic DTO, validation happens in service/validation pipe
  ) {
    const tenantId = req.user.tenantId;
    // Ensure shop owner/staff permissions if needed (guard handles authentication)
    return this.service.addItemToInvoice(tenantId, invoiceId, dto);
  }

  @Get('invoice/:invoiceId/payments')
  @RequirePermission(ModuleType.MOBILE_SHOP, 'sale', 'view')
  async listPayments(@Req() req: any, @Param('invoiceId') invoiceId: string) {
    const tenantId = req.user.tenantId;
    return this.paymentService.listPayments(tenantId, invoiceId);
  }

  @Get('summary')
  @RequirePermission(ModuleType.MOBILE_SHOP, 'sale', 'view')
  async getSalesSummary(
    @Req() req: any,
    @Query('shopId') shopId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const tenantId = req.user.tenantId;
    if (!shopId) {
      throw new BadRequestException('shopId is required');
    }
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.service.getSalesSummary(tenantId, shopId, start, end);
  }
}
