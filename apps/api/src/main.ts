import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import helmet from 'helmet';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.enableCors();
  app.setGlobalPrefix('api/v1');

  // Database connectivity check
  const prismaService = app.get(PrismaService);
  try {
    await prismaService.$connect();
    console.log('[Startup] Database connected successfully');
  } catch (e: any) {
    console.error('[Startup] Database connection FAILED:', e.message);
  }

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Chobo API running on: http://localhost:${process.env.PORT ?? 3000}/api/v1`);
}
bootstrap();
