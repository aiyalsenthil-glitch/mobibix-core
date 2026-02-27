import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { B2BService } from './b2b.service';

@Controller('mobileshop/b2b')
export class B2BController {
  constructor(private readonly b2bService: B2BService) {}

  @Post('onboard-distributor')
  async onboard(@Body() body: any) {
    return this.b2bService.onboardDistributor(body);
  }

  @Get('catalog')
  async getCatalog(@Request() req: any) {
    // In a real app, tenantId comes from the auth token
    const tenantId = req.user?.tenantId; 
    return this.b2bService.getAvailableWholesaleItems(tenantId);
  }

  @Post('link/:distributorId')
  async link(@Request() req: any, @Param('distributorId') distributorId: string) {
    const tenantId = req.user?.tenantId;
    return this.b2bService.requestLink(tenantId, distributorId);
  }

  @Post('order')
  async placeOrder(@Request() req: any, @Body() body: any) {
    const tenantId = req.user?.tenantId;
    return this.b2bService.placeB2BOrder(tenantId, body);
  }
}
