import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  ForbiddenException,
  Param,
  Patch,
  Put,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ShopService } from './shop.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { UpdateShopSettingsDto } from './dto/update-shop-settings.dto';
import {
  UpdateDocumentSettingDto,
  DocumentType,
} from './dto/update-document-setting.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { UserRole, ModuleType } from '@prisma/client';
import { ModuleScope } from '../auth/decorators/module-scope.decorator';
import { ModulePermission, RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { GranularPermissionGuard } from '../permissions/guards/granular-permission.guard';
import { PERMISSIONS } from '../../security/permission-registry';

@Controller('mobileshop/shops')
@ModuleScope(ModuleType.MOBILE_SHOP)
@ModulePermission('system')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, GranularPermissionGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.SHOP.VIEW)
  @Get()
  list(
    @Req() req: any,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    if (!req.user.tenantId) {
      throw new ForbiddenException('Tenant context missing');
    }

    return this.shopService.listShops(req.user.tenantId, {
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.SHOP.MANAGE)
  @Post()
  create(@Req() req: any, @Body() dto: CreateShopDto) {
    return this.shopService.createShop(req.user.tenantId, req.user.role, dto);
  }
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.SHOP.VIEW)
  @Get(':shopId')
  getOne(@Req() req: any, @Param('shopId') shopId: string) {
    if (!req.user.tenantId) {
      throw new ForbiddenException('Tenant context missing');
    }

    return this.shopService.getShopById(req.user.tenantId, shopId);
  }
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.SHOP.MANAGE)
  @Patch(':shopId')
  update(
    @Req() req: any,
    @Param('shopId') shopId: string,
    @Body() dto: UpdateShopDto,
  ) {
    return this.shopService.updateShop(
      req.user.tenantId,
      req.user.role,
      shopId,
      dto,
    );
  }
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.SHOP.VIEW)
  @Get(':shopId/settings')
  getSettings(@Req() req: any, @Param('shopId') shopId: string) {
    if (!req.user.tenantId) {
      throw new ForbiddenException('Tenant context missing');
    }

    return this.shopService.getShopSettings(req.user.tenantId, shopId);
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.SHOP.MANAGE)
  @Patch(':shopId/settings')
  updateSettings(
    @Req() req: any,
    @Param('shopId') shopId: string,
    @Body() dto: UpdateShopSettingsDto,
  ) {
    return this.shopService.updateShopSettings(
      req.user.tenantId,
      req.user.role,
      shopId,
      dto,
    );
  }

  /**
   * GET /mobileshop/shops/:shopId/document-settings
   * Returns all document numbering settings for a shop
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.SHOP.VIEW)
  @Get(':shopId/document-settings')
  getDocumentSettings(@Req() req: any, @Param('shopId') shopId: string) {
    if (!req.user.tenantId) {
      throw new ForbiddenException('Tenant context missing');
    }

    return this.shopService.getDocumentSettings(req.user.tenantId, shopId);
  }

  /**
   * PUT /mobileshop/shops/:shopId/document-settings/:documentType
   * Updates document numbering configuration for a specific document type
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.SHOP.MANAGE)
  @Put(':shopId/document-settings/:documentType')
  updateDocumentSetting(
    @Req() req: any,
    @Param('shopId') shopId: string,
    @Param('documentType') documentType: DocumentType,
    @Body() dto: UpdateDocumentSettingDto,
  ) {
    return this.shopService.updateDocumentSetting(
      req.user.tenantId,
      req.user.role,
      shopId,
      documentType,
      dto,
    );
  }
}
