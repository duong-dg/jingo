import {BadRequestException,Injectable} from '@nestjs/common';
import {z} from 'zod';
import {DatabaseService} from '../database/database.module';
import {validateDate} from '../pricing/pricing';

const date=z.string().refine(value=>{if(!value)return true;try{validateDate(value);return true;}catch{return false;}});
const querySchema=z.object({
 archived:z.enum(['true','false']).default('false'),q:z.string().trim().max(120).default(''),
 booking:z.enum(['ALL','REQUESTED','CONFIRMED','CANCELLED']).default('ALL'),
 payment:z.enum(['ALL','UNPAID','PAID','CREDIT']).default('ALL'),
 channel:z.enum(['ALL','WEB','POS','CTV']).default('ALL'),
 dateKind:z.enum(['CREATED','VISIT']).default('CREATED'),from:date.default(''),to:date.default(''),
 page:z.coerce.number().int().min(1).max(1000000).default(1),pageSize:z.coerce.number().int().min(1).max(100).default(25)
 }).strict();

@Injectable()
export class OrderSearchService{
 constructor(private readonly db:DatabaseService){}
 async search(raw:unknown){
  const parsed=querySchema.safeParse(raw);if(!parsed.success)throw new BadRequestException('Bộ lọc đơn hàng không hợp lệ.');
  const input=parsed.data;if(input.from&&input.to&&input.from>input.to)throw new BadRequestException('Ngày kết thúc phải từ ngày bắt đầu trở đi.');
  const params:unknown[]=[],conditions=[input.archived==='true'?'a.order_id IS NOT NULL':'a.order_id IS NULL'];
  const param=(value:unknown)=>{params.push(value);return '$'+params.length;};
  if(input.q){const value=param(input.q);conditions.push(`(strpos(lower(o.code),lower(${value}))>0 OR strpos(lower(o.contact->>'name'),lower(${value}))>0 OR strpos(lower(o.contact->>'phone'),lower(${value}))>0 OR strpos(lower(o.contact->>'email'),lower(${value}))>0)`);}
  if(input.booking!=='ALL')conditions.push('o.booking_status='+param(input.booking));
  if(input.payment!=='ALL')conditions.push('o.payment_status='+param(input.payment));
  if(input.channel==='POS')conditions.push('pos.order_id IS NOT NULL');
  if(input.channel==='CTV')conditions.push('partner.order_id IS NOT NULL');
  if(input.channel==='WEB')conditions.push('pos.order_id IS NULL AND partner.order_id IS NULL');
  if(input.dateKind==='VISIT'){
   if(input.from)conditions.push("o.snapshot->>'date'>="+param(input.from));
   if(input.to)conditions.push("o.snapshot->>'date'<="+param(input.to));
  }else{
   if(input.from)conditions.push('o.created_at>='+param(new Date(input.from+'T00:00:00+07:00')));
   if(input.to)conditions.push('o.created_at<'+param(new Date(new Date(input.to+'T00:00:00+07:00').getTime()+86400000)));
  }
  const source=' FROM jingo_orders o LEFT JOIN jingo_order_archives a ON a.order_id=o.id LEFT JOIN jingo_pos_orders pos ON pos.order_id=o.id LEFT JOIN jingo_partner_orders partner ON partner.order_id=o.id WHERE '+conditions.join(' AND ');
  const client=await this.db.pool.connect();
  try{
   await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
   const groups=await client.query("SELECT o.booking_status,o.payment_status,COUNT(*) AS count,SUM((o.snapshot->>'total')::bigint) AS value"+source+' GROUP BY o.booking_status,o.payment_status',params);
   const summary={total:0,requested:0,unpaid:0,paidValue:0};
   for(const row of groups.rows){const count=Number(row.count);summary.total+=count;if(row.booking_status==='REQUESTED')summary.requested+=count;if(row.booking_status==='CONFIRMED'&&row.payment_status==='UNPAID')summary.unpaid+=count;if(row.payment_status==='PAID')summary.paidValue+=Number(row.value);}
   const pages=Math.max(1,Math.ceil(summary.total/input.pageSize)),page=Math.min(input.page,pages);
   const result=await client.query("SELECT o.id,o.code,o.snapshot,o.contact,o.booking_status,o.payment_status,o.version,o.created_at,CASE WHEN pos.order_id IS NOT NULL THEN 'POS' WHEN partner.order_id IS NOT NULL THEN 'CTV' ELSE 'WEB' END AS channel"+source+' ORDER BY o.created_at DESC,o.id DESC LIMIT $'+(params.length+1)+' OFFSET $'+(params.length+2),[...params,input.pageSize,(page-1)*input.pageSize]);
   await client.query('COMMIT');return{data:result.rows,page,pageSize:input.pageSize,pages,total:summary.total,summary};
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }
}
