import {csvCell} from '../orders/orders-csv';
import type {Response} from 'express';
type ShiftExport={id:string;counterName:string;openedAt:string|Date;closedAt:string|Date|null;receipts:{id:string;code:string;amount:number;reference:string;method:string;admin_id:string;created_at:Date|string}[]};
const timestamp=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
export function shiftCsv(shift:ShiftExport){
 const headers=['Mã ca','Quầy','Trạng thái ca','Mở ca (GMT+7)','Chốt ca (GMT+7)','Mã khoản thu','Mã đơn','Thời gian thu (GMT+7)','Phương thức','Số tiền thu (VND)','Mã giao dịch','Mã người ghi thu'];
 const rows=shift.receipts.map(r=>[shift.id,shift.counterName,shift.closedAt?'Đã chốt':'Đang mở',timestamp.format(new Date(shift.openedAt)),shift.closedAt?timestamp.format(new Date(shift.closedAt)):'',r.id,r.code,timestamp.format(new Date(r.created_at)),r.method==='CASH'?'Tiền mặt':'Chuyển khoản',r.amount,r.reference,r.admin_id]);
 return '\uFEFF'+[headers,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
}
export function sendShiftCsv(res:Response,result:{id:string;csv:string;count:number},prefix=''){res.setHeader('Cache-Control','private, no-store');res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('Content-Disposition','attachment; filename="jingo-ca-'+prefix+result.id.replace(/[^a-zA-Z0-9_-]/g,'')+'.csv"');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Jingo-Export-Count',String(result.count));res.send(result.csv);}

export function cashMovementsCsv(shift:{id:string;counterName:string;movements:{id:string;kind:string;amount:number;reference:string;note:string;actor_name:string;created_at:string|Date}[]}){const header=['Mã ca','Quầy','Mã thu/chi','Ngày ghi nhận (GMT+7)','Loại','Bổ sung (VND)','Rút/chi (VND)','Mã chứng từ','Lý do','Người ghi'];return '\uFEFF'+[header,...shift.movements.map(m=>[shift.id,shift.counterName,m.id,timestamp.format(new Date(m.created_at)),m.kind==='IN'?'Bổ sung':'Rút/chi',m.kind==='IN'?m.amount:0,m.kind==='OUT'?m.amount:0,m.reference,m.note,m.actor_name])].map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';}
