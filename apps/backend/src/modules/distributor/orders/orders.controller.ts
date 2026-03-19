import {
  Controller, Get, Post, Put, Body, Param, Req, UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderStatusUpdateDto, ReceiveOrderDto } from './dto/orders.dto';
import { PlaceOrderDto } from './dto/retailer-orders.dto';
import { DistributorScopeGuard } from '../guards/distributor-scope.guard';
import { SkipSubscriptionCheck } from '../../../core/auth/decorators/skip-subscription-check.decorator';

/** /distributor/orders — distributor managing inbound orders from retailers */
@SkipSubscriptionCheck()
@Controller('distributor/orders')
@UseGuards(DistributorScopeGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  list(@Req() req: any) {
    const { distributorId } = req.distributorContext;
    return this.ordersService.listInboundOrders(distributorId);
  }

  @Get(':orderId')
  get(@Req() req: any, @Param('orderId') orderId: string) {
    const { distributorId } = req.distributorContext;
    return this.ordersService.getOrder(distributorId, orderId);
  }

  @Put(':orderId/status')
  updateStatus(
    @Req() req: any,
    @Param('orderId') orderId: string,
    @Body() dto: OrderStatusUpdateDto,
  ) {
    const { distributorId } = req.distributorContext;
    return this.ordersService.updateStatus(distributorId, orderId, dto);
  }
}

/**
 * /retailer/supplier/orders — retailer-facing distributor ordering APIs
 * Uses standard JwtAuthGuard (tenantId from token) — no DistributorScopeGuard needed
 */
@Controller('retailer/supplier/orders')
export class RetailerOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  placeOrder(@Req() req: any, @Body() dto: PlaceOrderDto) {
    const retailerId = req.user?.tenantId;
    return this.ordersService.placeOrder(retailerId, dto);
  }

  @Get()
  listMyOrders(@Req() req: any) {
    const retailerId = req.user?.tenantId;
    return this.ordersService.listRetailerOrders(retailerId);
  }

  @Post(':orderId/receive')
  receiveOrder(
    @Req() req: any,
    @Param('orderId') orderId: string,
    @Body() dto: ReceiveOrderDto,
  ) {
    const retailerId = req.user?.tenantId;
    return this.ordersService.receiveOrder(retailerId, orderId, dto);
  }
}
