import {BadRequestException,Body,ConflictException,Controller,Get,Injectable,Module,Post,Req,Res,UseGuards,Param,NotFoundException} from '@nestjs/common';
import type{Request,Response}from'express';
import{randomUUID}from'node:crypto';
import{DatabaseService}from'../database/database.module';
import{AdminGuard,AuthModule}from'../admin/auth.module';
import{typeSchema,ProductType}from'./content.schema';
import{reserveSlug}from'./slug-alias';
@Injectable()
export class TypesService{
  constructor(private readonly db:DatabaseService){}
  async list(admin=false):Promise<ProductType[]>{const rows=await this.db.pool.query('SELECT data,version FROM jingo_product_types ORDER BY slug');return rows.rows.map(row=>({...row.data,version:row.version} as ProductType)).filter(type=>admin||type.status==='ACTIVE');}
  async find(slug:string){let result=await this.db.pool.query('SELECT data,version FROM jingo_product_types WHERE slug=$1',[slug]);if(!result.rowCount)result=await this.db.pool.query('SELECT t.data,t.version FROM jingo_slug_aliases a JOIN jingo_product_types t ON t.id=a.entity_id WHERE a.kind=$1 AND a.slug=$2',['TYPE',slug]);const type=result.rows[0]?.data as ProductType|undefined;if(!type||type.status!=='ACTIVE')throw new NotFoundException();return{...type,version:result.rows[0].version};}
  async save(body:unknown,adminId:string){
    const parsed=typeSchema.safeParse(body);if(!parsed.success)throw new BadRequestException(parsed.error.issues.map(i=>i.message).join('\n'));const type=parsed.data;
    const client=await this.db.pool.connect();try{await client.query('BEGIN');
      if(type.version===0){await reserveSlug(client,'TYPE',type.id,type.slug);await client.query('INSERT INTO jingo_product_types(id,slug,data)VALUES($1,$2,$3)',[type.id,type.slug,JSON.stringify(type)]);}
      else{
        const current=await client.query('SELECT version,slug FROM jingo_product_types WHERE id=$1 FOR UPDATE',[type.id]);
        if(current.rows[0]?.version!==type.version)throw new ConflictException('Loại đã thay đổi. Tải lại trước khi lưu.');
        await reserveSlug(client,'TYPE',type.id,type.slug,current.rows[0].slug);
        if(type.status==='ARCHIVED'){
          const products=await client.query('SELECT data FROM jingo_products');
          if(products.rows.some(row=>row.data.type===type.id))throw new ConflictException('Loại đang có sản phẩm. Chuyển các sản phẩm sang loại khác trước khi lưu trữ.');
        }
        await client.query('UPDATE jingo_product_types SET slug=$1,data=$2,version=version+1 WHERE id=$3',[type.slug,JSON.stringify(type),type.id]);
      }
      await client.query('INSERT INTO jingo_audit(id,admin_id,action,entity_id)VALUES($1,$2,$3,$4)',[randomUUID(),adminId,'product-type.save',type.id]);await client.query('COMMIT');
    }catch(e){await client.query('ROLLBACK');if((e as{code?:string}).code==='23505')throw new ConflictException('Mã hoặc đường dẫn loại đã tồn tại.');throw e;}finally{client.release();}
    return(await this.list(true)).find(t=>t.id===type.id);
  }
}
@Controller('product-types')class PublicTypesController{constructor(private readonly types:TypesService){}@Get()async list(){return{data:await this.types.list()};}@Get(':slug')async find(@Param('slug')slug:string){return{data:await this.types.find(slug)};}}
@Controller('admin/product-types')@UseGuards(AdminGuard)class AdminTypesController{
  constructor(private readonly types:TypesService){}
  @Get()async list(@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','no-store');return{data:await this.types.list(true)};}
  @Post()async save(@Body()body:unknown,@Req()req:Request&{admin:{id:string}}){return{data:await this.types.save(body,req.admin.id)};}
}
@Module({imports:[AuthModule],providers:[TypesService],controllers:[PublicTypesController,AdminTypesController],exports:[TypesService]})export class TypesModule{}
