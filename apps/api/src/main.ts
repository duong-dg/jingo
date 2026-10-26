import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  const document = SwaggerModule.createDocument(app, new DocumentBuilder()
    .setTitle('JinGo API').setDescription('Catalog, calendar pricing and authenticated product administration. Ordering and payments are not enabled.')
    .setVersion('0.2.0').build());
  if (process.env.NODE_ENV !== 'production') SwaggerModule.setup('api/docs', app, document);
  await app.listen(Number(process.env.PORT || 4000), '0.0.0.0');
}
bootstrap().catch((error) => { console.error(error); process.exit(1); });
