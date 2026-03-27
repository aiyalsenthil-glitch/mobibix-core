import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { EmailService } from '../../../common/email/email.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class PartnerAuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async validatePartner(email: string, pass: string): Promise<any> {
    const partner = await this.prisma.partner.findFirst({
      where: { email, status: 'APPROVED' },
    });

    if (partner && (await bcrypt.compare(pass, partner.passwordHash))) {
      const { passwordHash, ...result } = partner;
      return result;
    }
    return null;
  }

  async login(partner: any) {
    const payload = {
      email: partner.email,
      sub: partner.id,
      role: 'PARTNER',
    };

    const secret =
      this.configService.get<string>('PARTNER_JWT_SECRET') ||
      this.configService.get<string>('JWT_SECRET');

    return {
      access_token: this.jwtService.sign(payload, { secret }),
      partner: {
        id: partner.id,
        businessName: partner.businessName,
        email: partner.email,
        referralCode: partner.referralCode,
      },
    };
  }

  // ─── Change Password (authenticated) ────────────────────────────────────────
  async changePassword(
    partnerId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const partner = await this.prisma.partner.findUnique({
      where: { id: partnerId },
    });
    if (!partner) throw new NotFoundException('Partner not found');

    const valid = await bcrypt.compare(currentPassword, partner.passwordHash);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');

    if (newPassword.length < 8) {
      throw new BadRequestException(
        'New password must be at least 8 characters',
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.partner.update({
      where: { id: partnerId },
      data: { passwordHash },
    });

    return { message: 'Password changed successfully' };
  }

  // ─── Forgot Password ─────────────────────────────────────────────────────────
  async forgotPassword(email: string) {
    const partner = await this.prisma.partner.findFirst({
      where: { email, status: 'APPROVED' },
    });

    // Always return success to avoid email enumeration
    if (!partner) return { message: 'If that email exists, a reset link has been sent.' };

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.partner.update({
      where: { id: partner.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpiry: expiry,
      },
    });

    const appUrl =
      this.configService.get<string>('APP_URL') || 'https://app.REMOVED_DOMAIN';
    const resetUrl = `${appUrl}/partner/reset-password?token=${rawToken}`;

    try {
      await this.emailService.send({
        tenantId: null,
        recipientType: 'PARTNER' as any,
        emailType: 'PARTNER_PASSWORD_RESET',
        referenceId: partner.id,
        module: 'MOBILE_SHOP',
        to: partner.email,
        subject: 'Reset your MobiBix Partner password',
        data: {
          name: partner.contactPerson,
          businessName: partner.businessName,
          resetUrl,
          expiresIn: '1 hour',
        },
      });
    } catch {
      // Don't leak email errors — link is still in DB
    }

    return { message: 'If that email exists, a reset link has been sent.' };
  }

  // ─── Reset Password ───────────────────────────────────────────────────────────
  async resetPassword(rawToken: string, newPassword: string) {
    if (newPassword.length < 8) {
      throw new BadRequestException(
        'Password must be at least 8 characters',
      );
    }

    const hashedToken = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const partner = await this.prisma.partner.findUnique({
      where: { passwordResetToken: hashedToken },
    });

    if (
      !partner ||
      !partner.passwordResetExpiry ||
      partner.passwordResetExpiry < new Date()
    ) {
      throw new BadRequestException('Reset link is invalid or has expired');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.partner.update({
      where: { id: partner.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });

    return { message: 'Password reset successfully. You can now log in.' };
  }
}
