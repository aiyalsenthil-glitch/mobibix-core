import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { WhatsAppMenuService } from './whatsapp-menu.service';

@Controller('whatsapp/menu')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class WhatsAppMenuController {
  constructor(private readonly menuService: WhatsAppMenuService) {}

  @Get('tree')
  getTree(@Req() req: any) {
    return this.menuService.getTree(req.user.tenantId);
  }

  @Get('config')
  getConfig(@Req() req: any) {
    return this.menuService.getConfig(req.user.tenantId);
  }

  @Patch('config')
  updateConfig(@Req() req: any, @Body() body: { menuBotEnabled?: boolean; aiReplyEnabled?: boolean }) {
    return this.menuService.updateConfig(req.user.tenantId, body);
  }

  @Post('nodes')
  createNode(@Req() req: any, @Body() body: any) {
    return this.menuService.createNode(req.user.tenantId, body);
  }

  @Patch('nodes/reorder')
  reorderNodes(@Req() req: any, @Body() body: any) {
    return this.menuService.reorderNodes(req.user.tenantId, body.orderedIds);
  }

  @Patch('nodes/:id')
  updateNode(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.menuService.updateNode(req.user.tenantId, id, body);
  }

  @Delete('nodes/:id')
  deleteNode(@Req() req: any, @Param('id') id: string) {
    return this.menuService.deleteNode(req.user.tenantId, id);
  }
}
