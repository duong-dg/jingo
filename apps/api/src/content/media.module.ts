import {BadRequestException,Controller,Get,Injectable,Module,NotFoundException,Param,Post,Req,Res,UploadedFile,UseGuards,UseInterceptors,Body,HttpException} from '@nestjs/common';
import {FileInterceptor} from '@nestjs/platform-express';
import type {Request,Response} from 'express';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile,unlink,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import sharp from 'sharp';
import {z} from 'zod';
import {DatabaseService} from '../database/database.module';
import {AdminGuard,AuthModule} from '../admin/auth.module';
type Upload={buffer:Buffer;originalname:string;size:number};
@Injectable()
export class MediaService{
  private processing=false;
  constructor(private readonly db:DatabaseService){}
  private get directory(){return resolve(process.env.MEDIA_DIR||join(process.cwd(),'data','media'));}
  async upload(file:Upload,alt:string,adminId:string){
    if(!file?.buffer||file.size>5*1024*1024)throw new BadRequestException('Chọn ảnh JPG, PNG hoặc WebP tối đa 5 MB.');
    const buffer=file.buffer;const jpeg=buffer[0]===0xff&&buffer[1]===0xd8&&buffer[2]===0xff;
    const png=buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const webp=buffer.subarray(0,4).toString()==='RIFF'&&buffer.subarray(8,12).toString()==='WEBP';
    if(!jpeg&&!png&&!webp)throw new BadRequestException('Nội dung file không phải JPG, PNG hoặc WebP.');
    if(this.processing)throw new HttpException('Đang tối ưu ảnh khác. Vui lòng thử lại sau vài giây.',429);
    this.processing=true;
    try{
      const source=sharp(file.buffer,{limitInputPixels:25_000_000,animated:false});const metadata=await source.metadata();
      if(!['jpeg','png','webp'].includes(metadata.format||''))throw new Error('format');
      const output=await source.rotate().resize({width:1920,height:1920,fit:'inside',withoutEnlargement:true}).webp({quality:82}).toBuffer({resolveWithObject:true});
      const id=randomUUID();await mkdir(this.directory,{recursive:true});const path=join(this.directory,`${id}.webp`);
      await writeFile(path,output.data,{flag:'wx'});
      try{
        const row=await this.db.pool.query('INSERT INTO jingo_media(id,filename,alt,width,height,bytes,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',[id,file.originalname.replace(/[\\/]/g,'_').slice(0,200),alt,output.info.width,output.info.height,output.data.length,adminId]);
        return this.publicMetadata(row.rows[0]);
      }catch(error){await unlink(path).catch(()=>{});throw error;}
    }catch(error){if(error instanceof BadRequestException)throw error;if((error as {code?:string}).code)throw error;throw new BadRequestException('Ảnh không hợp lệ. Chỉ nhận JPG, PNG, WebP, tối đa 25 triệu điểm ảnh.');}finally{this.processing=false;}
  }
  private publicMetadata(row:Record<string,unknown>){const {created_by,...image}=row;return {...image,url:`/api/v1/media/${row.id}`};}
  async list(){return (await this.db.pool.query('SELECT * FROM jingo_media ORDER BY created_at DESC LIMIT 100')).rows.map(row=>this.publicMetadata(row));}
  async validateIds(ids:string[]){for(const id of new Set(ids)){const result=await this.db.pool.query('SELECT id FROM jingo_media WHERE id=$1',[id]);if(!result.rowCount)throw new BadRequestException('Ảnh tham chiếu không tồn tại trong thư viện.');}}
  async file(id:string){
    if(!z.uuid().safeParse(id).success)throw new NotFoundException();
    const result=await this.db.pool.query('SELECT id FROM jingo_media WHERE id=$1',[id]);if(!result.rowCount)throw new NotFoundException();
    const path=join(this.directory,`${id}.webp`);try{await stat(path);}catch{throw new NotFoundException('Không tìm thấy file ảnh.');}return path;
  }
}
@Controller('admin/media')
@UseGuards(AdminGuard)
class AdminMediaController{
  constructor(private readonly media:MediaService){}
  @Get()async list(@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','no-store');return {data:await this.media.list()};}
  @Post()@UseInterceptors(FileInterceptor('file',{limits:{fileSize:5*1024*1024,files:1,fields:1}}))
  async upload(@UploadedFile()file:Upload,@Body('alt')alt:unknown,@Req()req:Request&{admin:{id:string}}){
    const parsed=z.string().trim().max(300).safeParse(alt??'');if(!parsed.success)throw new BadRequestException('Mô tả ảnh tối đa 300 ký tự.');
    return {data:await this.media.upload(file,parsed.data,req.admin.id)};
  }
}
@Controller('media')
class PublicMediaController{
  constructor(private readonly media:MediaService){}
  @Get(':id')async file(@Param('id')id:string,@Res()res:Response){const path=await this.media.file(id);res.setHeader('Content-Type','image/webp');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','public, max-age=31536000, immutable');res.sendFile(path,error=>{if(error&&!res.headersSent)res.status(404).end();});}
}
@Module({imports:[AuthModule],providers:[MediaService],controllers:[AdminMediaController,PublicMediaController],exports:[MediaService]})
export class MediaModule{}
