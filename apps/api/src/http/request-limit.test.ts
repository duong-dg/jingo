import'reflect-metadata';
import{test}from'node:test';import assert from'node:assert/strict';import type{Request,Response}from'express';
import{Test}from'@nestjs/testing';import{newDb}from'pg-mem';import{AppModule}from'../app.module';
import{clientAddress}from'./client-address';import{RequestLimit,requestBudgets}from'./request-limit';
const secret='edge-fixture-012345678901234567890123456789';
function req(ip='198.51.100.1',valid=true){return{headers:{'x-jingo-edge-secret':valid?secret:'wrong','x-jingo-client-ip':ip},socket:{remoteAddress:'::ffff:127.0.0.1'}}as unknown as Request;}
function response(){const headers:Record<string,string>={};return{headers,res:{setHeader:(name:string,value:unknown)=>{headers[name]=String(value);}}as unknown as Response};}

test('client IP requires the shared proxy secret, rejects spoofed/invalid headers and canonicalizes equivalent addresses',()=>{
 const previous=process.env.ADMIN_PROXY_SECRET;process.env.ADMIN_PROXY_SECRET=secret;
 try{
  assert.deepEqual(clientAddress(req()),{ip:'198.51.100.1',ipSource:'VERIFIED_PROXY'});
  for(const header of ['x-forwarded-for','x-real-ip']){const r=req('1.1.1.1',false);r.headers[header]='8.8.8.8';assert.deepEqual(clientAddress(r),{ip:'127.0.0.1',ipSource:'SOCKET'});}
  for(const ip of ['8.8.8.8, 1.1.1.1','8.8.8.8:80','http://8.8.8.8','bad','fe80::1%eth0',''])assert.equal(clientAddress(req(ip)).ipSource,'SOCKET');
  const unicode=req();unicode.headers['x-jingo-edge-secret']='é'.repeat(secret.length);assert.equal(clientAddress(unicode).ipSource,'SOCKET');
  const duplicate=req();duplicate.headers['x-jingo-client-ip']=['8.8.8.8','1.1.1.1'];assert.equal(clientAddress(duplicate).ipSource,'SOCKET');
  assert.equal(clientAddress(req('::ffff:192.0.2.1')).ip,'192.0.2.1');assert.equal(clientAddress(req('::FFFF:c000:201')).ip,'192.0.2.1');
  assert.equal(clientAddress(req('2001:0DB8:0000:0000:0000:0000:0000:0001')).ip,'2001:db8::1');
  process.env.ADMIN_PROXY_SECRET='';assert.equal(clientAddress(req()).ipSource,'SOCKET');process.env.ADMIN_PROXY_SECRET='short';assert.equal(clientAddress(req()).ipSource,'SOCKET');
 }finally{if(previous===undefined)delete process.env.ADMIN_PROXY_SECRET;else process.env.ADMIN_PROXY_SECRET=previous;}
});

test('limits isolate clients/actions, retain spoofed requests in socket bucket, return retry time and expire bounded memory',()=>{
 const previous=process.env.ADMIN_PROXY_SECRET;process.env.ADMIN_PROXY_SECRET=secret;
 try{
  let now=100000;const limit=new RequestLimit(3,()=>now),a=req(),b=req('198.51.100.2'),r=response();
  limit.check(a,r.res,'create',2);limit.check(a,r.res,'create',2);assert.throws(()=>limit.check(a,r.res,'create',2),(e:any)=>e.getStatus()===429);assert.equal(r.headers['Retry-After'],'60');assert.equal(r.headers['X-RateLimit-Remaining'],'0');
  limit.check(b,r.res,'create',2);limit.check(a,r.res,'lookup',10);assert.throws(()=>limit.check(req('198.51.100.3'),r.res,'create',2),'bounded map cannot be grown without limit');
  now+=60000;limit.check(a,r.res,'create',2);limit.check(b,r.res,'create',2);limit.check(req('198.51.100.3'),r.res,'create',2);
  const spoof=new RequestLimit();spoof.check(req('1.1.1.1',false),r.res,'create',1);assert.throws(()=>spoof.check(req('8.8.8.8',false),r.res,'create',1),'changing an unverified IP does not reset quota');
 }finally{if(previous===undefined)delete process.env.ADMIN_PROXY_SECRET;else process.env.ADMIN_PROXY_SECRET=previous;}
});

test('HTTP API separates booking, lookup, checkout, capture and OAuth quotas behind one proxy',async()=>{
 const previous=process.env.ADMIN_PROXY_SECRET;process.env.ADMIN_PROXY_SECRET=secret;process.env.NODE_ENV='test';process.env.ADMIN_EMAIL='';process.env.ADMIN_PASSWORD='';process.env.PUBLIC_BASE_URL='http://localhost:3105';
 const pool=new(newDb({noAstCoverageCheck:true}).adapters.createPg().Pool)(),module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider('DB_POOL').useValue(pool).compile(),app=module.createNestApplication();app.setGlobalPrefix('api/v1');
 try{await app.listen(0,'127.0.0.1');const base=await app.getUrl()+'/api/v1';
  const post=(path:string,ip:string,valid=true)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json','X-Jingo-Request':'1','X-Jingo-Edge-Secret':valid?secret:'wrong','X-Jingo-Client-IP':ip,Origin:process.env.PUBLIC_BASE_URL!},body:'{}'});
  for(const path of ['/orders','/carts']){
   for(let i=0;i<requestBudgets.create;i++)assert.equal((await post(path,'198.51.100.1')).status,400);
   const blocked=await post(path,'198.51.100.1');assert.equal(blocked.status,429);assert.ok(Number(blocked.headers.get('retry-after'))>0);assert.equal((await post(path,'198.51.100.2')).status,400,'another verified client retains its quota');
   for(let i=0;i<requestBudgets.lookup;i++)assert.equal((await post(path+'/lookup','198.51.100.1')).status,400,'lookup is independent of exhausted booking budget');
   assert.equal((await post(path+'/lookup','198.51.100.1')).status,429);assert.equal((await post(path+'/lookup','198.51.100.2')).status,400);
  }
  for(let i=0;i<requestBudgets.checkout;i++)assert.equal((await post('/payments/checkout','198.51.100.1')).status,400);assert.equal((await post('/payments/checkout','198.51.100.1')).status,429);assert.equal((await post('/payments/checkout','198.51.100.2')).status,400);
  assert.equal((await post('/payments/paypal/capture','198.51.100.1')).status,400,'capture has an independent budget');assert.equal((await post('/payments/sepay/oauth/token','198.51.100.1')).status,401,'OAuth remains separate and authenticated');
  for(let i=0;i<requestBudgets.create;i++)assert.equal((await post('/orders','203.0.113.'+(i+1),false)).status,400);assert.equal((await post('/orders','203.0.113.99',false)).status,429,'forged client header shares socket quota');
 }finally{await app.close();if(previous===undefined)delete process.env.ADMIN_PROXY_SECRET;else process.env.ADMIN_PROXY_SECRET=previous;}
});
