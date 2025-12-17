import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  // Create express server
  const server = express();

  // RAW body ONLY for Razorpay webhook
  server.post(
    '/payments/webhook',
    bodyParser.raw({ type: 'application/json' }),
  );

  // JSON for all other routes
  server.use(bodyParser.json());

  // Wrap express with Nest
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  await app.listen(3000);
  console.log('Server listening on port 3000');
}

bootstrap();
