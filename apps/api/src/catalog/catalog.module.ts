import{translated,localizeProduct}from'../content/translations';
import { BadRequestException, NotFoundException, Controller, Get, Module, Param, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { calculateQuote } from '../pricing/pricing';
import { ManagedProduct } from '../admin/product.schema';
import{MediaModule}from'../content/media.module';
import{TypesModule,TypesService}from'../content/types.module';
import type{ProductType}from'../content/content.schema';

function publicProduct(product:ManagedProduct,types:ProductType[],lang?:string){
 const{rules,closures,english,version,...published}=lang==='en'?localizeProduct(product):product;const type=types.find(t=>t.id===product.type);const typeEn=type&&translated('TYPE',type);
 return{...published,typeName:lang==='en'?(typeEn?type!.english!.name:'Experience'):type?.name||'Trải nghiệm',typeSlug:lang==='en'&&!typeEn?undefined:type?.slug,bookingKind:type?.bookingKind||'TICKET',languages:translated('PRODUCT',product)?['vi','en']:['vi']};
}

@Controller('products')
class CatalogController {
  constructor(private readonly catalog: CatalogService,private readonly types:TypesService) {}
  @Get() async list(@Query('type')type?:string,@Query('lang')lang?:string) { const types=await this.types.list();return { data: (await this.catalog.list()).filter(product=>(!type||product.type===type)&&(lang!=='en'||translated('PRODUCT',product))).map(product=>{const{detailHtml,gallery,english,...summary}=publicProduct(product,types,lang);return summary;}) }; }
  @Get(':slug/prices') async prices(@Param('slug') slug: string, @Query('date') date: string, @Query('variantId') variantId: string,@Query('lang')lang?:string) {
    const product = await this.catalog.find(slug, true);
    if(lang==='en'&&!translated('PRODUCT',product))throw new NotFoundException('Translation unavailable.');const view=lang==='en'?localizeProduct(product):product;const variant = view.variants.find((v:{id:string}) => v.id === variantId);
    if (!variant) throw new BadRequestException('Gói vé không tồn tại.');
    try {
      const quantities = Object.fromEntries(Object.keys(variant.prices).map(type => [type, 1]));
      return calculateQuote(view, variantId, date, quantities, product.rules, product.closures);
    } catch (e) { throw new BadRequestException(e instanceof Error ? e.message : 'Không thể lấy giá.'); }
  }
  @Get(':slug') async detail(@Param('slug') slug: string,@Query('lang')lang?:string) {const product=await this.catalog.find(slug,true);if(lang==='en'&&!translated('PRODUCT',product))throw new NotFoundException('Translation unavailable.');return { data: publicProduct(product,await this.types.list(),lang) }; }
}
@Module({ imports:[MediaModule,TypesModule],controllers: [CatalogController], providers: [CatalogService], exports: [CatalogService] })
export class CatalogModule {}
