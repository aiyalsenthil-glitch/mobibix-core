import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

const nowSuffix = () => `${Date.now()}-${Math.floor(Math.random() * 1000)}`;

describe('Tenant Isolation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let tenantA: { id: string };
  let tenantB: { id: string };
  let partyA: { id: string };
  let partyB: { id: string };
  let userA: { id: string };
  let userB: { id: string };
  let switchUser: { id: string };
  let tokenA: string;
  let tokenB: string;
  let tokenSwitchA: string;
  let tokenSwitchB: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    tenantA = await prisma.tenant.create({
      data: {
        name: `Tenant A ${nowSuffix()}`,
        code: `TENANT-A-${nowSuffix()}`,
        tenantType: 'GYM',
      },
      select: { id: true },
    });

    tenantB = await prisma.tenant.create({
      data: {
        name: `Tenant B ${nowSuffix()}`,
        code: `TENANT-B-${nowSuffix()}`,
        tenantType: 'GYM',
      },
      select: { id: true },
    });

    userA = await prisma.user.create({
      data: {
        REMOVED_AUTH_PROVIDERUid: `user-a-${nowSuffix()}`,
        role: UserRole.OWNER,
      },
      select: { id: true },
    });

    userB = await prisma.user.create({
      data: {
        REMOVED_AUTH_PROVIDERUid: `user-b-${nowSuffix()}`,
        role: UserRole.OWNER,
      },
      select: { id: true },
    });

    switchUser = await prisma.user.create({
      data: {
        REMOVED_AUTH_PROVIDERUid: `switch-user-${nowSuffix()}`,
        role: UserRole.OWNER,
      },
      select: { id: true },
    });

    await prisma.userTenant.create({
      data: {
        userId: userA.id,
        tenantId: tenantA.id,
        role: UserRole.OWNER,
      },
    });

    await prisma.userTenant.create({
      data: {
        userId: userB.id,
        tenantId: tenantB.id,
        role: UserRole.OWNER,
      },
    });

    const switchTenantA = await prisma.userTenant.create({
      data: {
        userId: switchUser.id,
        tenantId: tenantA.id,
        role: UserRole.OWNER,
      },
      select: { id: true },
    });

    const switchTenantB = await prisma.userTenant.create({
      data: {
        userId: switchUser.id,
        tenantId: tenantB.id,
        role: UserRole.OWNER,
      },
      select: { id: true },
    });

    partyA = await prisma.party.create({
      data: {
        tenantId: tenantA.id,
        name: `Party A ${nowSuffix()}`,
        phone: `91000000${Math.floor(Math.random() * 9000 + 1000)}`,
      },
      select: { id: true },
    });

    partyB = await prisma.party.create({
      data: {
        tenantId: tenantB.id,
        name: `Party B ${nowSuffix()}`,
        phone: `92000000${Math.floor(Math.random() * 9000 + 1000)}`,
      },
      select: { id: true },
    });

    tokenA = jwtService.sign({
      sub: userA.id,
      tenantId: tenantA.id,
      userTenantId: null,
      role: UserRole.OWNER,
    });

    tokenB = jwtService.sign({
      sub: userB.id,
      tenantId: tenantB.id,
      userTenantId: null,
      role: UserRole.OWNER,
    });

    tokenSwitchA = jwtService.sign({
      sub: switchUser.id,
      tenantId: tenantA.id,
      userTenantId: switchTenantA.id,
      role: UserRole.OWNER,
    });

    tokenSwitchB = jwtService.sign({
      sub: switchUser.id,
      tenantId: tenantB.id,
      userTenantId: switchTenantB.id,
      role: UserRole.OWNER,
    });
  });

  afterAll(async () => {
    await prisma.party.deleteMany({
      where: { id: { in: [partyA.id, partyB.id] } },
    });
    await prisma.userTenant.deleteMany({
      where: { userId: { in: [userA.id, userB.id, switchUser.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userA.id, userB.id, switchUser.id] } },
    });
    await prisma.tenant.deleteMany({
      where: { id: { in: [tenantA.id, tenantB.id] } },
    });

    await app.close();
  });

  it('prevents cross-tenant access by id', async () => {
    const response = await request(app.getHttpServer())
      .get(`/core/parties/${partyB.id}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect([200, 404]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body?.id).not.toBe(partyB.id);
    }
  });

  it('prevents data leakage in search', async () => {
    const response = await request(app.getHttpServer())
      .get(`/core/parties/search?query=${encodeURIComponent('Party B')}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    const ids = Array.isArray(response.body)
      ? response.body.map((item: { id: string }) => item.id)
      : [];

    expect(ids).not.toContain(partyB.id);
  });

  it('allows tenant switching for linked tenants', async () => {
    const responseA = await request(app.getHttpServer())
      .get(`/core/parties/${partyA.id}`)
      .set('Authorization', `Bearer ${tokenSwitchA}`)
      .expect(200);

    expect(responseA.body?.id).toBe(partyA.id);

    const responseB = await request(app.getHttpServer())
      .get(`/core/parties/${partyB.id}`)
      .set('Authorization', `Bearer ${tokenSwitchB}`)
      .expect(200);

    expect(responseB.body?.id).toBe(partyB.id);
  });
});
