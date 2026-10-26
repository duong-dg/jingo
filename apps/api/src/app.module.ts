import { Controller, Get, Module } from '@nestjs/common';
import { CatalogModule } from './catalog/catalog.module';
import { PricingModule } from './pricing/pricing.module';
import { DatabaseModule } from './database/database.module';
import { AdminModule } from './admin/admin.module';

@Controller('health')
class HealthController {
  @Get() health() { return { status: 'ok', service: 'jingo-api', mode: 'development', version: '0.2.0' }; }
}

@Module({ imports: [DatabaseModule, CatalogModule, PricingModule, AdminModule], controllers: [HealthController] })
export class AppModule {}
