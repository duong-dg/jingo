import { Controller, Get, Module } from '@nestjs/common';
import { CatalogModule } from './catalog/catalog.module';
import { PricingModule } from './pricing/pricing.module';

@Controller('health')
class HealthController {
  @Get() health() { return { status: 'ok', service: 'jingo-api', mode: 'demo', version: '0.1.0' }; }
}

@Module({ imports: [CatalogModule, PricingModule], controllers: [HealthController] })
export class AppModule {}
