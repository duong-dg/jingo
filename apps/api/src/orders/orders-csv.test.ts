import{test}from'node:test';import assert from'node:assert/strict';import{csvCell,ordersCsv}from'./orders-csv';
test('CSV escapes delimiters, quotes and multiline content and neutralizes spreadsheet formulas',()=>{
 assert.equal(csvCell('A,"B"\nC'),'"A,""B""\nC"');assert.equal(csvCell(null),'""');
 for(const value of['=1+1','+SUM(A1)','-2+3','@formula','  =HYPERLINK("bad")','\t=cmd','\r=cmd','\ntext','\uFEFF=1'])assert.ok(csvCell(value).startsWith('"\''),JSON.stringify(value));
 assert.equal(csvCell('Du lịch Hội An'),'"Du lịch Hội An"');assert.equal(csvCell('A\0B'),'"AB"');
});
test('order CSV has Vietnamese BOM headers, Vietnam timestamps, guest counts, phone text and booked values only',()=>{
 const row={code:'JGTEST',created_at:'2026-10-26T17:00:00Z',contact:{name:' =1+1',phone:'+84901234567',email:'guest@example.test',accessKey:'DO-NOT-EXPORT'},snapshot:{productName:'Vé "VIP", Đà Nẵng',variantName:'Eco',date:'2099-06-01',total:0,policy:'PRIVATE_POLICY',timeSlot:{start:'20:00'},lines:[{customerType:'ADULT',quantity:2},{customerType:'CHILD',quantity:1},{customerType:'SENIOR',quantity:3}]},booking_status:'CONFIRMED',payment_status:'CREDIT',channel:'CTV'};
 const csv=ordersCsv([row],true);assert.equal(csv.charCodeAt(0),0xfeff);assert.ok(csv.startsWith('\uFEFF"Mã đơn","Ngày tạo (GMT+7)"'));assert.ok(csv.endsWith('\r\n'));assert.ok(csv.includes('"2026-10-27 00:00:00"'));assert.ok(csv.includes('"\'+84901234567"'));assert.ok(csv.includes('"\' =1+1"'));assert.ok(csv.includes('"Vé ""VIP"", Đà Nẵng"'));assert.ok(csv.includes('"20:00","2","1","3","6","0","Đã đặt vé","Công nợ CTV","Cộng tác viên","Có"'));assert.doesNotMatch(csv,/DO-NOT-EXPORT|PRIVATE_POLICY/);assert.equal(ordersCsv([]).split('\r\n').length,2,'empty export still includes headers');
});
