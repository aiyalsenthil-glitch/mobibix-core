import 'dotenv/config';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import { HttpAdapterHost } from '@nestjs/core';
import express from 'express';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  // 1️⃣ Create raw express server
  const server = express();
  server.use(express.static(join(__dirname, '..', 'public')));
  server.get('/checkin/:tenantCode', (req, res) => {
    res.sendFile(join(__dirname, '..', 'public/checkin/index.html'));
  });

  // 2️⃣ Razorpay webhook needs RAW body
  server.post(
    '/payments/webhook',
    bodyParser.raw({ type: 'application/json' }),
  );

  // 3️⃣ All other routes use JSON
  server.use(bodyParser.json());

  // 4️⃣ Create Nest app ONCE using ExpressAdapter
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  // 5️⃣ Enable shutdown hooks
  app.enableShutdownHooks();

  // 7️⃣ CORS (safe default)
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // 8️⃣ Graceful shutdown (optional but safe)
  const httpAdapterHost = app.get(HttpAdapterHost);
  const serverInstance = httpAdapterHost.httpAdapter.getInstance();
  if (serverInstance?.close) {
    serverInstance.close();
  }

  // 9️⃣ Start server at rendered port or 3000
  const port = process.env.PORT !== undefined ? Number(process.env.PORT) : 3000;

  await app.listen(port);
  console.log(`🚀 Server running on port ${port}`);
}
bootstrap();
