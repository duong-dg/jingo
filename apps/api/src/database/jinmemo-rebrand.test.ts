import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Test} from '@nestjs/testing';
import {newDb} from 'pg-mem';
import {AppModule} from '../app.module';
import {DatabaseService} from './database.module';
import {migrateJinMemoBrand} from './jinmemo-rebrand';

test('JinMemo migration only changes brand copy, preserving business content, configuration and historical orders',async()=>{
 process.env.NODE_ENV='test';const pg=newDb({noAstCoverageCheck:true}).adapters.createPg(),pool=new pg.Pool(),module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider('DB_POOL').useValue(pool).compile(),app=module.createNestApplication();await app.init();
 try{
  const db=app.get(DatabaseService);await db.pool.query('DELETE FROM jingo_migrations WHERE id=$1',['jinmemo_brand_v1']);
  for(let n=1;n<=3;n++)await db.pool.query('INSERT INTO jingo_posts(id,slug,data)VALUES($1,$2,$3)',['brand-post-'+n,'unchanged-post-'+n,JSON.stringify({title:'JinGo original article '+n,english:{title:'Original English',slug:'original-en-'+n},contentHtml:'Keep exact content',cover:{id:'unchanged-cover'}})]);
  await db.pool.query('INSERT INTO jingo_orders(id,code,request_id,request_hash,access_hash,snapshot,contact)VALUES($1,$2,$3,$4,$5,$6,$7)',['brand-order','JGKEEP','brand-request','keep-request-hash','keep-access-hash',JSON.stringify({productName:'JinGo original product',total:600000,date:'2026-11-04'}),JSON.stringify({email:'customer@example.test'})]);
  const products=(await db.pool.query('SELECT * FROM jingo_products ORDER BY id')).rows,posts=(await db.pool.query('SELECT * FROM jingo_posts ORDER BY id')).rows,orders=(await db.pool.query('SELECT * FROM jingo_orders ORDER BY id')).rows;
  const image={id:'image-fixture',alt:'JinGo original image'},seo={vi:{title:'JinGo vé chuẩn',description:'Cùng JinGo'},en:{title:'JinGo tickets',description:'With JinGo'},image};
  const smtp={fromName:'JinGo',fromEmail:'support@jingo.io.vn',host:'smtp.example.test',encryptedPassword:'preserve-secret',enabled:true};
  for(const [id,data] of [['site-seo',seo],['smtp',smtp]] as const)await db.pool.query('INSERT INTO jingo_settings(id,data)VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET data=$2',[id,JSON.stringify(data)]);
  const contactId='00000000-0000-4000-8000-000000000001',page=(await db.pool.query('SELECT data FROM jingo_pages WHERE id=$1',[contactId])).rows[0].data;
  page.title='Liên hệ JinGo';page.english.title='Contact JinGo';page.contact.email='support@jingo.io.vn';await db.pool.query('UPDATE jingo_pages SET data=$1 WHERE id=$2',[JSON.stringify(page),contactId]);
  await migrateJinMemoBrand(db.pool);
  const read=async(id:string)=>(await db.pool.query('SELECT data,version FROM jingo_settings WHERE id=$1',[id])).rows[0];
  const actual=await read('site-seo');assert.equal(actual.data.vi.title,'JinMemo vé chuẩn');assert.equal(actual.data.en.title,'JinMemo tickets');assert.deepEqual(actual.data.image,image);
  assert.deepEqual((await read('smtp')).data,{...smtp,fromName:'JinMemo'});
  const contact=(await db.pool.query('SELECT data FROM jingo_pages WHERE id=$1',[contactId])).rows[0].data;assert.equal(contact.title,'Liên hệ JinMemo');assert.equal(contact.english.title,'Contact JinMemo');assert.equal(contact.contact.email,page.contact.email);assert.equal(contact.slug,page.slug);
  assert.deepEqual((await db.pool.query('SELECT * FROM jingo_products ORDER BY id')).rows,products);assert.deepEqual((await db.pool.query('SELECT * FROM jingo_posts ORDER BY id')).rows,posts);assert.deepEqual((await db.pool.query('SELECT * FROM jingo_orders ORDER BY id')).rows,orders);
  await migrateJinMemoBrand(db.pool);assert.equal((await read('site-seo')).version,actual.version,'migration is idempotent');
 }finally{await app.close();}
});
