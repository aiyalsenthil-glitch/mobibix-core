import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { UserRole, ModuleType, CreditNoteType, CreditNoteStatus } from '@prisma/client';
import { ModuleScope } from '../../../core/auth/decorators/module-scope.decorator';
import { CreditNotesService } from './credit-notes.service';
import { CreateCreditNoteDto } from './dto/create-credit-note.dto';
import { ApplyCreditNoteDto } from './dto/apply-credit-note.dto';
import { VoidCreditNoteDto } from './dto/void-credit-note.dto';
import { TenantRequiredGuard } from '../../../core/auth/guards/tenant.guard';

@Controller('mobileshop/shops/:shopId/credit-notes')
@ModuleScope(ModuleType.MOBILE_SHOP)
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class CreditNotesController {
  constructor(private readonly creditNotesService: CreditNotesService) {}

  @Get()
  async list(
    @Req() req: any,
    @Param('shopId') shopId: string,
    @Query() query: any,
  ) {
    const tenantId = req.user.tenantId;
    return this.creditNotesService.listCreditNotes(tenantId, shopId, query);
  }

  @Get(':id')
  async getOne(
    @Req() req: any,
    @Param('shopId') shopId: string,
    @Param('id') id: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.creditNotesService.getCreditNote(tenantId, shopId, id);
  }

  @Post()
  async create(
    @Req() req: any,
    @Param('shopId') shopId: string,
    @Body() dto: CreateCreditNoteDto,
  ) {
    const tenantId = req.user.tenantId;
    return this.creditNotesService.createCreditNote(tenantId, shopId, dto);
  }

  @Post(':id/issue')
  async issue(
    @Req() req: any,
    @Param('shopId') shopId: string,
    @Param('id') id: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.creditNotesService.issueCreditNote(tenantId, shopId, id);
  }

  @Post(':id/apply')
  async apply(
    @Req() req: any,
    @Param('shopId') shopId: string,
    @Param('id') id: string,
    @Body() dto: ApplyCreditNoteDto,
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.sub;
    return this.creditNotesService.applyCreditNote(tenantId, shopId, id, dto, userId);
  }

  @Post(':id/refund')
  async refund(
    @Req() req: any,
    @Param('shopId') shopId: string,
    @Param('id') id: string,
    @Body('amount') amount: number,
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.sub;
    return this.creditNotesService.refundCreditNote(tenantId, shopId, id, amount, userId);
  }

  @Post(':id/void')
  async void(
    @Req() req: any,
    @Param('shopId') shopId: string,
    @Param('id') id: string,
    @Body() dto: VoidCreditNoteDto,
  ) {
    const tenantId = req.user.tenantId;
    return this.creditNotesService.voidCreditNote(tenantId, shopId, id, dto);
  }
}
