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


test('30-person batch retains supplier details, exact QR bytes and keeps the main event loop responsive',async()=>{
 const{processTicketBatch}=await import('./ticket-processing');const chunks:Buffer[]=[],doc=new PDFDocument({size:'A5',margin:26});
 const source=new Promise<Buffer>(resolve=>{doc.on('data',c=>chunks.push(c));doc.on('end',()=>resolve(Buffer.concat(chunks)));});
 const payloads=Array.from({length:30},(_,i)=>'SUPPLIER-ĐOÀN-'+String(i).padStart(3,'0'));
 for(let i=0;i<payloads.length;i++){if(i)doc.addPage();doc.image(await QRCode.toBuffer(payloads[i],{width:400,margin:4}),90,70,{width:240});doc.fontSize(10).text('Expiration date: 19/04/2027',26,330).text('Service Package: ECO CK BM').text('Time: PARK: 16:00 - 22:00 / SHOW: 20:00 - 21:00').text('Code: SUPPLIER-'+i).text('Cooperative agent: BM');}doc.end();
 let ticks=0;const interval=setInterval(()=>ticks++,20);let result:Awaited<ReturnType<typeof processTicketBatch>>;try{result=await processTicketBatch(await source,{product:'Ký ức Hội An',variant:'ECO Người lớn',date:'2027-04-19'});}finally{clearInterval(interval);}
 assert(ticks>10,'main thread remains responsive');assert.equal(result!.qrs.length,30);assert.equal(result!.qrs[0].details?.agency,'BM');assert.equal(result!.qrs[0].details?.servicePackage,'ECO CK BM');assert.equal(result!.qrs[0].details?.expirationDate,'19/04/2027');
 const printed=await supplierQrImages(result!.data);assert.equal(printed.length,30);assert.deepEqual(printed.map(q=>q.identity).sort(),payloads.map(p=>Buffer.from(p).toString('hex')).sort());assert.equal(printed[29].details?.supplierCode,'SUPPLIER-29');const pdfjs=await(new Function('return import("pdfjs-dist/legacy/build/pdf.mjs")')()as Promise<any>),task=pdfjs.getDocument({data:new Uint8Array(result!.data),isEvalSupported:false});try{assert.equal((await task.promise).numPages,30,'exactly one printable page per QR');}finally{await task.destroy();}
});
