import'reflect-metadata';import{test}from'node:test';import assert from'node:assert/strict';import{newDb}from'pg-mem';import{randomUUID}from'node:crypto';import{mkdtemp,mkdir,writeFile,readFile,rm,rmdir}from'node:fs/promises';import{join}from'node:path';import{tmpdir}from'node:os';import{TicketFileRetention,ticketFileExpiresAt,ticketFileCutoff}from'./ticket-file-retention';import{DatabaseService}from'../database/database.module';
test('monthly original retention uses upload month in Vietnam and keeps the whole previous month',()=>{
 assert.equal(ticketFileExpiresAt('2026-10-01T00:00:00+07:00')?.toISOString(),'2026-11-30T17:00:00.000Z');
 assert.equal(ticketFileExpiresAt('2026-10-31T23:59:59+07:00')?.toISOString(),'2026-11-30T17:00:00.000Z');
 assert.equal(ticketFileExpiresAt('2026-11-01T00:00:00+07:00')?.toISOString(),'2026-12-31T17:00:00.000Z');
 assert.equal(ticketFileExpiresAt('2026-12-30T10:00:00+07:00')?.toISOString(),'2027-01-31T17:00:00.000Z');
 assert.equal(ticketFileCutoff(new Date('2026-11-30T17:00:00Z')).toISOString(),'2026-10-31T17:00:00.000Z');
 for(const date of [undefined,'','bad','2026-02-30','2026-13-01'])assert.equal(ticketFileExpiresAt(date),null);
});

test('retention deletes only expired tracked UUID files, keeps history, retries missing/failing files and runs idempotently',async()=>{
 const media=await mkdtemp(join(tmpdir(),'jingo-ticket-retention-'));process.env.MEDIA_DIR=media;const pool=new(newDb().adapters.createPg().Pool)();
 try{
 await pool.query(`CREATE TABLE jingo_orders(id text PRIMARY KEY,snapshot jsonb);CREATE TABLE jingo_ticket_files(id text PRIMARY KEY,order_id text,created_at timestamptz DEFAULT now(),file_kind text DEFAULT 'ORIGINAL',deleted_at timestamptz,revoked_at timestamptz,revoke_reason text DEFAULT '',partner_shared boolean DEFAULT true,sharing_version integer DEFAULT 1);CREATE TABLE jingo_audit(id text PRIMARY KEY,admin_id text,action text,entity_id text);`);
 const dir=join(media,'.tickets');await mkdir(dir);const files:Record<string,string>={};
 for(const[name,date]of [['expired','2026-10-01T00:00:00+07:00'],['revoked','2026-10-31T23:59:59+07:00'],['missing','2026-10-10T00:00:00+07:00'],['retry','2026-10-01T00:00:00+07:00'],['future','2026-11-01T00:00:00+07:00'],['branded','2026-01-01T00:00:00+07:00'],['unsafe','2026-10-01T00:00:00+07:00']]){
  const id=name==='unsafe'?'../outside':randomUUID();files[name]=id;await pool.query('INSERT INTO jingo_orders(id,snapshot)VALUES($1,$2)',[name,JSON.stringify({date:'2099-01-01',total:600000})]);await pool.query('INSERT INTO jingo_ticket_files(id,order_id,created_at,file_kind)VALUES($1,$2,$3,$4)',[id,name,new Date(date),name==='branded'?'BRANDED':'ORIGINAL']);
  if(!['missing','unsafe','retry'].includes(name))await writeFile(join(dir,id+'.bin'),'ticket-'+name);
 }
 await mkdir(join(dir,files.retry+'.bin'));await writeFile(join(media,'outside.bin'),'keep outside');await pool.query('UPDATE jingo_ticket_files SET revoked_at=$2,revoke_reason=$3 WHERE id=$1',[files.revoked,new Date('2026-10-02'),'Wrong attachment']);
 const service=new TicketFileRetention({pool}as unknown as DatabaseService),before=new Date('2026-11-30T16:59:59.999Z'),due=new Date('2026-11-30T17:00:00Z');
 assert.equal((await service.clean(before)).deleted,0);assert.equal(await readFile(join(dir,files.expired+'.bin'),'utf8'),'ticket-expired');
 assert.equal((await service.clean(due)).deleted,3);await assert.rejects(()=>readFile(join(dir,files.expired+'.bin')),/ENOENT/);assert.equal(await readFile(join(dir,files.future+'.bin'),'utf8'),'ticket-future');assert.equal(await readFile(join(dir,files.branded+'.bin'),'utf8'),'ticket-branded');assert.equal(await readFile(join(media,'outside.bin'),'utf8'),'keep outside');
 const rows=(await pool.query('SELECT * FROM jingo_ticket_files')).rows;assert.ok(rows.find((r:any)=>r.id===files.expired).deleted_at);assert.equal(rows.find((r:any)=>r.id===files.expired).partner_shared,false);assert.equal(rows.find((r:any)=>r.id===files.revoked).revoke_reason,'Wrong attachment');assert.equal(rows.find((r:any)=>r.id===files.retry).deleted_at,null);assert.equal((await pool.query('SELECT id FROM jingo_orders')).rowCount,7);assert.equal((await pool.query('SELECT id FROM jingo_ticket_files')).rowCount,7);assert.equal((await pool.query('SELECT id FROM jingo_audit')).rowCount,3);
 await rmdir(join(dir,files.retry+'.bin'));await writeFile(join(dir,files.retry+'.bin'),'retry ticket');assert.equal((await service.clean(due)).deleted,1);assert.equal((await service.clean(due)).deleted,0);assert.equal((await pool.query('SELECT id FROM jingo_audit')).rowCount,4);
 }finally{await pool.end();await rm(media,{recursive:true,force:true});}
});
