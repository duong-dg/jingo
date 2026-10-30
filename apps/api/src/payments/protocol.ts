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

// Verify the exact bytes SePay signed. Never reconstruct a parsed JSON body.
export function verifySepayWebhook(raw:Buffer|undefined,timestamp:string,signature:string,secret:string,now=Date.now()){
 if(!raw||!raw.length||raw.length>1024*1024||!/^\d{10}$/.test(timestamp)||!/^sha256=[a-f0-9]{64}$/.test(signature))return false;
 if(Math.abs(Math.floor(now/1000)-Number(timestamp))>300)return false;
 const expected='sha256='+createHmac('sha256',secret).update(timestamp+'.').update(raw).digest('hex');
 return equalSecret(expected,signature);
}
export const sepayWebhookCredential=(config:{sepayAuth?:string;sepayOauthEncrypted?:string;sepayHmacEncrypted?:string;sepayEncrypted?:string})=>config.sepayAuth==='OAUTH2'?config.sepayOauthEncrypted:config.sepayAuth==='HMAC_SHA256'?config.sepayHmacEncrypted:config.sepayEncrypted;

// Purpose-bound, short-lived tokens. Rotation of the encrypted client secret revokes all tokens.
export function issueSepayToken(secret:string,clientId:string,mode:string,now=Date.now()){
 const payload=Buffer.from(JSON.stringify({aud:'sepay-webhook',sub:clientId,mode,iat:Math.floor(now/1000),exp:Math.floor(now/1000)+3600})).toString('base64url');
 return payload+'.'+createHmac('sha256',secret).update('jingo-sepay-oauth:'+payload).digest('base64url');
}
export function verifySepayToken(token:string,secret:string,clientId:string,mode:string,now=Date.now()){
 if(token.length>2048)return false;
 const parts=token.split('.');if(parts.length!==2||!parts.every(p=>/^[A-Za-z0-9_-]+$/.test(p)))return false;
 if(!equalSecret(parts[1],createHmac('sha256',secret).update('jingo-sepay-oauth:'+parts[0]).digest('base64url')))return false;
 try{const p=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8')),seconds=Math.floor(now/1000);return p.aud==='sepay-webhook'&&p.sub===clientId&&p.mode===mode&&Number.isInteger(p.iat)&&Number.isInteger(p.exp)&&p.iat<=seconds&&p.exp>seconds&&p.exp-p.iat===3600;}catch{return false;}
}
