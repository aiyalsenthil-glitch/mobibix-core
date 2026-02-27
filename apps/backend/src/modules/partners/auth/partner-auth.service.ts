import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../core/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PartnerAuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
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
        role: 'PARTNER' 
    };
    return {
      access_token: this.jwtService.sign(payload),
      partner: {
        id: partner.id,
        businessName: partner.businessName,
        email: partner.email,
        referralCode: partner.referralCode
      }
    };
  }
}
