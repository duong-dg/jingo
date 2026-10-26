import { Controller, Get, Module } from '@nestjs/common';
import { CatalogModule } from './catalog/catalog.module';
import { PricingModule } from './pricing/pricing.module';
import { DatabaseModule } from './database/database.module';
import { AdminModule } from './admin/admin.module';
import { OrdersModule } from './orders/orders.module';
import{PostsModule}from'./content/posts.module';

@Controller('health')
class HealthController {
  @Get() health() { return { status: 'ok', service: 'jingo-api', mode: 'development', version: '0.4.0' }; }
}

@Module({ imports: [DatabaseModule, CatalogModule, PricingModule, AdminModule, OrdersModule,PostsModule], controllers: [HealthController] })
export class AppModule {}
