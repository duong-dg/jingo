import{test}from'node:test';import assert from'node:assert/strict';import{supplierDetailsFromText}from'./ticket-source';
test('supplier metadata accepts Vietnamese and English labels without consuming the bilingual value',()=>{
 assert.deepEqual(supplierDetailsFromText('Hạn sử dụng\nExpiration date\n19/04/2027\nTên gói dịch vụ / Service Package: ECO CK BM\nThời gian / Time: PARK: 16:00 - 22:00\nSHOW: 20:00 - 21:00\nCode / Mã vé: 1142103247001-66-0095206\nĐại lý hợp tác / Cooperative agent: BM'),{expirationDate:'19/04/2027',servicePackage:'ECO CK BM',usageTime:'PARK: 16:00 - 22:00 / SHOW: 20:00 - 21:00',supplierCode:'1142103247001-66-0095206',agency:'BM'});
 assert.deepEqual(supplierDetailsFromText('Code: FIRST-123\nCode: SECOND-456\nService Package: ECO\nService Package: VIP'),{});
 assert.deepEqual(supplierDetailsFromText('Không có thông tin nhận diện'),{});
});
