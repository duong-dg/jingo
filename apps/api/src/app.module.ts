import { Controller, Get, Module } from '@nestjs/common';
import { CatalogModule } from './catalog/catalog.module';
import { PricingModule } from './pricing/pricing.module';
import { DatabaseModule } from './database/database.module';
import { AdminModule } from './admin/admin.module';
import { OrdersModule } from './orders/orders.module';

@Controller('health')
class HealthController {
  @Get() health() { return { status: 'ok', service: 'jingo-api', mode: 'development', version: '0.3.0' }; }
}

@Module({ imports: [DatabaseModule, CatalogModule, PricingModule, AdminModule, OrdersModule], controllers: [HealthController] })
export class AppModule {}
