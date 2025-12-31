import 'dotenv/config';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import * as bodyParser from 'body-parser';
async function bootstrap() {
  const server = express();

  server.use(express.static(join(__dirname, '..', '..', 'public')));

  server.get('/checkin/:tenantCode', (req, res) => {
    res.sendFile(
      join(__dirname, '..', '..', 'public', 'checkin', 'index.html'),
    );
  });

  server.use(
    bodyParser.json({
      verify: (req: any, res, buf) => {
        if (req.originalUrl === '/payments/webhook') {
          req.rawBody = buf;
        }
      },
    }),
  );

  // 🔥 EARLY HEALTH CHECK (for Render)
  server.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  app.enableCors({
    origin: ['https://www.mobibix.in', 'https://mobibix.in'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  const port = process.env.PORT !== undefined ? Number(process.env.PORT) : 3000;
  await app.listen(port);

  console.log(`🚀 Server running on port ${port}`);
}
bootstrap();
