import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);

  console.log(`Server listening on port ${port}`);
}

bootstrap().catch((err: unknown) => {
  if (err instanceof Error) {
    console.error('Bootstrap error:', err.message);
  } else {
    console.error('Unknown bootstrap error:', err);
  }
});
