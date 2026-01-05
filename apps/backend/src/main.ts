import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import cors from 'cors';
import { join } from 'path';

async function bootstrap() {
  /**
   * 1️⃣ Create raw Express server
   *    Express will handle:
   *    - CORS preflight (IMPORTANT)
   *    - Static files
   *    - QR page
   */
  const server = express();

  /**
   * 🔥 2️⃣ ENABLE CORS AT EXPRESS LEVEL
   * This is REQUIRED when using ExpressAdapter
   * Otherwise OPTIONS requests die before NestJS
   */
  server.use(
    cors({
      origin: [
        'http://localhost_REPLACED:3000',
        'https://gym-saas-prod.REMOVED_AUTH_PROVIDERapp.com',
        'https://mobibix.in',
        'https://www.mobibix.in',
        'http://10.0.2.2:3000',
      ],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Authorization', 'Content-Type', 'Accept'],
    }),
  );

  /**
   * 3️⃣ Serve static files ONLY under /public
   */
  server.use('/public', express.static(join(__dirname, '..', '..', 'public')));

  /**
   * 4️⃣ QR Check-in page
   * URL: /public/checkin/:tenantCode
   */
  server.get('/public/checkin/:tenantCode', (req, res) => {
    res.sendFile(
      join(__dirname, '..', '..', 'public', 'checkin', 'index.html'),
    );
  });

  /**
   * 5️⃣ Health check (Render / uptime monitors)
   */
  server.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  /**
   * 6️⃣ Create NestJS app on SAME Express instance
   */
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  /**
   * 7️⃣ Global API prefix
   * All Nest controllers => /api/*
   */
  app.setGlobalPrefix('api');

  /**
   * 8️⃣ (Optional but safe) Enable Nest CORS as well
   * Express CORS already handles OPTIONS
   * Nest CORS handles internal responses
   */
  // main.ts
  app.enableCors({
    // Allow all origins for the mobile API or use a callback to validate
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'Accept',
      'X-Requested-With', // Added for better mobile compatibility
    ],
    credentials: true,
  });
  /**
   * 9️⃣ Start server
   */
  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 GymPilot API running on port ${port}`);
}

bootstrap();
