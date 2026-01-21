import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UpdateJobStatusDto } from './dto/update-job-status.dto';

import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { JobCardsService } from '../jobcard/job-cards.service';
import { CreateJobCardDto } from '../jobcard/dto/create-job-card.dto';
import { UpdateJobCardDto } from './dto/update-job-card.dto';

@Controller('mobileshop/shops/:shopId/job-cards')
@UseGuards(JwtAuthGuard)
export class JobCardsController {
  constructor(private readonly service: JobCardsService) {}

  @Post()
  create(
    @Param('shopId') shopId: string,
    @Req() req: any,
    @Body() dto: CreateJobCardDto,
  ) {
    return this.service.create(req.user, shopId, dto);
  }

  @Get()
  list(@Param('shopId') shopId: string, @Req() req: any) {
    return this.service.list(req.user, shopId);
  }
  @Get(':id')
  getOne(
    @Param('shopId') shopId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.service.getOne(req.user, shopId, id);
  }
  @Patch(':id')
  update(
    @Param('shopId') shopId: string,
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: UpdateJobCardDto,
  ) {
    return this.service.update(req.user, shopId, id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('shopId') shopId: string,
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: UpdateJobStatusDto,
  ) {
    return this.service.updateStatus(req.user, shopId, id, dto.status);
  }
}
