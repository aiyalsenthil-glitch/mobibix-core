import { Controller, Get, Post, Body, Query, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CompatibilityService } from './compatibility.service';
import { CreateCompatibilityGroupDto, AddPhoneToGroupDto, LinkPartToGroupDto, CreateFeedbackDto } from './dto/compatibility.dto';
import { GranularPermissionGuard } from '../../../core/permissions/guards/granular-permission.guard';
import { RequirePermission, ModulePermission } from '../../../core/permissions/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../../security/permission-registry';
import { Public } from '../../../core/auth/decorators/public.decorator';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { TenantRequiredGuard } from '../../../core/auth/guards/tenant.guard';
import { ModuleScope } from '../../../core/auth/decorators/module-scope.decorator';
import { ModuleType } from '@prisma/client';

@ApiTags('Compatibility Engine')
@Controller('compatibility')
@ModuleScope(ModuleType.MOBILE_SHOP)
@ModulePermission('compatibility')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard, GranularPermissionGuard)
export class CompatibilityController {
  constructor(private readonly compatibilityService: CompatibilityService) {}

  @Public()
  @Get('search')
  @ApiOperation({ summary: 'Search for compatible parts for a phone model' })
  @ApiQuery({ name: 'model', description: 'Name of the phone model (e.g., Samsung A50)' })
  async search(@Query('model') model: string) {
    return this.compatibilityService.searchCompatibleParts(model);
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.COMPATIBILITY.MANAGE)
  @Post('groups')
  @ApiOperation({ summary: 'Create a new compatibility group' })
  async createGroup(@Body() dto: CreateCompatibilityGroupDto) {
    return this.compatibilityService.createGroup(dto);
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.COMPATIBILITY.MANAGE)
  @Post('groups/:id/add-phone')
  @ApiOperation({ summary: 'Add a phone model to a compatibility group' })
  async addPhone(@Param('id') id: string, @Body() dto: AddPhoneToGroupDto) {
    return this.compatibilityService.addPhoneToGroup(id, dto);
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.COMPATIBILITY.MANAGE)
  @Post('groups/:id/link-part')
  @ApiOperation({ summary: 'Link a part to a compatibility group' })
  async linkPart(@Param('id') id: string, @Body() dto: LinkPartToGroupDto) {
    return this.compatibilityService.linkPartToGroup(id, dto);
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.COMPATIBILITY.VIEW)
  @Post('suggest')
  @ApiOperation({ summary: 'Suggest compatible models based on patterns' })
  async suggest(@Body('model') model: string) {
    return {
      model,
      suggestions: await this.compatibilityService.suggestCompatibleModels(model)
    };
  }

  @Public()
  @Get('autocomplete')
  @ApiOperation({ summary: 'Autocomplete phone model names' })
  @ApiQuery({ name: 'query', description: 'Search query for phone models' })
  async autocomplete(@Query('query') query: string) {
    return this.compatibilityService.autocompletePhoneModels(query);
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.COMPATIBILITY.VIEW)
  @Post('feedback')
  @ApiOperation({ summary: 'Submit feedback for compatibility (report error or suggest link)' })
  async submitFeedback(@Body() dto: CreateFeedbackDto) {
    return this.compatibilityService.submitFeedback(dto);
  }

  @Post('request-model')
  @ApiOperation({ summary: 'Request a new device model to be added to the database' })
  async requestModel(@Req() req: any, @Body('rawInput') rawInput: string) {
    return this.compatibilityService.requestDeviceModel(
      req.user.tenantId,
      req.user.userId,
      rawInput,
    );
  }
}
