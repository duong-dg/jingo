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
 const found:{image:Buffer;identity:string}[]=[],seen=new Set<string>();
 async function scan(png:Buffer){
  const{data,info}=await sharp(png).ensureAlpha().raw().toBuffer({resolveWithObject:true}),pixels=new Uint8ClampedArray(data),w=info.width,h=info.height;
  function find(){
   const whole=jsQR(pixels,w,h,{inversionAttempts:'attemptBoth'});if(whole)return whole;
   // Multiple nearby QR can confuse a whole-page detector. Search overlapping tiles too.
   for(const divisions of [2,3])for(const[tw,th]of [[Math.ceil(w/divisions),h],[w,Math.ceil(h/divisions)],[Math.ceil(w/divisions),Math.ceil(h/divisions)]]){const dx=Math.max(1,Math.floor(tw*.75)),dy=Math.max(1,Math.floor(th*.75));
    for(let top=0;top<h;top+=dy)for(let left=0;left<w;left+=dx){const width=Math.min(tw,w-left),height=Math.min(th,h-top);if(width<80||height<80)continue;const tile=new Uint8ClampedArray(width*height*4);for(let y=0;y<height;y++)tile.set(pixels.subarray(((top+y)*w+left)*4,((top+y)*w+left+width)*4),y*width*4);const code=jsQR(tile,width,height,{inversionAttempts:'attemptBoth'});if(code){for(const point of Object.values(code.location) as {x:number;y:number}[]){point.x+=left;point.y+=top;}return code;}}
   }return null;
  }
  for(let i=0;i<=150;i++){
   const code=find();if(!code)return;
   const identity=Buffer.from(code.binaryData).toString('hex');
   const points=[code.location.topLeftCorner,code.location.topRightCorner,code.location.bottomLeftCorner,code.location.bottomRightCorner],xs=points.map(p=>p.x),ys=points.map(p=>p.y),left=Math.max(0,Math.floor(Math.min(...xs))),top=Math.max(0,Math.floor(Math.min(...ys))),right=Math.min(w,Math.ceil(Math.max(...xs))),bottom=Math.min(h,Math.ceil(Math.max(...ys))),margin=Math.ceil(Math.max(right-left,bottom-top)/(17+4*code.version)*4.5);
   if(!seen.has(identity)){if(found.length>=150)throw new Error('Mỗi lần tối đa 150 QR.');seen.add(identity);found.push({identity,image:await sharp(png).extract({left,top,width:right-left,height:bottom-top}).extend({top:margin,bottom:margin,left:margin,right:margin,background:'#fff'}).png().toBuffer()});}
   for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){const p=(y*w+x)*4;pixels[p]=pixels[p+1]=pixels[p+2]=pixels[p+3]=255;}
  }
  throw new Error('Có quá nhiều QR trên một trang.');
 }
 if(file.subarray(0,5).toString()==='%PDF-'){
  const canvasModule=await import('@napi-rs/canvas');for(const name of ['DOMMatrix','ImageData','Path2D'])if(!(globalThis as any)[name])(globalThis as any)[name]=(canvasModule as any)[name];
  const pdfjs=await(new Function('return import("pdfjs-dist/legacy/build/pdf.mjs")')() as Promise<any>),task=pdfjs.getDocument({data:new Uint8Array(file),isEvalSupported:false,useSystemFonts:true,disableFontFace:true});
  try{const pdf=await task.promise;if(pdf.numPages>50)throw new Error('PDF tối đa 50 trang.');for(let n=1;n<=pdf.numPages;n++){const page=await pdf.getPage(n),base=page.getViewport({scale:1}),viewport=page.getViewport({scale:Math.min(3,2000/Math.max(base.width,base.height))}),canvas=canvasModule.createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));await page.render({canvasContext:canvas.getContext('2d'),canvas,viewport}).promise;await scan(canvas.toBuffer('image/png'));page.cleanup();}}finally{await task.destroy();}
 }else{
  const image=sharp(file,{limitInputPixels:16000000,animated:false});if(!['png','jpeg','webp'].includes((await image.metadata()).format||''))throw new Error('Chọn PDF hoặc ảnh PNG/JPG/WebP.');await scan(await image.rotate().resize({width:2000,height:2000,fit:'inside',withoutEnlargement:true}).png().toBuffer());
 }
 if(!found.length)throw new Error('Không đọc được QR trong file. Tải vé gốc rõ nét hơn.');return found;
}
