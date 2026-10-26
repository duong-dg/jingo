import { BadRequestException, Controller, Get, Module, Param, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { calculateQuote } from '../pricing/pricing';
import { ManagedProduct } from '../admin/product.schema';
import{MediaModule}from'../content/media.module';
import{TypesModule,TypesService}from'../content/types.module';
import type{ProductType}from'../content/content.schema';

function publicProduct(product: ManagedProduct,types:ProductType[]) {
  const { rules, closures, english, version, ...published } = product;
  const type=types.find(type=>type.id===product.type);
  return { ...published,typeName:type?.name||'Trải nghiệm',typeSlug:type?.slug,bookingKind:type?.bookingKind||'TICKET', ...(english?.status === 'PUBLISHED' ? { english } : {}) };
}

@Controller('products')
class CatalogController {
  constructor(private readonly catalog: CatalogService,private readonly types:TypesService) {}
  @Get() async list(@Query('type')type?:string) { const types=await this.types.list();return { data: (await this.catalog.list()).filter(product=>!type||product.type===type).map(product=>{const{detailHtml,gallery,english,...summary}=publicProduct(product,types);return summary;}) }; }
  @Get(':slug/prices') async prices(@Param('slug') slug: string, @Query('date') date: string, @Query('variantId') variantId: string) {
    const product = await this.catalog.find(slug, true);
    const variant = product.variants.find(v => v.id === variantId);
    if (!variant) throw new BadRequestException('Gói vé không tồn tại.');
    try {
      const quantities = Object.fromEntries(Object.keys(variant.prices).map(type => [type, 1]));
      return calculateQuote(product, variantId, date, quantities, product.rules, product.closures);
    } catch (e) { throw new BadRequestException(e instanceof Error ? e.message : 'Không thể lấy giá.'); }
  }
  @Get(':slug') async detail(@Param('slug') slug: string) { return { data: publicProduct(await this.catalog.find(slug, true),await this.types.list()) }; }
}
@Module({ imports:[MediaModule,TypesModule],controllers: [CatalogController], providers: [CatalogService], exports: [CatalogService] })
export class CatalogModule {}
