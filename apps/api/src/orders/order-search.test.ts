import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {newDb,DataType} from 'pg-mem';
import {Test} from '@nestjs/testing';
import {AppModule} from '../app.module';
import {OrderSearchService} from './order-search.service';

test('admin searches all orders with stable pages, literal text, channel/status/date filters and global filtered totals',async()=>{
 const media=await mkdtemp(join(tmpdir(),'jingo-search-'));process.env.MEDIA_DIR=media;process.env.ADMIN_EMAIL='search@example.test';process.env.ADMIN_PASSWORD='search-fixture-password';process.env.PUBLIC_BASE_URL='http://localhost:3000';
 const memory=newDb({noAstCoverageCheck:true}),adapter=memory.adapters.createPg(),pool=new adapter.Pool();
 memory.public.registerFunction({name:"strpos",args:[DataType.text,DataType.text],returns:DataType.integer,implementation:(value:string,needle:string)=>value.indexOf(needle)+1});
 const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider('DB_POOL').useValue(pool).compile(),app=module.createNestApplication();app.setGlobalPrefix('api/v1');
 try{
  await app.listen(0,'127.0.0.1');const service=module.get(OrderSearchService),base=await app.getUrl()+'/api/v1';
  assert.equal((await fetch(base+'/admin/orders?q=test')).status,401);
  const ids:string[]=[];
  for(let i=0;i<207;i++){
   const id=randomUUID();ids.push(id);
   await pool.query('INSERT INTO jingo_orders(id,code,request_id,request_hash,access_hash,snapshot,contact,booking_status,payment_status,created_at)VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[id,'SEARCH'+String(i).padStart(4,'0'),randomUUID(),'fixture','fixture',JSON.stringify({productName:'Search fixture',variantName:'Adult',date:i<200?'2099-01-01':'2099-02-01',total:100,lines:[]}),JSON.stringify({name:i===0?'Find 100%_literal':'Guest '+i,phone:'0901234567',email:i===0?'old-guest@example.test':'guest@example.test'}),i===206?'CANCELLED':'CONFIRMED',i===1?'PAID':'UNPAID',new Date('2026-10-26T17:00:00Z')]);
  }
  await pool.query('INSERT INTO jingo_pos_orders(order_id,counter_id,admin_id)VALUES($1,$2,$3)',[ids[1],'main','fixture']);
  const partnerId=randomUUID();await pool.query('INSERT INTO jingo_partners(id,email,password_hash,data)VALUES($1,$2,$3,$4)',[partnerId,'partner-search@example.test','fixture','{}']);
  await pool.query('INSERT INTO jingo_partner_orders(order_id,partner_id)VALUES($1,$2)',[ids[2],partnerId]);
  await pool.query('INSERT INTO jingo_order_archives(order_id,archived_by,reason)VALUES($1,$2,$3)',[ids[206],'fixture','Archived fixture']);
  let result=await service.search({});assert.equal(result.total,206);assert.equal(result.data.length,25);assert.equal(result.pages,9);assert.equal(result.summary.unpaid,205);assert.equal(result.summary.paidValue,100);
  const all=new Set<string>();for(let page=1;page<=9;page++){result=await service.search({page:String(page)});for(const row of result.data){assert.ok(!all.has(row.id));all.add(row.id);}}assert.equal(all.size,206);
  result=await service.search({q:'OLD-GUEST@EXAMPLE.TEST'});assert.equal(result.total,1);assert.equal(result.data[0].id,ids[0]);
  assert.equal((await service.search({q:"' OR 1=1 --"})).total,0);
  assert.equal((await service.search({q:'100%_literal'})).total,1);
  result=await service.search({channel:'POS',payment:'PAID'});assert.equal(result.total,1);assert.equal(result.data[0].channel,'POS');
  assert.equal((await service.search({channel:'WEB'})).total,204);
  assert.equal((await service.search({channel:'CTV',payment:'UNPAID'})).data[0].id,ids[2]);
  assert.equal((await service.search({dateKind:'VISIT',from:'2099-02-01',to:'2099-02-01'})).total,6);
  assert.equal((await service.search({from:'2026-10-27',to:'2026-10-27'})).total,206,'created date uses Vietnam midnight');
  assert.equal((await service.search({from:'2026-10-26',to:'2026-10-26'})).total,0);
  assert.equal((await service.search({archived:'true',booking:'CANCELLED'})).total,1);
  assert.equal((await service.search({page:999})).page,9);
  for(const query of [{page:0},{pageSize:101},{payment:'INVALID'},{from:'2026-02-30'},{from:'2026-10-27',to:'2026-10-01'},{q:['x']}])await assert.rejects(service.search(query));
  const login=await fetch(base+'/admin/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://localhost:3000','X-Jingo-Admin':'1'},body:JSON.stringify({email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD})});assert.equal(login.status,201);
  const response=await fetch(base+'/admin/orders?channel=POS&payment=PAID',{headers:{Cookie:login.headers.get('set-cookie')!.split(';')[0]}});assert.equal(response.status,200);assert.equal((await response.json()).total,1);assert.equal(response.headers.get('cache-control'),'no-store');
 }finally{await app.close();await rm(media,{recursive:true,force:true});}
});
