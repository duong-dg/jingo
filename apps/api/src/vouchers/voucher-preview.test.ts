import{voucherVisitApplies,voucherApplies}from'./voucher-scope';
import{test}from'node:test';import assert from'node:assert/strict';import{voucherPreview}from'../../../web/lib/voucher-preview';
test('voucher illustration handles percentage floor, caps, minimum order and cannot yield negative payable',()=>{
 assert.deepEqual(voucherPreview(999,'PERCENT',10,0,null),{discount:99,total:900,eligible:true});assert.equal(voucherPreview(1000000,'PERCENT',20,0,50000).discount,50000);assert.equal(voucherPreview(100000,'FIXED',200000,0,null).total,0);assert.equal(voucherPreview(0,'PERCENT',100,0,null).discount,0);assert.equal(voucherPreview(999,'PERCENT',10,1000,null).eligible,false);assert.equal(voucherPreview(1000,'PERCENT',10,1000,null).eligible,true);
 for(const result of[voucherPreview(1000,'PERCENT',101,0,null),voucherPreview(1000,'PERCENT',-1,0,null),voucherPreview(1000,'PERCENT',10,0,-100),voucherPreview(NaN,'FIXED',100,0,null),voucherPreview(-100,'FIXED',10,0,null)]){assert.equal(result.eligible,false);assert.ok(result.total>=0);assert.equal(result.discount,0);}
});

test('voucher scope preserves legacy ALL, matches product and exact variant pairs, and fails closed',()=>{assert.equal(voucherApplies({}),true);assert.equal(voucherApplies({scope:'ALL',targets:[]},{productId:'a',variantId:'eco'}),true);assert.equal(voucherApplies({scope:'PRODUCTS',targets:[{productId:'a'}]},{productId:'a',variantId:'new-package'}),true);assert.equal(voucherApplies({scope:'VARIANTS',targets:[{productId:'a',variantId:'eco'},{productId:'b',variantId:'vip'}]},{productId:'a',variantId:'vip'}),false);assert.equal(voucherApplies({scope:'VARIANTS',targets:[{productId:'a',variantId:'eco'}]},{productId:'a',variantId:'eco'}),true);for(const scope of ['PRODUCTS','VARIANTS','UNKNOWN']){assert.equal(voucherApplies({scope,targets:[]},{productId:'a',variantId:'eco'}),false);assert.equal(voucherApplies({scope,targets:[{productId:'a'}]}),false);}});

test('voucher visit dates use inclusive calendar boundaries and intersect weekday conditions',()=>{
 assert.equal(voucherVisitApplies({}),true);
 const rule={visitFrom:'2099-06-01',visitTo:'2099-06-07',visitWeekdays:[1,2,3,4,5]};
 assert.equal(voucherVisitApplies(rule,'2099-06-01'),true);assert.equal(voucherVisitApplies(rule,'2099-06-05'),true);
 for(const d of [undefined,'2099-05-31','2099-06-06','2099-06-07','2099-06-08','2099-02-30','invalid'])assert.equal(voucherVisitApplies(rule,d),false);
 assert.equal(voucherVisitApplies({visitFrom:'2099-06-01'},'2099-06-01'),true);assert.equal(voucherVisitApplies({visitTo:'2099-06-01'},'2099-06-01'),true);
 assert.equal(voucherVisitApplies({visitWeekdays:[0]},'2099-06-07'),true);assert.equal(voucherVisitApplies({visitWeekdays:[]},'2099-06-06'),true);
});
