import{TranslationsModule}from'./content/translations.module';
import { Controller, Get, Module } from '@nestjs/common';
import { CatalogModule } from './catalog/catalog.module';
import { PricingModule } from './pricing/pricing.module';
import { DatabaseModule } from './database/database.module';
import { AdminModule } from './admin/admin.module';
import { OrdersModule } from './orders/orders.module';
import{PostsModule}from'./content/posts.module';
import{PartnersModule}from'./partners/partners.module';

@Controller('health')
class HealthController {
  @Get() health() { return { status: 'ok', service: 'jingo-api', mode: 'development', version: '0.8.0' }; }
}

@Module({ imports: [DatabaseModule, CatalogModule, PricingModule, AdminModule, OrdersModule,PostsModule,PartnersModule,TranslationsModule], controllers: [HealthController] })
export class AppModule {}
