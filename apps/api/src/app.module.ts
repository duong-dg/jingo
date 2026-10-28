import{CartsModule}from'./orders/carts.module';
import{TicketFilesModule}from'./orders/ticket-files.module';
import{PaymentsModule}from'./payments/payments.module';
import{VouchersModule}from'./vouchers/vouchers.module';
import{SuppliersModule}from'./suppliers/suppliers.module';
import{PosModule}from'./pos/pos.module';
import{OperationsModule}from'./operations/operations.module';
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
  @Get() health() { return { status: 'ok', service: 'jingo-api', mode: 'development', version: '0.39.0' }; }
}

@Module({ imports: [CartsModule,TicketFilesModule,PaymentsModule,VouchersModule,SuppliersModule,DatabaseModule, CatalogModule, PricingModule, AdminModule, OrdersModule,PostsModule,PartnersModule,TranslationsModule,OperationsModule,PosModule], controllers: [HealthController] })
export class AppModule {}
