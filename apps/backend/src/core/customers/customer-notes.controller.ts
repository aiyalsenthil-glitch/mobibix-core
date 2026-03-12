import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { CustomerNotesService } from './customer-notes.service';
import { IsNotEmpty, IsString } from 'class-validator';
import { ModuleScope } from '../auth/decorators/module-scope.decorator';
import { ModulePermission, RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { GranularPermissionGuard } from '../permissions/guards/granular-permission.guard';
import { PERMISSIONS } from '../../security/permission-registry';

class CreateNoteDto {
  @IsString()
  @IsNotEmpty()
  content: string;
}

@UseGuards(JwtAuthGuard, TenantRequiredGuard, GranularPermissionGuard)
@ModuleScope(ModuleType.CORE)
@ModulePermission('core')
@Roles(UserRole.OWNER, UserRole.STAFF)
@Controller('core/customers/:customerId/notes')
export class CustomerNotesController {
  constructor(private readonly service: CustomerNotesService) {}

  @RequirePermission(PERMISSIONS.CORE.CUSTOMER.VIEW)
  @Get()
  list(@Req() req, @Param('customerId') customerId: string) {
    return this.service.listNotes(req.user.tenantId, customerId);
  }

  @RequirePermission(PERMISSIONS.CORE.CUSTOMER.UPDATE)
  @Post()
  create(
    @Req() req,
    @Param('customerId') customerId: string,
    @Body() dto: CreateNoteDto,
  ) {
    const userId = req.user.userId || req.user.sub;
    return this.service.createNote(
      req.user.tenantId,
      customerId,
      userId,
      dto.content,
    );
  }

  @RequirePermission(PERMISSIONS.CORE.CUSTOMER.UPDATE)
  @Delete(':noteId')
  remove(
    @Req() req,
    @Param('customerId') customerId: string,
    @Param('noteId') noteId: string,
  ) {
    const userId = req.user.userId || req.user.sub;
    const role = req.user.role as UserRole;
    return this.service.deleteNote(
      req.user.tenantId,
      customerId,
      noteId,
      userId,
      role,
    );
  }
}
