import {
  Controller, Post, Body, UseGuards, Request,
  ConflictException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { SkipSubscriptionCheck } from '../../core/auth/decorators/skip-subscription-check.decorator';
import { IsString, MinLength, Matches } from 'class-validator';

class RegisterDistributorDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @Matches(/^DIST-[A-Z0-9]{4,10}$/, {
    message: 'Referral code must follow format: DIST-XXXXXX (uppercase letters/numbers)',
  })
  referralCode: string;
}

@SkipSubscriptionCheck()
@Controller('distributor/admin')
@UseGuards(JwtAuthGuard)
export class DistributorRegisterController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * POST /api/distributor/admin/register
   *
   * Works for two cases:
   *  1. Pure distributor (no tenant) — signs up via /distributor/signup page
   *  2. Existing ERP tenant OWNER — activates distributor mode from dashboard
   *
   * In both cases, userId is used as the unique anchor.
   * When tenantId exists, it is also stored for ERP-linked distributors.
   */
  @Post('register')
  async registerAsDistributor(
    @Request() req: any,
    @Body() body: RegisterDistributorDto,
  ) {
    const user = req.user;
    const userId = user.sub ?? user.id;
    const tenantId = user.tenantId ?? null;

    if (!userId) {
      throw new BadRequestException('User identity could not be resolved.');
    }

    // Prevent duplicate registration by userId
    const existingByUser = await this.prisma.distDistributor.findUnique({
      where: { userId },
    });
    if (existingByUser) {
      throw new ConflictException('This account is already registered as a distributor.');
    }

    // If user has a tenant, prevent duplicate by tenantId as well
    if (tenantId) {
      const existingByTenant = await this.prisma.distDistributor.findUnique({
        where: { tenantId },
      });
      if (existingByTenant) {
        throw new ConflictException('This workspace is already registered as a distributor.');
      }
    }

    // Check referral code uniqueness
    const codeInUse = await this.prisma.distDistributor.findUnique({
      where: { referralCode: body.referralCode.toUpperCase() },
    });
    if (codeInUse) {
      throw new ConflictException('Referral code is already taken. Please choose another.');
    }

    const distributor = await this.prisma.distDistributor.create({
      data: {
        userId,
        tenantId,          // null for pure distributors, set for ERP users
        name: body.name,
        referralCode: body.referralCode.toUpperCase(),
      },
    });

    return {
      id: distributor.id,
      name: distributor.name,
      referralCode: distributor.referralCode,
      tenantId: distributor.tenantId,
    };
  }
}
