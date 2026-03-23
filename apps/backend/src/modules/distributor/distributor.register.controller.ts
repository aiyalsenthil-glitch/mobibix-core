import {
  Controller, Post, Body, UseGuards, Request,
  ConflictException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { SkipSubscriptionCheck } from '../../core/auth/decorators/skip-subscription-check.decorator';
import { SkipTenant } from '../../core/auth/decorators/skip-tenant.decorator';
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

@SkipTenant()
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

    // Check 1: already registered by userId (normal path)
    const existingByUser = await this.prisma.distDistributor.findUnique({
      where: { userId },
    });
    if (existingByUser) {
      throw new ConflictException('This account is already registered as a distributor.');
    }

    // Check 2: orphaned record — userId was null (created before userId column existed).
    // Look up this user's email and see if a DistDistributor already exists for it.
    // If found, claim it by linking the userId instead of creating a duplicate.
    const dbUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (dbUser?.email) {
      const orphan = await this.prisma.distDistributor.findUnique({
        where: { email: dbUser.email },
      });
      if (orphan && !orphan.userId) {
        // Reclaim the orphaned record — link userId and return it
        const claimed = await this.prisma.distDistributor.update({
          where: { id: orphan.id },
          data: { userId },
        });
        return {
          id: claimed.id,
          name: claimed.name,
          referralCode: claimed.referralCode,
          tenantId: claimed.tenantId,
        };
      }
      if (orphan) {
        throw new ConflictException('This account is already registered as a distributor.');
      }
    }

    // Check 3: If user has a tenant, prevent duplicate by tenantId
    if (tenantId) {
      const existingByTenant = await this.prisma.distDistributor.findUnique({
        where: { tenantId },
      });
      if (existingByTenant) {
        throw new ConflictException('This workspace is already registered as a distributor.');
      }
    }

    // Check 4: referral code uniqueness
    const codeInUse = await this.prisma.distDistributor.findUnique({
      where: { referralCode: body.referralCode.toUpperCase() },
    });
    if (codeInUse) {
      throw new ConflictException('Referral code is already taken. Please choose another.');
    }

    let distributor: any;
    try {
      distributor = await this.prisma.distDistributor.create({
        data: {
          userId,
          tenantId,
          email: dbUser?.email ?? null,
          name: body.name,
          referralCode: body.referralCode.toUpperCase(),
        },
      });
    } catch (err: any) {
      // P2002 = unique constraint violation (race condition)
      if (err?.code === 'P2002') {
        throw new ConflictException('This account is already registered as a distributor.');
      }
      throw err;
    }

    return {
      id: distributor.id,
      name: distributor.name,
      referralCode: distributor.referralCode,
      tenantId: distributor.tenantId,
    };
  }
}
