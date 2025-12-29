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

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  app.enableCors({
    origin: true,
    credentials: true,
  });

  const port = process.env.PORT !== undefined ? Number(process.env.PORT) : 3000;
  await app.listen(port);

  console.log(`🚀 Server running on port ${port}`);
}
bootstrap();
