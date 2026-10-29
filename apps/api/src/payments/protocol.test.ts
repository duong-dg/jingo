import{test}from'node:test';import assert from'node:assert/strict';import{createHmac}from'node:crypto';import{vnpCanonical,vnpSign,vnpVerify,vnTime,equalSecret}from'./protocol';
test('VNPay sorts encoded fields, converts spaces to plus and checks SHA512 signatures without accepting changed data',()=>{const q={vnp_OrderInfo:'Thanh toan A&B',vnp_Amount:'1000000',vnp_TmnCode:'TEST'};assert.equal(vnpCanonical(q),'vnp_Amount=1000000&vnp_OrderInfo=Thanh+toan+A%26B&vnp_TmnCode=TEST');const signature=createHmac('sha512','fixture-secret').update('vnp_Amount=1000000&vnp_OrderInfo=Thanh+toan+A%26B&vnp_TmnCode=TEST').digest('hex');assert.equal(vnpSign(q,'fixture-secret'),signature);assert.equal(vnpVerify({...q,vnp_SecureHash:signature},'fixture-secret'),true);assert.equal(vnpVerify({...q,vnp_Amount:'100',vnp_SecureHash:signature},'fixture-secret'),false);assert.equal(vnpVerify({...q,vnp_SecureHash:'wrong'},'fixture-secret'),false);assert.equal(vnTime(new Date('2026-01-01T17:00:00Z')),'20260102000000');assert.equal(equalSecret('a','aa'),false);});

import{sepaySign,sepayAmount}from'./protocol';
test('SePay card signing is ordered, excludes unknown fields and validates whole VND amounts',()=>{const fields={merchant:'M1',order_amount:'100000',currency:'VND',operation:'PURCHASE',order_description:'Ticket',order_invoice_number:'INV1',payment_method:'CARD'};assert.equal(sepaySign(fields,'fixture-secret'),'6XUSPJoMdWZuXFW4wUO5Cw/NzzH4B7kCq/0qD0iMXEQ=');assert.equal(sepaySign({...fields,signature:'ignored',unexpected:'ignored'},'fixture-secret'),sepaySign(Object.fromEntries(Object.entries(fields).reverse()),'fixture-secret'));assert.notEqual(sepaySign(fields,'fixture-secret'),sepaySign({...fields,order_amount:'100001'},'fixture-secret'));for(const value of ['100000','100000.00','000100.0'])assert.equal(sepayAmount(value),Number(value));for(const value of ['0','-1','1.5','1e5','NaN','100,000','15000000001'])assert.throws(()=>sepayAmount(value));});

import{createHmac}from'node:crypto';
import{verifySepayWebhook}from'./protocol';
test('SePay HMAC authenticates raw bytes, timestamp window and strict signature without fallback',()=>{
 const secret='test-only-hmac-key-12345678901234567890',now=1793280000000,ts=String(now/1000),raw=Buffer.from('{ "content": "Thanh toán", "id": 1 }');
 const sign=(timestamp:string,bytes:Buffer)=>'sha256='+createHmac('sha256',secret).update(timestamp+'.').update(bytes).digest('hex');
 const sig=sign(ts,raw);assert.equal(verifySepayWebhook(raw,ts,sig,secret,now),true);
 assert.equal(verifySepayWebhook(Buffer.from(JSON.stringify(JSON.parse(raw.toString()))),ts,sig,secret,now),false);
 assert.equal(verifySepayWebhook(raw,ts,sig,secret+'wrong',now),false);
 assert.equal(verifySepayWebhook(undefined,ts,sig,secret,now),false);
 for(const offset of [-301,301]){const t=String(now/1000+offset);assert.equal(verifySepayWebhook(raw,t,sign(t,raw),secret,now),false);}
 for(const offset of [-300,300]){const t=String(now/1000+offset);assert.equal(verifySepayWebhook(raw,t,sign(t,raw),secret,now),true);}
 assert.equal(verifySepayWebhook(raw,ts,'sha256='+ '0'.repeat(64),secret,now),false);
 assert.equal(verifySepayWebhook(raw,'1e9',sig,secret,now),false);
});
