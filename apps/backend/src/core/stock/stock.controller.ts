import { Controller, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { StockService } from './stock.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('mobileshop/stock')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class StockController {
  constructor(private readonly service: StockService) {}
}
