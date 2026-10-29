import{createHash,createHmac,timingSafeEqual}from'node:crypto';
export const digest=(text:string)=>createHash('sha256').update(text).digest('hex');
export function equalSecret(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
export function vnpCanonical(params:Record<string,string>){return Object.keys(params).filter(k=>k!=='vnp_SecureHash'&&k!=='vnp_SecureHashType'&&params[k]!=='').sort().map(k=>encodeURIComponent(k)+'='+encodeURIComponent(params[k]).replace(/%20/g,'+')).join('&');}
export function vnpSign(params:Record<string,string>,secret:string){return createHmac('sha512',secret).update(vnpCanonical(params),'utf8').digest('hex');}
export function vnpVerify(params:Record<string,string>,secret:string){return /^[a-f0-9]{128}$/i.test(params.vnp_SecureHash||'')&&equalSecret(vnpSign(params,secret),params.vnp_SecureHash.toLowerCase());}
export function vnTime(date:Date){return new Date(date.getTime()+7*3600000).toISOString().replace(/[-:TZ.]/g,'').slice(0,14);}

export const sepaySignedFields=['order_amount','merchant','currency','operation','order_description','order_invoice_number','customer_id','payment_method','success_url','error_url','cancel_url'] as const;
export function sepaySign(fields:Record<string,string>,secret:string){return createHmac('sha256',secret).update(sepaySignedFields.filter(k=>fields[k]!==undefined).map(k=>k+'='+fields[k]).join(','),'utf8').digest('base64');}
export function sepayAmount(value:string){if(!/^[0-9]{1,11}(?:\.0{1,2})?$/.test(value))throw new Error('Invalid VND amount');const amount=Number(value);if(!Number.isSafeInteger(amount)||amount<=0||amount>15000000000)throw new Error('Invalid VND amount');return amount;}
