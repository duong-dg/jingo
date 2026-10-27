import{test}from'node:test';import assert from'node:assert/strict';
import{emptyDelivery,prepareDelivery}from'../../../web/lib/ticket-delivery';
test('bulk paste handles CRLF/blank lines, preserves supplier codes, detects duplicates and counts group seats',()=>{
 const draft={...emptyDelivery(),mode:'BULK' as const,codes:'  CODE-a\r\n\r\nhttps://tickets.example.test/A?token=1  \nCODE-c',covers:2};
 let result=prepareDelivery(draft,6);assert.equal(result.error,'');assert.equal(result.count,3);assert.equal(result.total,6);assert.deepEqual(result.tickets.map(t=>t.code),['CODE-a','https://tickets.example.test/A?token=1','CODE-c']);
 assert.match(prepareDelivery(draft,5).error,/vượt/);
 assert.match(prepareDelivery({...draft,codes:'A\n A\n'},6).error,/trùng/);
 assert.match(prepareDelivery({...draft,codes:'A\nB'},6,['B']).error,/đã giao/);
 assert.match(prepareDelivery({...draft,codes:' \n '},6).error,/ít nhất/);
 assert.match(prepareDelivery({...draft,covers:1.5},6).error,/số nguyên/);
 assert.match(prepareDelivery({...draft,codes:'x'.repeat(2001)},6).error,/2.000/);
 assert.match(prepareDelivery({...draft,codes:Array.from({length:151},(_,i)=>'C'+i).join('\n'),covers:1},200).error,/150/);
 result=prepareDelivery({...emptyDelivery(),codes:'PAYLOAD-LINE-1\nPAYLOAD-LINE-2',covers:6},6);assert.equal(result.error,'');assert.equal(result.count,1);assert.equal(result.tickets[0].code,'PAYLOAD-LINE-1\nPAYLOAD-LINE-2');
 assert.match(prepareDelivery({...draft,codes:Array.from({length:100},(_,i)=>'C'+i).join('\n'),covers:1,note:'界'.repeat(1000)},100).error,/quá dài/);
});
