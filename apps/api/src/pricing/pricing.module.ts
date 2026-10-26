import { BadRequestException, Body, Controller, Module, NotFoundException, Post } from '@nestjs/common';
import { IsInt, IsObject, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { products } from '../catalog/catalog.data';
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
  @Post() quote(@Body() body: QuoteDto) {
    const product = products.find((item) => item.id === body.productId);
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm.');
    try { return calculateQuote(product, body.variantId, body.date, body.quantities); }
    catch (error) { throw new BadRequestException(error instanceof Error ? error.message : 'Không thể báo giá.'); }
  }
}
@Module({ controllers: [PricingController] })
export class PricingModule {}
