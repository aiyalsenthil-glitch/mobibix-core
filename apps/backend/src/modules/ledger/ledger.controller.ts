import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Get,
  Query,
  Param,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { TenantStatusGuard } from '../../core/tenant/guards/tenant-status.guard';
import { TenantRequiredGuard } from '../../core/auth/guards/tenant.guard';
import { LedgerService } from './ledger.service';

@Controller('ledger')
@UseGuards(JwtAuthGuard, TenantStatusGuard, TenantRequiredGuard)
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Post('customers')
  createCustomer(@Req() req: any, @Body() body: any) {
    return this.ledgerService.createCustomer(req.user.tenantId, body);
  }

  @Post('accounts')
  createAccount(@Req() req: any, @Body() body: any) {
    return this.ledgerService.createAccount(req.user.tenantId, body);
  }
  @Get('customers/search')
  searchCustomers(@Req() req: any, @Query('q') q: string) {
    return this.ledgerService.searchCustomers(req.user.tenantId, q);
  }
  @Get('accounts/:ledgerId/collect')
  getCollectScreen(@Req() req: any, @Param('ledgerId') ledgerId: string) {
    return this.ledgerService.getCollectScreen(req.user.tenantId, ledgerId);
  }
  @Post('collections/collect')
  collectAmount(@Req() req: any, @Body() body: any) {
    return this.ledgerService.collectAmount(req.user.tenantId, body);
  }
  @Get('customers/:customerId/profile')
  getCustomerProfile(@Req() req: any, @Param('customerId') customerId: string) {
    return this.ledgerService.getCustomerProfile(req.user.tenantId, customerId);
  }
}
