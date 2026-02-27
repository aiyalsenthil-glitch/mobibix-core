import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../core/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PartnerAuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validatePartner(email: string, pass: string): Promise<any> {
    const partner = await this.prisma.partner.findFirst({
      where: { email, status: 'APPROVED' },
    });

    if (partner && await bcrypt.compare(pass, partner.passwordHash)) {
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

    // 🔐 Use a SEPARATE secret for partner tokens — isolates from tenant JWTs
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
}

