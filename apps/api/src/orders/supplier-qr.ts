import{readFile}from'node:fs/promises';import{prepareZXingModule,readBarcodes}from'zxing-wasm/reader';import{supplierDetailsFromText,pdfTicketText,type SupplierTicketDetails}from'./ticket-source';
import sharp from'sharp';import jsQR from'jsqr';
export async function supplierQrImage(file:Buffer,pageNumber=1,qrNumber=1){
 let png:Buffer;
 if(file.subarray(0,5).toString()==='%PDF-'){
  const canvasModule=await import('@napi-rs/canvas');for(const name of ['DOMMatrix','ImageData','Path2D'])if(!(globalThis as any)[name])(globalThis as any)[name]=(canvasModule as any)[name];
  const pdfjs=await (new Function('return import("pdfjs-dist/legacy/build/pdf.mjs")')() as Promise<any>);
  const task=pdfjs.getDocument({data:new Uint8Array(file),isEvalSupported:false,useSystemFonts:true,disableFontFace:true});const pdf=await task.promise;
  try{if(pdf.numPages>50||pageNumber>pdf.numPages)throw new Error('Chọn đúng trang PDF (tối đa 50 trang).');const page=await pdf.getPage(pageNumber),base=page.getViewport({scale:1});const scale=Math.min(3,2000/Math.max(base.width,base.height));const viewport=page.getViewport({scale}),canvas=canvasModule.createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));await page.render({canvasContext:canvas.getContext('2d'),canvas,viewport}).promise;png=canvas.toBuffer('image/png');}finally{await task.destroy();}
 }else{const image=sharp(file,{limitInputPixels:16000000,animated:false});if(!['png','jpeg','webp'].includes((await image.metadata()).format||''))throw new Error('Chọn PDF hoặc ảnh PNG/JPG/WebP chứa QR gốc.');png=await image.rotate().resize({width:2000,height:2000,fit:'inside',withoutEnlargement:true}).png().toBuffer();}
 const {data,info}=await sharp(png).ensureAlpha().raw().toBuffer({resolveWithObject:true}),pixels=new Uint8ClampedArray(data),w=info.width,h=info.height;
 for(let index=1;index<=qrNumber;index++){
  const code=jsQR(pixels,w,h,{inversionAttempts:'attemptBoth'});if(!code)throw new Error('Không đọc được QR đã chọn. Kiểm tra trang/số thứ tự QR hoặc tải bản rõ nét hơn.');
  const points=[code.location.topLeftCorner,code.location.topRightCorner,code.location.bottomLeftCorner,code.location.bottomRightCorner],xs=points.map(p=>p.x),ys=points.map(p=>p.y);const margin=Math.ceil(Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys))/(17+4*code.version)*4.5);const left=Math.max(0,Math.floor(Math.min(...xs))-margin),top=Math.max(0,Math.floor(Math.min(...ys))-margin),right=Math.min(w,Math.ceil(Math.max(...xs))+margin),bottom=Math.min(h,Math.ceil(Math.max(...ys))+margin);
  if(index===qrNumber){const x=Math.max(0,Math.floor(Math.min(...xs))),y=Math.max(0,Math.floor(Math.min(...ys))),x2=Math.min(w,Math.ceil(Math.max(...xs))),y2=Math.min(h,Math.ceil(Math.max(...ys)));return sharp(png).extract({left:x,top:y,width:x2-x,height:y2-y}).extend({top:margin,bottom:margin,left:margin,right:margin,background:'#ffffff'}).png().toBuffer();}
  for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){const pos=(y*w+x)*4;pixels[pos]=pixels[pos+1]=pixels[pos+2]=pixels[pos+3]=255;}
 }
 throw new Error('Không tìm thấy QR.');
}

export async function supplierQrImages(file:Buffer){
 const found:{image:Buffer;identity:string;details?:SupplierTicketDetails}[]=[],seen=new Set<string>();
 // Load the bundled WASM locally: ticket images are never sent to a third party.
 await readyReader();
 async function scan(png:Buffer,details?:SupplierTicketDetails){
  const meta=await sharp(png).metadata(),w=meta.width!,h=meta.height!;
  const codes=(await readBarcodes(new Uint8Array(png),{formats:['QRCode'],tryHarder:true,tryRotate:true,tryInvert:true,maxNumberOfSymbols:151,textMode:'Plain'})).filter(c=>c.isValid).sort((a,b)=>a.position.topLeft.y-b.position.topLeft.y||a.position.topLeft.x-b.position.topLeft.x);
  for(const code of codes){const identity=Buffer.from(code.bytes).toString('hex');if(seen.has(identity))continue;if(found.length>=150)throw new Error('Mỗi lần tối đa 150 QR.');
   const points=Object.values(code.position),xs=points.map(p=>p.x),ys=points.map(p=>p.y),left=Math.max(0,Math.floor(Math.min(...xs))),top=Math.max(0,Math.floor(Math.min(...ys))),right=Math.min(w,Math.ceil(Math.max(...xs))),bottom=Math.min(h,Math.ceil(Math.max(...ys))),margin=Math.max(12,Math.ceil(Math.max(right-left,bottom-top)*.14));if(right<=left||bottom<=top)continue;
   seen.add(identity);const safeDetails={...details};if(codes.length>1)delete safeDetails.supplierCode;
   found.push({identity,details:safeDetails,image:await sharp(png).extract({left,top,width:right-left,height:bottom-top}).extend({top:margin,bottom:margin,left:margin,right:margin,background:'#fff'}).png().toBuffer()});
  }
 }
 if(file.subarray(0,5).toString()==='%PDF-'){
  const canvasModule=await import('@napi-rs/canvas');for(const name of ['DOMMatrix','ImageData','Path2D'])if(!(globalThis as any)[name])(globalThis as any)[name]=(canvasModule as any)[name];
  const pdfjs=await(new Function('return import("pdfjs-dist/legacy/build/pdf.mjs")')() as Promise<any>),task=pdfjs.getDocument({data:new Uint8Array(file),isEvalSupported:false,useSystemFonts:true,disableFontFace:true});
  try{const pdf=await task.promise;if(pdf.numPages>50)throw new Error('PDF tối đa 50 trang.');for(let n=1;n<=pdf.numPages;n++){const page=await pdf.getPage(n),base=page.getViewport({scale:1}),viewport=page.getViewport({scale:Math.min(3,2000/Math.max(base.width,base.height))}),canvas=canvasModule.createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));await page.render({canvasContext:canvas.getContext('2d'),canvas,viewport}).promise;const text=pdfTicketText((await page.getTextContent()).items);await scan(canvas.toBuffer('image/png'),supplierDetailsFromText(text));page.cleanup();}}finally{await task.destroy();}
 }else{
  const image=sharp(file,{limitInputPixels:16000000,animated:false});if(!['png','jpeg','webp'].includes((await image.metadata()).format||''))throw new Error('Chọn PDF hoặc ảnh PNG/JPG/WebP.');await scan(await image.rotate().resize({width:2000,height:2000,fit:'inside',withoutEnlargement:true}).png().toBuffer());
 }
 if(!found.length)throw new Error('Không đọc được QR trong file. Tải vé gốc rõ nét hơn.');return found;
}

let readerReady:Promise<unknown>|undefined;
function readyReader(){return readerReady||=(readFile(require.resolve('zxing-wasm/reader/zxing_reader.wasm')).then(wasmBinary=>prepareZXingModule({overrides:{wasmBinary:new Uint8Array(wasmBinary).buffer},fireImmediately:true})));}
export async function supplierTicketDetails(file:Buffer,pageNumber=1){if(file.subarray(0,5).toString()!=='%PDF-')return{};const canvasModule=await import('@napi-rs/canvas');for(const name of ['DOMMatrix','ImageData','Path2D'])if(!(globalThis as any)[name])(globalThis as any)[name]=(canvasModule as any)[name];const pdfjs=await(new Function('return import("pdfjs-dist/legacy/build/pdf.mjs")')()as Promise<any>),task=pdfjs.getDocument({data:new Uint8Array(file),isEvalSupported:false,useSystemFonts:true,disableFontFace:true});try{const pdf=await task.promise;if(pageNumber>pdf.numPages||pdf.numPages>50)throw new Error('Chọn đúng trang PDF (tối đa 50 trang).');const page=await pdf.getPage(pageNumber);return supplierDetailsFromText(pdfTicketText((await page.getTextContent()).items));}finally{await task.destroy();}}
