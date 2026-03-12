import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CompatibilityService } from './compatibility.service';
import { CreatePhoneModelDto, SmartLinkModelsDto } from './dto/compatibility.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
// Note: We use the business level guards if available, but for now we follow the user's request for Admin Master tool.
// In actual prod, we would use AdminRolesGuard.

@ApiTags('Compatibility Admin')
@ApiBearerAuth()
@Controller('admin/compatibility')
@UseGuards(JwtAuthGuard)
export class CompatibilityAdminController {
  constructor(private readonly compatibilityService: CompatibilityService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get global compatibility engine stats' })
  async getStats() {
    return this.compatibilityService.getAdminStats();
  }

  @Post('models')
  @ApiOperation({ summary: 'Create a new phone model' })
  async createModel(@Body() dto: CreatePhoneModelDto) {
    return this.compatibilityService.createPhoneModel(dto);
  }

  @Post('link-smart')
  @ApiOperation({ summary: 'Link two models across multiple part categories (Smart Linker)' })
  async smartLink(@Body() dto: SmartLinkModelsDto) {
    return this.compatibilityService.smartLinkModels(dto);
  }
}
