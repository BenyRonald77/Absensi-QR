import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('serves the authenticated compliance summary with the persisted target', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@example.com', password: 'TrainingDemo123!' })
      .expect(200);
    const accessToken = (login.body as { accessToken: string }).accessToken;
    const auth = { Authorization: `Bearer ${accessToken}` };
    const setting = await request(app.getHttpServer())
      .get('/compliance/setting')
      .set(auth)
      .expect(200);
    const originalTarget = setting.body.targetHours as number;

    try {
      await request(app.getHttpServer())
        .put('/compliance/setting')
        .set(auth)
        .send({ targetHours: 7.25 })
        .expect(200);

      const summary = await request(app.getHttpServer())
        .get('/compliance/me?year=2026')
        .set(auth)
        .expect(200);

      expect(summary.body).toMatchObject({
        employeeId: login.body.user.id,
        year: 2026,
        targetHours: 7.25,
      });
    } finally {
      await request(app.getHttpServer())
        .put('/compliance/setting')
        .set(auth)
        .send({ targetHours: originalTarget })
        .expect(200);
    }
  });

  afterEach(async () => {
    await app.close();
  });
});
