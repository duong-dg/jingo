import{DestinationsModule,DestinationsService}from'../destinations/destinations.module';
import{productSchema}from'../admin/product.schema';
import{postSchema,typeSchema,cleanContent}from'./content.schema';
import{BadRequestException,Body,Controller,Get,Module,NotFoundException,Post,Req,Res,UseGuards}from'@nestjs/common';
import type{Request,Response}from'express';
import{z}from'zod';
import{AuthModule,AdminGuard}from'../admin/auth.module';
import{CatalogModule}from'../catalog/catalog.module';
import{CatalogService}from'../catalog/catalog.service';
import{PostsModule,PostsService}from'./posts.module';
import{TypesModule,TypesService}from'./types.module';
import{sourceHash,translationSource,translationStatus,TranslationKind}from'./translations';
const inputSchema=z.object({kind:z.enum(['PRODUCT','POST','TYPE']),id:z.string().min(1).max(80),version:z.number().int().min(1),publish:z.boolean(),english:z.record(z.string(),z.unknown())}).strict();
@Controller('admin/translations')@UseGuards(AdminGuard)
class TranslationsController{
 constructor(private readonly catalog:CatalogService,private readonly posts:PostsService,private readonly types:TypesService,private readonly destinations:DestinationsService){}
 @Get()async list(@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','no-store');const[p,b,t,nodes]=await Promise.all([this.catalog.list(true),this.posts.list(true),this.types.list(true),this.destinations.list(true)]);const categories=await this.posts.categoryDictionary();return{data:([['PRODUCT',p],['POST',b],['TYPE',t]]as const).flatMap(([kind,items])=>items.map(item=>{const node=kind==='PRODUCT'&&'destinationId'in item?nodes.find(n=>n.id===item.destinationId):undefined;const source:any=translationSource(kind,item);if(node)delete source.destination;if(kind==='POST')delete source.category;const category=kind==='POST'&&'category'in item?{name:item.category,englishName:this.posts.categoryEnglishFrom(categories,item.category,item.english?.category)}:undefined;return{id:item.id,kind,version:item.version,name:'title'in item?item.title:item.name,slug:item.slug,source,english:item.english||null,...(node?{sharedDestination:{id:node.id,name:node.name,englishName:node.englishName||node.name}}:{}),...(category?{sharedCategory:category}:{}),status:translationStatus(kind,item),visible:(item.status==='PUBLISHED'&&(!('publishedAt'in item)||!item.publishedAt||new Date(item.publishedAt).getTime()<=Date.now()))||item.status==='ACTIVE'};}))};}
 @Post()async save(@Body()body:unknown,@Req()req:Request&{admin:{id:string}}){
  const parsed=inputSchema.safeParse(body);if(!parsed.success)throw new BadRequestException('Dữ liệu bản dịch không hợp lệ.');const input=parsed.data;
  const items=input.kind==='PRODUCT'?await this.catalog.list(true):input.kind==='POST'?await this.posts.list(true):await this.types.list(true);
  const item=items.find(item=>item.id===input.id);if(!item)throw new NotFoundException();
  const node=input.kind==='PRODUCT'&&'destinationId'in item?(await this.destinations.list(true)).find(n=>n.id===item.destinationId):undefined;
  const category=input.kind==='POST'&&'category'in item?await this.posts.categoryEnglish(item.category,item.english?.category||(typeof input.english.category==='string'?input.english.category:undefined)):undefined;
  const raw={...input.english,...(category!==undefined?{category}:{}),...(node?{destination:node.englishName||node.name}:{}),status:input.publish?'PUBLISHED':'DRAFT',sourceHash:sourceHash(input.kind,item)};const schema=input.kind==='PRODUCT'?productSchema.shape.english:input.kind==='POST'?postSchema.shape.english:typeSchema.shape.english;const checked=schema.safeParse(raw);if(!checked.success)throw new BadRequestException('Kiểm tra lại độ dài và trường dữ liệu bản dịch.');const english=checked.data as any;if(english.detailHtml!==undefined)english.detailHtml=cleanContent(english.detailHtml);if(english.contentHtml!==undefined)english.contentHtml=cleanContent(english.contentHtml);
  if(input.publish)this.validate(input.kind,translationSource(input.kind,item),english,!!node);
  const{updatedAt,...current}=item as any;const payload={...current,version:input.version,english};
  if(input.kind==='PRODUCT')return{data:await this.catalog.save(payload,req.admin.id)};
  if(input.kind==='POST')return{data:await this.posts.save(payload,req.admin.id,'TRANSLATE')};
  return{data:await this.types.save(payload,req.admin.id)};
 }
 private validate(kind:TranslationKind,source:any,en:any,sharedDestination=false){
  const required=kind==='PRODUCT'?['name',...(!sharedDestination?['destination']:[]),'description']:kind==='POST'?['title','excerpt','contentHtml']:['name'];
  if(kind==='PRODUCT'&&source.detailHtml.replace(/<[^>]*>/g,'').trim())required.push('detailHtml');
  if(required.some(key=>typeof en[key]!=='string'||!en[key].replace(/<[^>]*>/g,'').trim()))throw new BadRequestException('Điền đầy đủ nội dung tiếng Anh trước khi xuất bản.');
  if(kind==='PRODUCT'){
   if(!Array.isArray(en.variants)||en.variants.length!==source.variants.length||new Set(en.variants.map((v:any)=>v.id)).size!==source.variants.length)throw new BadRequestException('Cần dịch đủ các gói vé.');
   for(const variant of source.variants){const value=en.variants.find((v:any)=>v.id===variant.id);if(typeof value?.name!=='string'||!value.name.trim()||!value.conditions||typeof value.conditions!=='object'||Object.keys(value.conditions).some((g:string)=>!(g in variant.conditions))||Object.entries(variant.conditions).some(([g,text])=>text&& !value.conditions?.[g]?.trim()))throw new BadRequestException('Dịch đủ tên gói và điều kiện nhóm khách.');}
  }
 }
}
@Module({imports:[AuthModule,CatalogModule,PostsModule,TypesModule,DestinationsModule],controllers:[TranslationsController]})export class TranslationsModule{}
