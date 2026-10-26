import{ConflictException}from'@nestjs/common';
import type{PoolClient}from'pg';
export type LedgerRow={id:string;order_id:string|null;kind:string;amount:number|string;reference:string;note:string;created_at:Date|string;due_at:Date|string|null};
export function creditSummary(entries:LedgerRow[],limit:number){
  let settled=entries.filter(entry=>BigInt(entry.amount)<0n).reduce((sum,entry)=>sum-BigInt(entry.amount),0n);
  const charges=entries.filter(entry=>BigInt(entry.amount)>0n).map(entry=>{const amount=BigInt(entry.amount);const applied=settled<amount?settled:amount;settled-=applied;return{orderId:entry.order_id,amount:Number(amount),outstanding:Number(amount-applied),dueAt:entry.due_at};});
  const balance=Number(entries.reduce((sum,entry)=>sum+BigInt(entry.amount),0n));
  const overdue=charges.filter(charge=>charge.outstanding>0&&charge.dueAt&&new Date(charge.dueAt).getTime()<Date.now()).reduce((sum,charge)=>sum+charge.outstanding,0);
  return{balance,available:Math.max(0,limit-balance),limit,overdue,charges};
}
export async function ledgerRows(client:Pick<PoolClient,'query'>,partnerId:string):Promise<LedgerRow[]>{return(await client.query('SELECT id,order_id,kind,amount,reference,note,created_at,due_at FROM jingo_partner_ledger WHERE partner_id=$1 ORDER BY created_at,id',[partnerId])).rows;}
export function checkCredit(summary:ReturnType<typeof creditSummary>,amount:number){if(summary.overdue>0)throw new ConflictException('Có công nợ quá hạn. Vui lòng thanh toán trước khi dùng thêm hạn mức.');if(amount>summary.available)throw new ConflictException('Đơn vượt hạn mức công nợ còn lại.');}
