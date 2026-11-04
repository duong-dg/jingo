import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Test} from '@nestjs/testing';
import {newDb} from 'pg-mem';
import {AppModule} from '../app.module';
import {DatabaseService} from './database.module';
import {migrateJinMemoContent,rebrandContent,rebrandPublicCopy} from './jinmemo-content';
import {sourceHash,translationStatus} from '../content/translations';

test('public copy replacement preserves mailboxes, technical identifiers, routes and unrelated domains',()=>{
 assert.equal(rebrandPublicCopy('JinGo · JINGO · jingo'),'JinMemo · JinMemo · JinMemo');
 assert.equal(rebrandPublicCopy('Cùng JinGo. With JinGo!'),'Cùng JinMemo. With JinMemo!');
 assert.equal(rebrandPublicCopy('<a href="http://www.jingo.io.vn/en/blog/old-slug?q=1#part">JinGo</a>'),'<a href="https://jinmemo.com/en/blog/old-slug?q=1#part">JinMemo</a>');
 for(const value of ['support@jingo.io.vn','jingo@gmail.com','JinGo+booking@gmail.com','jingo_orders','/ve/jingo-tour','https://jingo.io.vn.attacker.test','https://other.test/jingo','https://jingo.io.vn:8080/api'])assert.equal(rebrandPublicCopy(value),value);
 assert.equal(rebrandPublicCopy('Website: jingo.io.vn'),'Website: jinmemo.com');
});
test('rebranding does not publish draft or repair already-stale translations',()=>{
 const item={name:'JinGo',description:'JinGo',variants:[],english:{name:'JinGo English',status:'PUBLISHED',sourceHash:'a'.repeat(64)}};
 const changed=rebrandContent('PRODUCT',item);assert.equal(changed.english.sourceHash,item.english.sourceHash);assert.equal(translationStatus('PRODUCT',changed),'NEEDS_REVIEW');
 item.english.status='DRAFT';assert.equal(rebrandContent('PRODUCT',item).english.status,'DRAFT');
});
test('content migration preserves four product price schedules and three bilingual posts, archives originals and runs once',async()=>{
 process.env.NODE_ENV='test';const pg=newDb({noAstCoverageCheck:true}).adapters.createPg(),module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider('DB_POOL').useValue(new pg.Pool()).compile(),app=module.createNestApplication();await app.init();
 try{
  const pool=app.get(DatabaseService).pool;await pool.query('DELETE FROM jingo_migrations WHERE id=$1',['jinmemo_content_v2']);
  const sample=(await pool.query('SELECT data FROM jingo_products ORDER BY id')).rows[0].data;await pool.query('INSERT INTO jingo_products(id,slug,data)VALUES($1,$2,$3)',['fourth-product','fourth-product',JSON.stringify({...sample,id:'fourth-product',slug:'fourth-product'})]);
  const originals=new Map<string,any>();
  for(const row of (await pool.query('SELECT id,data FROM jingo_products')).rows){const data=row.data;data.description='Vé JinGo, giá giữ nguyên';data.detailHtml='<p>Đặt tại <a href="https://jingo.io.vn/ve/'+data.slug+'">JinGo</a></p>';data.variants[0].conditions={ADULT:'Xuất trình vé JinGo'};data.english={name:'JinGo English',description:'Book with JinGo',detailHtml:'Visit https://jingo.io.vn/en',status:'PUBLISHED',variants:[{id:data.variants[0].id,name:'JinGo ECO',conditions:{ADULT:'JinGo ticket'}}],sourceHash:sourceHash('PRODUCT',data)};originals.set(row.id,structuredClone(data));await pool.query('UPDATE jingo_products SET data=$1 WHERE id=$2',[JSON.stringify(data),row.id]);}
  for(let i=1;i<=3;i++){const data={id:'post-'+i,slug:'keep-slug-'+i,title:'Bài chuẩn '+i,excerpt:'JinGo đồng hành',author:'JinGo',contentHtml:'<p>Giá 600.000đ. JinGo <img src="/api/v1/media/keep-image" alt="JinGo"/></p>',seoTitle:'Lịch trình | JinGo',cover:{id:'keep-image',alt:'Ảnh JinGo'},status:'PUBLISHED',publishedAt:'2026-10-01T00:00:00Z',relatedProductIds:['fourth-product'],english:{slug:'keep-english-'+i,title:'English title '+i,contentHtml:'With JinGo',status:'PUBLISHED'}};originals.set(data.id,structuredClone(data));await pool.query('INSERT INTO jingo_posts(id,slug,data)VALUES($1,$2,$3)',[data.id,data.slug,JSON.stringify(data)]);}
  const beforeProducts=(await pool.query('SELECT id,slug,data,version,updated_at FROM jingo_products ORDER BY id')).rows,beforePosts=(await pool.query('SELECT id,slug,data,version,updated_at FROM jingo_posts ORDER BY id')).rows;
  await migrateJinMemoContent(pool);
  const products=(await pool.query('SELECT id,slug,data,version,updated_at FROM jingo_products ORDER BY id')).rows;assert.equal(products.length,4);
  for(const row of products){const before=beforeProducts.find(r=>r.id===row.id)!,old=originals.get(row.id);assert.equal(row.slug,before.slug);assert.equal(row.version,before.version+1);assert.deepEqual(row.updated_at,before.updated_at);assert.equal(row.data.description,'Vé JinMemo, giá giữ nguyên');assert.equal(translationStatus('PRODUCT',row.data),'PUBLISHED');assert.deepEqual(row.data.variants.map((v:any)=>({...v,conditions:undefined})),old.variants.map((v:any)=>({...v,conditions:undefined})));assert.deepEqual(row.data.rules,old.rules);assert.deepEqual(row.data.closures,old.closures);assert.equal(row.data.english.variants[0].name,'JinMemo ECO');}
  const posts=(await pool.query('SELECT id,slug,data,updated_at FROM jingo_posts ORDER BY id')).rows;assert.equal(posts.length,3);
  for(const row of posts){const before=beforePosts.find(p=>p.id===row.id)!;assert.equal(row.slug,before.slug);assert.equal(row.data.english.slug,before.data.english.slug);assert.equal(row.data.author,'JinMemo');assert.equal(row.data.publishedAt,before.data.publishedAt);assert.deepEqual(row.updated_at,before.updated_at);assert.deepEqual(row.data.relatedProductIds,before.data.relatedProductIds);assert.equal(row.data.cover.id,'keep-image');assert.match(row.data.contentHtml,/600.000đ/);assert.match(row.data.contentHtml,/\/api\/v1\/media\/keep-image/);}
  const history=(await pool.query('SELECT entity_id,data FROM jingo_rebrand_history')).rows;assert.equal(history.length,7);for(const row of history)assert.deepEqual(row.data,originals.get(row.entity_id));
  await migrateJinMemoContent(pool);assert.equal((await pool.query('SELECT entity_id FROM jingo_rebrand_history')).rowCount,7);assert.deepEqual((await pool.query('SELECT id,slug,data,version,updated_at FROM jingo_products ORDER BY id')).rows,products);
 }finally{await app.close();}
});
