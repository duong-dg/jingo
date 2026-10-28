import{VouchersModule,VouchersService}from'../vouchers/vouchers.module';
import{InventoryModule,InventoryService}from'../inventory/inventory.module';
import{translated,localizeProduct}from'../content/translations';
import { BadRequestException, ConflictException, Body, Controller, Module, NotFoundException, Query, Post } from '@nestjs/common';
import { IsInt, IsObject, IsOptional, IsString, Max, Min, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CatalogModule } from '../catalog/catalog.module';
import { CatalogService } from '../catalog/catalog.service';
import { calculateQuote } from './pricing';

class QuantitiesDto {
  @IsOptional() @IsInt() @Min(0) @Max(50) ADULT?: number;
  @IsOptional() @IsInt() @Min(0) @Max(50) CHILD?: number;
  @IsOptional() @IsInt() @Min(0) @Max(50) SENIOR?: number;
}
class QuoteDto {@IsOptional() @IsString() @MaxLength(40) voucherCode?:string;@IsOptional() @IsString() slotId?:string;
  @IsString() productId!: string;
  @IsString() variantId!: string;
  @IsString() date!: string;
  @IsObject() @ValidateNested() @Type(() => QuantitiesDto) quantities!: QuantitiesDto;
}
@Controller('quotes')
class PricingController {
  constructor(private readonly catalog: CatalogService,private readonly inventory:InventoryService,private readonly vouchers:VouchersService) {}
  @Post() async quote(@Body() body: QuoteDto,@Query('lang')lang?:string) {
    const product = await this.catalog.find(body.productId);
    if(lang==='en'&&!translated('PRODUCT',product))throw new NotFoundException('Translation unavailable.');const view=lang==='en'?localizeProduct(product):product;try { const quote=calculateQuote(view, body.variantId, body.date, body.quantities, product.rules, product.closures,body.slotId);const discount=body.voucherCode?await this.vouchers.discount(body.voucherCode,quote.total,undefined,false,{productId:product.id,variantId:body.variantId,date:body.date}):null;return{...quote,...(discount?{discount:{code:discount.code,amount:discount.amount,subtotal:discount.subtotal},total:quote.total-discount.amount}:{}),inventory:await this.inventory.check(product.id,body.variantId,body.date,quote.timeSlot?.id||'',quote.lines.reduce((sum,line)=>sum+line.quantity,0))}; }
    catch (error) { if(error instanceof ConflictException)throw error;throw new BadRequestException(error instanceof Error ? error.message : 'Không thể báo giá.'); }
  }
}
@Module({ imports: [VouchersModule,CatalogModule,InventoryModule], controllers: [PricingController] })
export class PricingModule {}
