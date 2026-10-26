import{translated,localizeProduct}from'../content/translations';
import { BadRequestException, Body, Controller, Module, NotFoundException, Query, Post } from '@nestjs/common';
import { IsInt, IsObject, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CatalogModule } from '../catalog/catalog.module';
import { CatalogService } from '../catalog/catalog.service';
import { calculateQuote } from './pricing';

class QuantitiesDto {
  @IsOptional() @IsInt() @Min(0) @Max(50) ADULT?: number;
  @IsOptional() @IsInt() @Min(0) @Max(50) CHILD?: number;
  @IsOptional() @IsInt() @Min(0) @Max(50) SENIOR?: number;
}
class QuoteDto {
  @IsString() productId!: string;
  @IsString() variantId!: string;
  @IsString() date!: string;
  @IsObject() @ValidateNested() @Type(() => QuantitiesDto) quantities!: QuantitiesDto;
}
@Controller('quotes')
class PricingController {
  constructor(private readonly catalog: CatalogService) {}
  @Post() async quote(@Body() body: QuoteDto,@Query('lang')lang?:string) {
    const product = await this.catalog.find(body.productId);
    if(lang==='en'&&!translated('PRODUCT',product))throw new NotFoundException('Translation unavailable.');const view=lang==='en'?localizeProduct(product):product;try { return calculateQuote(view, body.variantId, body.date, body.quantities, product.rules, product.closures); }
    catch (error) { throw new BadRequestException(error instanceof Error ? error.message : 'Không thể báo giá.'); }
  }
}
@Module({ imports: [CatalogModule], controllers: [PricingController] })
export class PricingModule {}
