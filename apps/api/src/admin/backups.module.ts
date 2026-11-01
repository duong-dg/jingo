import { Controller, Get, Injectable, Module, NotFoundException, Param, Req, Res, UseGuards } from '@nestjs/common';
import { constants } from 'node:fs';
import { open, readdir, realpath } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { z } from 'zod';
import { AdminGuard, AuthModule } from './auth.module';
import { DatabaseService } from '../database/database.module';

const idPattern = /^jingo-backup-\d{8}T\d{6}Z-[a-f0-9]{8}$/;
const metadata = z.object({id:z.string().regex(idPattern),createdAt:z.string().datetime(),verifiedAt:z.string().datetime(),bytes:z.number().int().positive(),sha256:z.string().regex(/^[a-f0-9]{64}$/),revision:z.string().regex(/^[a-f0-9]{40,64}$/),snapshot:z.object({orders:z.number().int().nonnegative(),carts:z.number().int().nonnegative(),products:z.number().int().nonnegative(),payments:z.number().int().nonnegative(),ticketFiles:z.number().int().nonnegative()})});
@Injectable()
export class BackupsService {
  private root(){ return resolve(process.env.BACKUP_DIR || '/app/backups'); }
  private async file(name:string){
    const root=this.root(),path=resolve(root,name);
    if(dirname(path)!==root)throw new NotFoundException();
    const file=await open(path,constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
    try{if(!(await file.stat()).isFile()||await realpath(path)!==path)throw new NotFoundException();return file;}catch(e){await file.close();throw e;}
  }
  private async json(name:string):Promise<unknown>{const file=await this.file(name);try{if((await file.stat()).size>65536)throw new NotFoundException();return JSON.parse(await file.readFile('utf8'));}finally{await file.close();}}
  async record(id:string){
    if(!idPattern.test(id))throw new NotFoundException();
    const data=metadata.parse(await this.json(id+'.json')),file=await this.file(id+'.tar.gpg');
    try{if(data.id!==id||(await file.stat()).size!==data.bytes)throw new NotFoundException();}finally{await file.close();}
    let restoreTestedAt:string|undefined;
    try{const test=z.object({id:z.literal(id),sha256:z.literal(data.sha256),testedAt:z.string().datetime()}).parse(await this.json(id+'.restore-test.json'));restoreTestedAt=test.testedAt;}catch{}
    return {...data,restoreTestedAt};
  }
  async list(){
    let names:string[];try{names=await readdir(this.root());}catch{return{configured:false,data:[],setup:null,lastRun:null};}
    const data=[];
    for(const name of names.filter(n=>n.endsWith('.json')&&idPattern.test(n.slice(0,-5))).sort().reverse().slice(0,90)){try{data.push(await this.record(name.slice(0,-5)));}catch{}}
    let setup=null,lastRun=null;
    try{setup=z.object({schedule:z.literal('03:15 Asia/Ho_Chi_Minh'),keep:z.number().int().min(1).max(90),installedAt:z.string().datetime()}).parse(await this.json('setup.json'));}catch{}
    try{lastRun=z.object({state:z.enum(['RUNNING','SUCCESS','FAILED']),updatedAt:z.string().datetime(),startedAt:z.string().datetime().optional()}).parse(await this.json('last-run.json'));}catch{}
    return{configured:!!setup,data,setup,lastRun};
  }
  constructor(private readonly db:DatabaseService){}
  async download(id:string,actor:string,res:Response){
    let record,file;try{record=await this.record(id);file=await this.file(id+'.tar.gpg');}catch{throw new NotFoundException('Không tìm thấy bản sao hoàn chỉnh.');}
    try{
      if((await file.stat()).size!==record.bytes)throw new NotFoundException();
      await this.db.pool.query('INSERT INTO jingo_audit(id,admin_id,action,entity_id)VALUES($1,$2,$3,$4)',[randomUUID(),actor,'backup.download',id]);
      res.setHeader('Content-Type','application/octet-stream');res.setHeader('Content-Length',record.bytes);res.setHeader('Content-Disposition',`attachment; filename="${id}.tar.gpg"`);
      await pipeline(file.createReadStream({autoClose:false}),res);
    }finally{await file.close();}
  }
}
@Controller('admin/backups') @UseGuards(AdminGuard)
class BackupsController {
 constructor(private readonly backups:BackupsService){}
 @Get() list(@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','private, no-store');return this.backups.list();}
 @Get(':id/download') download(@Param('id')id:string,@Req()req:any,@Res()res:Response){res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');return this.backups.download(id,req.admin.id,res);}
}
@Module({imports:[AuthModule],providers:[BackupsService],controllers:[BackupsController]})
export class BackupsModule {}
