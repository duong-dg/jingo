import { Controller, Get, Module, NotFoundException, Param } from '@nestjs/common';
import { products } from './catalog.data';

@Controller('products')
class CatalogController {
  @Get() list() { return { data: products, demo: true }; }
  @Get(':slug') detail(@Param('slug') slug: string) {
    const product = products.find((item) => item.slug === slug);
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm.');
    return { data: product, demo: true };
  }
}
@Module({ controllers: [CatalogController] })
export class CatalogModule {}
