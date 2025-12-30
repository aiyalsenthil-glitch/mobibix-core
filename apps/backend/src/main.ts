import 'dotenv/config';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import * as bodyParser from 'body-parser';
async function bootstrap() {
  const server = express();

  server.use(express.static(join(__dirname, '..', 'public')));
  server.get('/checkin/:tenantCode', (req, res) => {
    res.sendFile(join(__dirname, '..', 'public/checkin/index.html'));
  });

  server.post(
    '/payments/webhook',
    bodyParser.raw({ type: 'application/json' }),
  );

  server.use(bodyParser.json());
  // 🔥 EARLY HEALTH CHECK (for Render)
  server.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  app.enableCors({
    origin: [
      'https://www.mobibix.in',
      'https://mobibix.in',
      'http://localhost_REPLACED:3000',
      'http://127.0.0.1:5500',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  const port = process.env.PORT !== undefined ? Number(process.env.PORT) : 3000;
  await app.listen(port);

  console.log(`🚀 Server running on port ${port}`);
}
bootstrap();
