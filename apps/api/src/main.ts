import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import type{NestExpressApplication}from'@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useBodyParser('json',{limit:'1mb'});
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  const document = SwaggerModule.createDocument(app, new DocumentBuilder()
    .setTitle('JinGo API').setDescription('Catalog, CMS, booking operations, partner pricing and credit ledger. VNPay and SePay adapters are configurable; supplier APIs are not connected.')
    .setVersion('0.39.0').build());
  if (process.env.NODE_ENV !== 'production') SwaggerModule.setup('api/docs', app, document);
  await app.listen(Number(process.env.PORT || 4000), '0.0.0.0');
}
bootstrap().catch((error) => { console.error(error); process.exit(1); });
