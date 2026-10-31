import{timingSafeEqual}from'node:crypto';
import{isIP}from'node:net';
import type{Request}from'express';

function normalizeIp(value:string|undefined):string|null{
 if(!value||value.length>64||value.includes('%')||!isIP(value))return null;
 if(isIP(value)===4)return value;
 try{
  const normalized=new URL('http://['+value+']/').hostname.slice(1,-1).toLowerCase();
  const mapped=normalized.match(/^::ffff:([a-f0-9]{1,4}):([a-f0-9]{1,4})$/);
  if(mapped){const high=parseInt(mapped[1],16),low=parseInt(mapped[2],16);return[high>>8,high&255,low>>8,low&255].join('.');}
  return normalized;
 }catch{return null;}
}

/** NPM overwrites both headers. X-Forwarded-For / X-Real-IP alone never grant trust. */
export function clientAddress(req:Pick<Request,'headers'|'socket'>){
 const expected=process.env.ADMIN_PROXY_SECRET||'',supplied=req.headers['x-jingo-edge-secret'],candidate=req.headers['x-jingo-client-ip'];
 const validSecret=typeof supplied==='string'&&supplied.length<=1024&&expected.length>=32&&Buffer.byteLength(supplied)===Buffer.byteLength(expected)&&timingSafeEqual(Buffer.from(supplied),Buffer.from(expected));
 if(validSecret&&typeof candidate==='string'){
  const ip=normalizeIp(candidate);if(ip)return{ip,ipSource:'VERIFIED_PROXY' as const};
 }
 return{ip:normalizeIp(req.socket.remoteAddress)||'unknown',ipSource:'SOCKET' as const};
}
