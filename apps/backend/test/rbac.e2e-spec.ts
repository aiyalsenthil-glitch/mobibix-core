import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from './../src/app.module';
import { PlatformService } from './../src/core/platform/platform.service';

describe('RBAC (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;

  const signToken = (role: string) =>
    jwtService.sign({
      sub: 'test-user',
      tenantId: 'test-tenant',
      userTenantId: 'test-user-tenant',
      role,
    });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PlatformService)
      .useValue({
        listAllPlans: async () => [],
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    jwtService = moduleFixture.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated users on /users/me', () => {
    return request(app.getHttpServer()).get('/users/me').expect(401);
  });

  it('rejects unauthenticated users on /gym/payments', () => {
    return request(app.getHttpServer()).get('/gym/payments').expect(401);
  });

  it('allows OWNER and STAFF on /me', async () => {
    const ownerToken = signToken('OWNER');
    await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const staffToken = signToken('STAFF');
    await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(200);
  });

  it('rejects STAFF on owner-only /staff/invite', async () => {
    const staffToken = signToken('STAFF');
    await request(app.getHttpServer())
      .post('/staff/invite')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ email: 'staff@example.com' })
      .expect(403);
  });

  it('allows SUPER_ADMIN and rejects STAFF on /platform/plans', async () => {
    const superAdminToken = signToken('SUPER_ADMIN');
    await request(app.getHttpServer())
      .get('/platform/plans')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200)
      .expect([]);

    const staffToken = signToken('STAFF');
    await request(app.getHttpServer())
      .get('/platform/plans')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(403);
  });
});
