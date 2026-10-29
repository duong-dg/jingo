import{test}from'node:test';import assert from'node:assert/strict';import{destinationOverview}from'./destinations';
test('destination cards count published experiences throughout each branch without demo or unassigned products',()=>{
 const node=(id:string,parentId:string|null)=>({id,parentId,name:id,slug:id,sortOrder:0});const nodes=[node('region',null),node('city','region'),node('park','city'),node('other',null)],overview=destinationOverview(nodes,[{destinationId:'region'},{destinationId:'park'},{destinationId:'city',demo:true},{destinationId:'other'},{}]);
 assert.deepEqual(overview.get('region'),{experiences:2,children:1});assert.deepEqual(overview.get('city'),{experiences:1,children:1});assert.deepEqual(overview.get('park'),{experiences:1,children:0});assert.deepEqual(overview.get('other'),{experiences:1,children:0});
});
