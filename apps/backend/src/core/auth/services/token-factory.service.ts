import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class TokenFactoryService {
  public readonly refreshTokenTtlMs = 30 * 24 * 60 * 60 * 1000;
  public readonly accessTokenTtlMs = 15 * 60 * 1000; // 15 minutes

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  generateAccessToken(payload: any): string {
    return this.jwtService.sign(payload);
  }

  async createRefreshToken(userId: string): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.refreshTokenTtlMs);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });

    return token;
  }

  async revokeRefreshToken(token: string): Promise<void> {
    if (!token || token.trim() === '') {
      return;
    }

    await this.prisma.refreshToken.updateMany({
      where: { token },
      data: { revokedAt: new Date() },
    });
  }
}
