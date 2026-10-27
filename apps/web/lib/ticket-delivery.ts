export type DeliveryDraft={mode:'SINGLE'|'BULK';codes:string;kind:'SUPPLIER_CODE'|'TOUR_VOUCHER';covers:number;note:string};
export const emptyDelivery=():DeliveryDraft=>({mode:'SINGLE',codes:'',kind:'SUPPLIER_CODE',covers:1,note:''});
export function prepareDelivery(draft:DeliveryDraft,remaining:number,existingCodes:string[]=[]){
 const codes=draft.mode==='BULK'?draft.codes.split(/\r?\n/).map(code=>code.trim()).filter(Boolean):[draft.codes.trim()].filter(Boolean);
 const tickets=codes.map(code=>({code,kind:draft.kind,covers:draft.covers,note:draft.note.trim()}));
 let error='';
 if(!codes.length)error='Nhập ít nhất một mã vé.';
 else if(codes.length>150)error='Mỗi lần giao tối đa 150 mã vé.';
 else if(codes.some(code=>code.length>2000))error='Mỗi mã vé tối đa 2.000 ký tự.';
 else if(!Number.isInteger(draft.covers)||draft.covers<1||draft.covers>150)error='Số khách cho mỗi mã phải là số nguyên từ 1 đến 150.';
 else if(draft.note.trim().length>1000)error='Hướng dẫn dùng vé tối đa 1.000 ký tự.';
 else if(new Set(codes).size!==codes.length)error='Danh sách có mã trùng. Xóa mã trùng trước khi giao.';
 else if(codes.some(code=>existingCodes.includes(code)))error='Có mã đã giao trong đơn này. Kiểm tra lại danh sách.';
 else if(codes.length*draft.covers>remaining)error='Số khách được cấp vé vượt số khách còn lại trong đơn.';
 else if(new TextEncoder().encode(JSON.stringify(tickets)).length>80000)error='Danh sách quá dài. Chia thành nhiều lần giao hoặc rút ngắn hướng dẫn.';
 return{tickets,error,count:codes.length,total:codes.length*draft.covers};
}
