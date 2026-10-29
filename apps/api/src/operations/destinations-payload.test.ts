import{test}from'node:test';import assert from'node:assert/strict';
import{destinationPayload,destinationRows}from'../../../web/lib/destinations';
test('editing an existing destination tree row saves English name without derived tree fields',()=>{
 const parent={cover:{id:'cover-fixture',alt:'Ảnh điểm đến'},id:'parent',name:'Đà Nẵng',englishName:'Da Nang',slug:'da-nang',parentId:null,sortOrder:1,status:'ACTIVE' as const,description:'Mô tả',version:3};
 const child={...parent,id:'child',name:'Bà Nà',englishName:'Ba Na',slug:'ba-na',parentId:'parent',version:7};
 const rows=destinationRows([parent,child]);
 for(const row of rows){assert.ok('depth'in row&&'path'in row);const draft=destinationPayload(row);const payload=destinationPayload({...draft,englishName:'Updated English name'});assert.equal(payload.englishName,'Updated English name');assert.equal(payload.parentId,row.parentId);assert.equal(payload.version,row.version);assert.equal(payload.slug,row.slug);assert.deepEqual(payload.cover,parent.cover);assert.deepEqual(Object.keys(payload).sort(),['coordinates','cover','id','name','englishName','englishSlug','englishDescription','slug','parentId','sortOrder','status','description','version'].sort());assert.equal('depth'in payload,false);assert.equal('path'in payload,false);}
 assert.equal(destinationPayload({...parent,version:0}).version,0);
});
