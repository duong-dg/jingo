import { BadRequestException, Controller, Get, Module, Param, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { calculateQuote } from '../pricing/pricing';
import { ManagedProduct } from '../admin/product.schema';

function publicProduct(product: ManagedProduct) {
  const { rules, closures, english, version, ...published } = product;
  return { ...published, ...(english?.status === 'PUBLISHED' ? { english } : {}) };
}

@Controller('products')
class CatalogController {
  constructor(private readonly catalog: CatalogService) {}
  @Get() async list() { return { data: (await this.catalog.list()).map(publicProduct) }; }
  @Get(':slug/prices') async prices(@Param('slug') slug: string, @Query('date') date: string, @Query('variantId') variantId: string) {
    const product = await this.catalog.find(slug, true);
    const variant = product.variants.find(v => v.id === variantId);
    if (!variant) throw new BadRequestException('Gói vé không tồn tại.');
    try {
      const quantities = Object.fromEntries(Object.keys(variant.prices).map(type => [type, 1]));
      return calculateQuote(product, variantId, date, quantities, product.rules, product.closures);
    } catch (e) { throw new BadRequestException(e instanceof Error ? e.message : 'Không thể lấy giá.'); }
  }
  @Get(':slug') async detail(@Param('slug') slug: string) { return { data: publicProduct(await this.catalog.find(slug, true)) }; }
}
@Module({ controllers: [CatalogController], providers: [CatalogService], exports: [CatalogService] })
export class CatalogModule {}
