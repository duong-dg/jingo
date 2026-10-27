export type SupplyLot = {id:string;enabled:boolean;valid_from:string;valid_to:string;remaining:number};
export function lotAlert(lot:SupplyLot,today:string,threshold:number,days:number):'EXPIRED'|'EXPIRING'|'EMPTY'|'LOW'|null{
 if(!lot.enabled)return null;
 if(lot.valid_to<today)return lot.remaining>0?'EXPIRED':null;
 if(lot.valid_from>today)return null;
 if(lot.remaining===0)return 'EMPTY';
 const end=new Date(today+'T00:00:00Z');end.setUTCDate(end.getUTCDate()+days);
 if(lot.valid_to<=end.toISOString().slice(0,10))return 'EXPIRING';
 return lot.remaining<=threshold?'LOW':null;
}
