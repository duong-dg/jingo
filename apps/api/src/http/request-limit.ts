import{HttpException}from'@nestjs/common';
import type{Request,Response}from'express';
import{clientAddress}from'./client-address';

export const requestBudgets={create:30,lookup:240,checkout:30,capture:60,oauth:100}as const;
type Counter={count:number;until:number};

/** Bounded, per-process limiter for the current single API deployment. */
export class RequestLimit{
 private counters=new Map<string,Counter>();private nextSweep=0;
 constructor(private readonly capacity=10000,private readonly clock=Date.now){}
 check(req:Request,res:Response,bucket:string,max:number,windowMs=60000){
  const now=this.clock();
  if(now>=this.nextSweep){for(const[key,counter]of this.counters)if(counter.until<=now)this.counters.delete(key);this.nextSweep=now+Math.min(windowMs,60000);}
  const key=bucket+':'+clientAddress(req).ip;let counter=this.counters.get(key);
  if(counter&&counter.until<=now){this.counters.delete(key);counter=undefined;}
  if(!counter){if(this.counters.size>=this.capacity)return this.reject(res,Math.max(1,Math.ceil((this.nextSweep-now)/1000)));counter={count:0,until:now+windowMs};this.counters.set(key,counter);}
  const seconds=Math.max(1,Math.ceil((counter.until-now)/1000));
  res.setHeader('Cache-Control','no-store');res.setHeader('X-RateLimit-Limit',String(max));res.setHeader('X-RateLimit-Remaining',String(Math.max(0,max-counter.count-1)));res.setHeader('X-RateLimit-Reset',String(Math.ceil(counter.until/1000)));
  if(counter.count>=max)return this.reject(res,seconds);counter.count++;
 }
 private reject(res:Response,seconds:number):never{
  res.setHeader('Cache-Control','no-store');res.setHeader('Retry-After',String(seconds));
  throw new HttpException({statusCode:429,message:'Quá nhiều yêu cầu. Vui lòng thử lại sau '+seconds+' giây.',retryAfter:seconds},429);
 }
}
