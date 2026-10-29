import{Injectable,Logger,OnApplicationBootstrap,OnModuleDestroy}from'@nestjs/common';
import{unlink}from'node:fs/promises';import{join,resolve}from'node:path';import{randomUUID}from'node:crypto';import{DatabaseService}from'../database/database.module';
const VN=7*3600000;
// Uploaded in October => expires at 00:00 Vietnam time on December 1.
export function ticketFileExpiresAt(created:unknown){
 if(!(created instanceof Date)&&typeof created!=='string')return null;
 const time=new Date(created as string|Date).getTime();if(!Number.isFinite(time))return null;
 if(typeof created==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(created)&&new Date(time).toISOString().slice(0,10)!==created)return null;
 const local=new Date(time+VN);return new Date(Date.UTC(local.getUTCFullYear(),local.getUTCMonth()+2,1)-VN);
}
export function ticketFileCutoff(now:Date){const local=new Date(now.getTime()+VN);return new Date(Date.UTC(local.getUTCFullYear(),local.getUTCMonth()-1,1)-VN);}
@Injectable()export class TicketFileRetention implements OnApplicationBootstrap,OnModuleDestroy{
 private readonly logger=new Logger(TicketFileRetention.name);private timer?:ReturnType<typeof setInterval>;private running=false;
 constructor(private readonly db:DatabaseService){}
 onApplicationBootstrap(){if(process.env.NODE_ENV==='test')return;const run=()=>void this.clean().catch(()=>this.logger.error('Không hoàn tất dọn file vé hết hạn. Sẽ thử lại ở lượt sau.'));this.timer=setInterval(run,3600000);this.timer.unref();run();}
 onModuleDestroy(){if(this.timer)clearInterval(this.timer);}
 async clean(now=new Date()){
  if(this.running)return{deleted:0};this.running=true;let deleted=0;
  try{
   const cutoff=ticketFileCutoff(now);
   const candidates=(await this.db.pool.query("SELECT f.id,f.order_id FROM jingo_ticket_files f WHERE f.deleted_at IS NULL AND f.file_kind='ORIGINAL' AND f.created_at<$1 ORDER BY f.created_at,f.id LIMIT 500",[cutoff])).rows;
   for(const candidate of candidates){
    // Only tracked UUID files inside the private ticket directory can be removed.
    if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(candidate.id))continue;
    const client=await this.db.pool.connect();
    try{
     await client.query('BEGIN');const file=(await client.query('SELECT id,order_id,created_at,file_kind,deleted_at FROM jingo_ticket_files WHERE id=$1 FOR UPDATE',[candidate.id])).rows[0];
     if(!file||file.deleted_at||file.file_kind!=='ORIGINAL'){await client.query('COMMIT');continue;}
     const expires=ticketFileExpiresAt(file.created_at);
     if(!expires||expires.getTime()>now.getTime()){await client.query('COMMIT');continue;}
     try{await unlink(join(resolve(process.env.MEDIA_DIR||'data/media'),'.tickets',file.id+'.bin'));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
     await client.query("UPDATE jingo_ticket_files SET deleted_at=$2,revoked_at=COALESCE(revoked_at,$2),revoke_reason=CASE WHEN revoke_reason='' THEN 'Tự xóa file gốc theo lịch đầu tháng' ELSE revoke_reason END,partner_shared=false,sharing_version=sharing_version+1 WHERE id=$1",[file.id,now]);
     await client.query('INSERT INTO jingo_audit(id,admin_id,action,entity_id)VALUES($1,$2,$3,$4)',[randomUUID(),'system:ticket-retention','ticket-file.expire',file.id]);
     await client.query('COMMIT');deleted++;
    }catch{await client.query('ROLLBACK');this.logger.warn('Chưa xóa được một file vé hết hạn; sẽ thử lại ở lượt sau.');}finally{client.release();}
   }
   return{deleted};
  }finally{this.running=false;}
 }
}
