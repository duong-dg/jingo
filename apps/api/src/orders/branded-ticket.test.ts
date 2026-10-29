import{test}from'node:test';import assert from'node:assert/strict';import PDFDocument from'pdfkit';import QRCode from'qrcode';import jsQR from'jsqr';import sharp from'sharp';import{brandedTicketPdf}from'./branded-ticket';import{supplierQrImage,supplierQrImages}from'./supplier-qr';
async function decoded(image:Buffer){const{data,info}=await sharp(image).ensureAlpha().raw().toBuffer({resolveWithObject:true});return jsQR(new Uint8ClampedArray(data),info.width,info.height)?.data;}
test('JinGo ticket PDF preserves exact original QR payload, page selection and readable output without replacing it with the printed code',async()=>{
 const values=['SUPPLIER:123/ABC?token=one','https://supplier.example.test/ticket/SECOND?token=secret'],images=await Promise.all(values.map(text=>QRCode.toBuffer(text,{width:500,margin:4})));
 const source=await new Promise<Buffer>(resolve=>{const chunks:Buffer[]=[];const doc=new PDFDocument({size:'A5'});doc.on('data',c=>chunks.push(c));doc.on('end',()=>resolve(Buffer.concat(chunks)));images.forEach((image,i)=>{if(i)doc.addPage();doc.image(image,70,150,{width:280});});doc.end();});
 for(let page=1;page<=2;page++)assert.equal(await decoded(await supplierQrImage(source,page)),values[page-1]);await assert.rejects(()=>supplierQrImage(source,3),/trang/);
 const qr=await supplierQrImage(source,2),input={code:'PRINTED-CODE-DIFFERS-FROM-QR',product:'Ký ức Hội An',variant:'ECO người lớn',date:'2027-06-01',covers:1,note:'Không có giá vốn trong vé',image:qr};const pdf=await brandedTicketPdf(input);assert.equal(await decoded(await supplierQrImage(pdf)),values[1]);assert.deepEqual(await brandedTicketPdf(input),pdf,'retrying the same ticket produces identical PDF bytes');await assert.rejects(()=>supplierQrImage(Buffer.from('invalid input')),/Input|Chọn|unsupported/i);
});

test('batch image discovers adjacent QR and removes duplicated payloads',async()=>{
 const a=await QRCode.toBuffer('IMAGE-SUPPLIER-A',{width:350,margin:4}),b=await QRCode.toBuffer('IMAGE-SUPPLIER-B',{width:350,margin:4});
 const image=await sharp({create:{width:800,height:450,channels:3,background:'#fff'}}).composite([{input:a,left:20,top:40},{input:b,left:420,top:40}]).png().toBuffer();
 const found=await supplierQrImages(image);assert.equal(found.length,2);assert.deepEqual((await Promise.all(found.map(q=>decoded(q.image)))).sort(),['IMAGE-SUPPLIER-A','IMAGE-SUPPLIER-B']);
 const duplicate=await sharp({create:{width:800,height:450,channels:3,background:'#fff'}}).composite([{input:a,left:20,top:40},{input:a,left:420,top:40}]).png().toBuffer();assert.equal((await supplierQrImages(duplicate)).length,1);
});
