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
import { UserRole } from '@prisma/client';
import { CustomerNotesService } from './customer-notes.service';
import { IsNotEmpty, IsString } from 'class-validator';

class CreateNoteDto {
  @IsString()
  @IsNotEmpty()
  content: string;
}

@UseGuards(JwtAuthGuard, TenantRequiredGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
@Controller('core/customers/:customerId/notes')
export class CustomerNotesController {
  constructor(private readonly service: CustomerNotesService) {}

  @Get()
  list(@Req() req, @Param('customerId') customerId: string) {
    return this.service.listNotes(req.user.tenantId, customerId);
  }

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
