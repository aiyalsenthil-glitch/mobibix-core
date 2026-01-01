import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { join } from 'path';

async function bootstrap() {
  /**
   * 1️⃣ Create raw Express server
   *    (ONLY for static + health routes)
   */
  const server = express();

  /**
   * 2️⃣ Serve static files under /public ONLY
   *    (QR pages, landing HTML, etc.)
   */
  server.use('/public', express.static(join(__dirname, '..', '..', 'public')));

  /**
   * 3️⃣ QR check-in page
   *    URL: /public/checkin/:tenantCode
   */
  server.get('/public/checkin/:tenantCode', (req, res) => {
    res.sendFile(
      join(__dirname, '..', '..', 'public', 'checkin', 'index.html'),
    );
  });

  /**
   * 4️⃣ Health check (Render / uptime monitors)
   */
  server.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  /**
   * 5️⃣ Mount NestJS on the SAME Express instance
   */
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  /**
   * 6️⃣ Global API prefix
   *    All Nest routes => /api/*
   */
  app.setGlobalPrefix('api');

  /**
   * 7️⃣ CORS (IMPORTANT)
   *    Authorization header MUST be allowed
   */
  app.enableCors({
    origin: ['https://www.mobibix.in', 'https://mobibix.in'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Accept'],
  });

  /**
   * 8️⃣ Start server
   */
  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 GymPilot API running on port ${port}`);
}

bootstrap();
