import{InventoryModule,InventoryService}from'../inventory/inventory.module';
import{Destination,DestinationsModule,DestinationsService,destinationIds}from'../destinations/destinations.module';
import{translated,localizeProduct}from'../content/translations';
import { BadRequestException, NotFoundException, Controller, Get, Module, Param, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { calculateQuote } from '../pricing/pricing';
import { ManagedProduct } from '../admin/product.schema';
import{MediaModule}from'../content/media.module';
import{TypesModule,TypesService}from'../content/types.module';
import type{ProductType}from'../content/content.schema';

const searchText=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase();
function publicProduct(product:ManagedProduct,types:ProductType[],lang?:string,nodes:Destination[]=[]){
 const{rules,closures,english,version,...published}=lang==='en'?localizeProduct(product):product;const type=types.find(t=>t.id===product.type);const typeEn=type&&translated('TYPE',type);
 const destination=nodes.find(node=>node.id===product.destinationId);return{...published,destination:destination?(lang==='en'?published.destination||destination.englishName||destination.name:destination.name):published.destination,typeName:lang==='en'?(typeEn?type!.english!.name:'Experience'):type?.name||'Trải nghiệm',typeSlug:lang==='en'&&!typeEn?undefined:type?.slug,bookingKind:type?.bookingKind||'TICKET',languages:translated('PRODUCT',product)?['vi','en']:['vi']};
}

@Controller('products')
class CatalogController {
  constructor(private readonly catalog: CatalogService,private readonly types:TypesService,private readonly destinations:DestinationsService,private readonly inventory:InventoryService) {}
  @Get() async list(@Query('type')type?:string,@Query('lang')lang?:string,@Query('destination')destination?:string,@Query('q')q?:string) { const nodes=await this.destinations.list();const ids=destination?destinationIds(nodes,destination):null;const types=await this.types.list();return { data: (await this.catalog.list()).filter(product=>(!type||product.type===type)&&(!ids||!!product.destinationId&&ids.has(product.destinationId))&&(!q||searchText(product.name+' '+product.destination+' '+(()=>{const names:string[]=[];let node=nodes.find(n=>n.id===product.destinationId);const seen=new Set<string>();while(node&&!seen.has(node.id)){seen.add(node.id);names.push(node.name,node.englishName);node=nodes.find(n=>n.id===node!.parentId);}return names.join(' ');})()).includes(searchText(q.slice(0,200))))&&(lang!=='en'||translated('PRODUCT',product))).map(product=>{const{detailHtml,gallery,english,...summary}=publicProduct(product,types,lang,nodes);return summary;}) }; }
  @Get(':slug/prices') async prices(@Param('slug') slug: string, @Query('date') date: string, @Query('variantId') variantId: string,@Query('lang')lang?:string,@Query('slotId')slotId?:string) {
    const product = await this.catalog.find(slug, true);
    if(lang==='en'&&!translated('PRODUCT',product))throw new NotFoundException('Translation unavailable.');const view=lang==='en'?localizeProduct(product):product;const variant = view.variants.find((v:{id:string}) => v.id === variantId);
    if (!variant) throw new BadRequestException('Gói vé không tồn tại.');
    try {
      const quantities = Object.fromEntries(Object.keys(variant.prices).map(type => [type, 1]));
      const quote=calculateQuote(view, variantId, date, quantities, product.rules, product.closures,slotId);return{...quote,inventory:await this.inventory.availability(product.id,variantId,date,quote.timeSlot?.id||'')};
    } catch (e) { throw new BadRequestException(e instanceof Error ? e.message : 'Không thể lấy giá.'); }
  }
  @Get(':slug') async detail(@Param('slug') slug: string,@Query('lang')lang?:string) {const product=await this.catalog.find(slug,true);if(lang==='en'&&!translated('PRODUCT',product))throw new NotFoundException('Translation unavailable.');return { data: publicProduct(product,await this.types.list(),lang,await this.destinations.list()) }; }
}
@Module({ imports:[MediaModule,TypesModule,DestinationsModule,InventoryModule],controllers: [CatalogController], providers: [CatalogService], exports: [CatalogService] })
export class CatalogModule {}
