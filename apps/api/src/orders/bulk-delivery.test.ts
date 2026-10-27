import'reflect-metadata';import{test}from'node:test';import assert from'node:assert/strict';import{randomBytes,randomUUID}from'node:crypto';import{mkdtemp,rm}from'node:fs/promises';import{join}from'node:path';import{tmpdir}from'node:os';import{Test}from'@nestjs/testing';import{newDb}from'pg-mem';import{AppModule}from'../app.module';
test('batch delivery validates all codes first, respects payment/guest limits and retries without duplicating tickets or mail',async()=>{
 const media=await mkdtemp(join(tmpdir(),'jingo-delivery-'));process.env.NODE_ENV='test';process.env.MEDIA_DIR=media;process.env.ADMIN_EMAIL='batch@example.test';process.env.ADMIN_PASSWORD='batch-test-password';process.env.PUBLIC_BASE_URL='http://localhost:3000';
 const memory=newDb({noAstCoverageCheck:true}),adapter=memory.adapters.createPg(),pool=new adapter.Pool(),module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider('DB_POOL').useValue(pool).compile(),app=module.createNestApplication();app.setGlobalPrefix('api/v1');let cookie='';
 try{await app.listen(0,'127.0.0.1');const base=await app.getUrl()+'/api/v1',call=(path:string,body?:unknown,admin=true)=>fetch(base+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',Origin:'http://localhost:3000','X-Jingo-Admin':'1',...(admin?{Cookie:cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const login=await call('/admin/login',{email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD});cookie=login.headers.get('set-cookie')!.split(';')[0];
  assert.equal((await call('/admin/smtp',{enabled:true,host:'smtp.example.test',port:587,security:'STARTTLS',user:'sender@example.test',password:'fixture-only-password',fromEmail:'sender@example.test',fromName:'Fixture',version:0})).status,201);
  const row=(await pool.query('SELECT id,data FROM jingo_products')).rows[0],product={...row.data,demo:false};await pool.query('UPDATE jingo_products SET data=$1 WHERE id=$2',[JSON.stringify(product),row.id]);
  const make=async(quantity:number)=>{const result=await call('/orders',{requestId:randomUUID(),accessKey:randomBytes(32).toString('hex'),productId:product.id,variantId:product.variants[0].id,date:'2099-06-01',quantities:{ADULT:quantity},expectedTotal:quantity*product.variants[0].prices.ADULT,contact:{name:'Batch fixture',phone:'0901234567',email:'batch-guest@example.test',note:''},accepted:true},false);assert.equal(result.status,201);const order=await result.json();return(await pool.query('SELECT id FROM jingo_orders WHERE code=$1',[order.code])).rows[0].id as string;};
  const act=(id:string,body:unknown,admin=true)=>call('/admin/orders/'+id+'/actions',body,admin),ticket=(code:string)=>({code,kind:'SUPPLIER_CODE',covers:1,note:'Fixture instruction'}),batch=(version:number,codes:string[])=>({requestId:randomUUID(),version,action:'DELIVER',note:'Fixture batch delivery',tickets:codes.map(ticket)});
  const id=await make(4),other=await make(2);
  assert.equal((await act(id,batch(1,['A','B']))).status,409,'unpaid cannot deliver');
  for(const orderId of[id,other])assert.equal((await act(orderId,{requestId:randomUUID(),version:1,action:'PAY',amount:(orderId===id?4:2)*product.variants[0].prices.ADULT,reference:randomUUID(),note:'Fixture payment'})).status,201);
  assert.equal((await act(id,batch(2,['A','A']))).status,400);
  assert.equal((await pool.query('SELECT id FROM jingo_order_tickets')).rowCount,0);
  const delivery=batch(2,[' A ','B']);assert.equal((await act(id,delivery,false)).status,401);
  let response=await act(id,delivery);assert.equal(response.status,201);let detail=await response.json();assert.equal(detail.fulfillmentStatus,'PARTIAL');assert.equal(detail.deliveredGuests,2);assert.equal(detail.tickets[0].code,'A');
  response=await act(id,delivery);assert.equal(response.status,201);assert.equal((await response.json()).version,3);
  assert.equal((await pool.query("SELECT id FROM jingo_mail_outbox WHERE order_id=$1 AND event='DELIVER'",[id])).rowCount,1,'one mail event per committed batch');
  assert.equal((await act(other,batch(2,['C','A']))).status,409,'reused code in later row rejects whole batch');
  assert.equal((await pool.query('SELECT id FROM jingo_order_tickets WHERE order_id=$1',[other])).rowCount,0);assert.equal((await(await call('/admin/orders/'+other)).json()).version,2);
  assert.equal((await act(id,batch(3,['C','D','E']))).status,400,'cannot cover more than remaining');
  response=await act(id,batch(3,['C','D']));assert.equal(response.status,201);detail=await response.json();assert.equal(detail.fulfillmentStatus,'DELIVERED');assert.equal(detail.deliveredGuests,4);assert.equal(detail.tickets.length,4);
  assert.equal((await pool.query("SELECT id FROM jingo_mail_outbox WHERE order_id=$1 AND event='DELIVER'",[id])).rowCount,2);
  assert.equal((await act(id,{...delivery,tickets:[ticket('CHANGED')]})).status,409);
 }finally{await app.close();await rm(media,{recursive:true,force:true});}
});
