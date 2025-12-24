import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import { HttpAdapterHost } from '@nestjs/core';
import express from 'express';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  // 1️⃣ Create raw express server
  const server = express();

  // 2️⃣ Razorpay webhook needs RAW body
  server.post(
    '/payments/webhook',
    bodyParser.raw({ type: 'application/json' }),
  );

  // 3️⃣ All other routes use JSON
  server.use(bodyParser.json());

  // 4️⃣ Create Nest app ONCE using ExpressAdapter
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  // 5️⃣ Enable shutdown hooks (IMPORTANT)
  app.enableShutdownHooks();

  // 6️⃣ Graceful HTTP shutdown
  const httpAdapterHost = app.get(HttpAdapterHost);
  const serverInstance = httpAdapterHost.httpAdapter.getInstance();

  if (serverInstance?.close) {
    serverInstance.close();
  }

  // 7️⃣ CORS (safe default, domain-free)
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // 8️⃣ Start server
  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Server listening on port ${port}`);
}

bootstrap();
