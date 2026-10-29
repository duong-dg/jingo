import {BadRequestException,Body,ConflictException,Controller,Get,Injectable,Module,Param,Post,Query,Req,Res,UseGuards} from '@nestjs/common';
import type {Request,Response} from 'express';import {randomUUID} from 'node:crypto';import {z} from 'zod';
import {DatabaseService} from '../database/database.module';import {MailModule,MailService} from '../mail/mail.module';import {AdminGuard,AuthModule} from '../admin/auth.module';import {DestinationsModule,DestinationsService} from '../destinations/destinations.module';import {normalizeForecast,weatherAdvice} from './weather-rules';
const schema=z.object({version:z.number().int().min(0),enabled:z.boolean(),apiKey:z.string().trim().max(128).regex(/^[A-Za-z0-9_-]*$/).optional()}).strict();
export const WEATHER_LIMIT=90000;
type Config={enabled:boolean;version:number;encryptedKey?:string};
@Injectable()export class WeatherService{
 constructor(private readonly db:DatabaseService,private readonly mail:MailService,private readonly destinations:DestinationsService){}
 async config():Promise<Config>{const r=(await this.db.pool.query("SELECT data,version FROM jingo_settings WHERE id='weather'")).rows[0];return{enabled:false,...r?.data,version:r?.version||0};}
 async view(){const c=await this.config(),month=new Date().toISOString().slice(0,7),u=(await this.db.pool.query('SELECT calls,blocked FROM jingo_weather_usage WHERE month=$1',[month])).rows[0];return{enabled:c.enabled,version:c.version,keyConfigured:!!c.encryptedKey,month,calls:u?.calls||0,blocked:!!u?.blocked,limit:WEATHER_LIMIT};}
 async save(body:unknown,actor:string){const p=schema.safeParse(body);if(!p.success)throw new BadRequestException('Kiểm tra cấu hình thời tiết.');const {apiKey,...input}=p.data,old=await this.config();if(old.version!==input.version)throw new ConflictException('Cấu hình đã thay đổi. Tải lại trước khi lưu.');const encryptedKey=apiKey?await this.mail.encrypt(apiKey):old.encryptedKey;if(input.enabled&&!encryptedKey)throw new BadRequestException('Nhập API Key WeatherAPI trước khi bật.');const client=await this.db.pool.connect();try{await client.query('BEGIN');if(!input.version)await client.query("INSERT INTO jingo_settings(id,data)VALUES('weather',$1)",[JSON.stringify({enabled:input.enabled,encryptedKey})]);else{const r=await client.query("UPDATE jingo_settings SET data=$1,version=version+1 WHERE id='weather' AND version=$2",[JSON.stringify({enabled:input.enabled,encryptedKey}),input.version]);if(!r.rowCount)throw new ConflictException('Cấu hình đã thay đổi. Tải lại.');}await client.query('INSERT INTO jingo_audit(id,admin_id,action,entity_id)VALUES($1,$2,$3,$4)',[randomUUID(),actor,'weather.settings','weather']);await client.query('COMMIT');}catch(e){await client.query('ROLLBACK');if((e as {code?:string}).code==='23505')throw new ConflictException('Cấu hình đã được tạo. Tải lại.');throw e;}finally{client.release();}return this.view();}
 async get(id:string,lang='vi'){
 if(!z.uuid().safeParse(id).success)return null;
 const config=await this.config();if(!config.enabled||!config.encryptedKey)return null;
 const nodes=await this.destinations.list();let node=nodes.find(n=>n.id===id);const seen=new Set<string>();while(node&&!node.coordinates){if(seen.has(node.id))return null;seen.add(node.id);node=nodes.find(n=>n.id===node!.parentId);}if(!node?.coordinates)return null;
 const place=node,coords=place.coordinates!,key=coords.lat.toFixed(4)+','+coords.lon.toFixed(4),now=Date.now(),month=new Date(now).toISOString().slice(0,7);
 await this.db.pool.query('INSERT INTO jingo_weather_usage(month)VALUES($1)ON CONFLICT(month)DO NOTHING',[month]);
 const usage=(await this.db.pool.query('SELECT calls,blocked FROM jingo_weather_usage WHERE month=$1',[month])).rows[0];if(usage.blocked||usage.calls>=WEATHER_LIMIT)return null;
 const expose=(data:ReturnType<typeof normalizeForecast>|null,fetched:number)=>{if(!data||now-fetched>4*3600000||now-new Date(data.updatedAt).getTime()>4*3600000)return null;const today=new Date(now).toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}),days=data.days.filter(d=>d.date>=today);if(!days.length)return null;return{...data,place:lang==='en'?place.englishName||place.name:place.name,stale:now-fetched>=3600000,days:days.map(d=>({...d,advice:weatherAdvice(d).map(t=>({id:t.id,text:lang==='en'?t.en:t.vi}))}))};};
 await this.db.pool.query('INSERT INTO jingo_weather_cache(id)VALUES($1)ON CONFLICT(id)DO NOTHING',[key]);
 const row=(await this.db.pool.query('SELECT data,fetched_at,next_attempt FROM jingo_weather_cache WHERE id=$1',[key])).rows[0];
 if(Number(row.next_attempt)>now)return expose(row.data,Number(row.fetched_at));
 // The atomic lease shares refreshes across processes; a crashed request releases after 15 seconds.
 const lease=await this.db.pool.query('UPDATE jingo_weather_cache SET next_attempt=$1 WHERE id=$2 AND next_attempt<=$3 RETURNING id',[now+15000,key,now]);if(!lease.rowCount)return expose(row.data,Number(row.fetched_at));
 const allowed=await this.db.pool.query('UPDATE jingo_weather_usage SET calls=calls+1 WHERE month=$1 AND calls<$2 AND blocked=false RETURNING calls',[month,WEATHER_LIMIT]);if(!allowed.rowCount)return null;
 try{
 const url=new URL('https://api.weatherapi.com/v1/forecast.json');url.searchParams.set('key',await this.mail.decrypt(config.encryptedKey));url.searchParams.set('q',key);url.searchParams.set('days','3');url.searchParams.set('aqi','no');url.searchParams.set('alerts','no');
 const response=await fetch(url,{signal:AbortSignal.timeout(5000),redirect:'error'});const raw=await response.json();
 if(!response.ok){if(raw?.error?.code===2007){await this.db.pool.query('UPDATE jingo_weather_usage SET blocked=true WHERE month=$1',[month]);return null;}throw new Error('Weather unavailable');}
 const data=normalizeForecast(raw,now);await this.db.pool.query('UPDATE jingo_weather_cache SET data=$1,fetched_at=$2,next_attempt=$3 WHERE id=$4',[JSON.stringify(data),now,now+3600000,key]);return expose(data,now);
 }catch{ // Never expose upstream errors or the credential-bearing URL to visitors or logs.
 return expose(row.data,Number(row.fetched_at));
 }finally{await this.db.pool.query('UPDATE jingo_weather_cache SET next_attempt=$1 WHERE id=$2 AND next_attempt=$3',[now+3600000,key,now+15000]);}
 }
}
@Controller('weather')class PublicWeatherController{constructor(private readonly weather:WeatherService){}@Get(':id')async get(@Param('id')id:string,@Query('lang')lang:string,@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','no-store');return{data:await this.weather.get(id,lang)};}}
@Controller('admin/weather')@UseGuards(AdminGuard)class AdminWeatherController{constructor(private readonly weather:WeatherService){}@Get()view(@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','private, no-store');return this.weather.view();}@Post()save(@Body()body:unknown,@Req()req:Request&{admin:{id:string}}){return this.weather.save(body,req.admin.id);}}
@Module({imports:[AuthModule,MailModule,DestinationsModule],providers:[WeatherService],controllers:[PublicWeatherController,AdminWeatherController],exports:[WeatherService]})export class WeatherModule{}
