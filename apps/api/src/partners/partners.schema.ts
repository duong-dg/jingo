import{z}from'zod';import{validateDate}from'../pricing/pricing';
const money=z.number().int().min(0).max(1_000_000_000_000);
const date=z.string().refine(value=>{try{validateDate(value);return true;}catch{return false;}},'Ngày không hợp lệ');
export const groupSchema=z.object({id:z.uuid(),name:z.string().trim().min(1).max(100),status:z.enum(['ACTIVE','ARCHIVED']),discountType:z.enum(['AMOUNT','PERCENT']),discountValue:z.number().int().min(0).max(100_000_000),version:z.number().int().min(0),rules:z.array(z.object({id:z.uuid(),productId:z.string().min(1).max(80),variantId:z.string().min(1).max(80),customerType:z.enum(['ADULT','CHILD','SENIOR']),startDate:date,endDate:date,priority:z.number().int().min(0).max(10000),amount:z.number().int().min(0).max(100_000_000)}).strict()).max(1000).default([])}).strict().superRefine((group,ctx)=>{
  const fail=(message:string)=>ctx.addIssue({code:'custom',message});
  if(group.discountType==='PERCENT'&&group.discountValue>10000)fail('Chiết khấu phần trăm tối đa 100%.');
  if(new Set(group.rules.map(rule=>rule.id)).size!==group.rules.length)fail('Mã giá riêng bị trùng.');
  for(const rule of group.rules){if(rule.startDate>rule.endDate)fail('Ngày kết thúc phải sau ngày bắt đầu.');if(group.rules.some(other=>other!==rule&&other.productId===rule.productId&&other.variantId===rule.variantId&&other.customerType===rule.customerType&&other.priority===rule.priority&&other.startDate<=rule.endDate&&rule.startDate<=other.endDate))fail('Giá riêng trùng phạm vi và độ ưu tiên.');}
});
export const accountSchema=z.object({id:z.uuid(),name:z.string().trim().min(1).max(100),email:z.email().max(200).transform(value=>value.toLowerCase()),phone:z.string().trim().max(30),groupId:z.uuid(),status:z.enum(['ACTIVE','PAUSED','DISABLED']),creditEnabled:z.boolean(),creditLimit:money,creditDays:z.number().int().min(1).max(90),version:z.number().int().min(0),password:z.string().min(12).max(200).optional()}).strict();
export const repaymentSchema=z.object({requestId:z.uuid(),amount:money.refine(value=>value>0),reference:z.string().trim().min(1).max(200),note:z.string().trim().min(1).max(1000)}).strict();
export const partnerLogin=z.object({email:z.email().max(200).transform(value=>value.toLowerCase()),password:z.string().min(1).max(200)}).strict();
export const partnerSelection=z.object({productId:z.string().min(1).max(80),variantId:z.string().min(1).max(80),date,quantities:z.object({ADULT:z.number().int().min(0).max(50).optional(),CHILD:z.number().int().min(0).max(50).optional(),SENIOR:z.number().int().min(0).max(50).optional()}).strict()}).strict();
export const creditRequest=z.object({requestId:z.uuid(),version:z.number().int().min(1),note:z.string().trim().min(1).max(1000)}).strict();
export type PriceGroup=z.infer<typeof groupSchema>;
export type PartnerAccount=Omit<z.infer<typeof accountSchema>,'password'>;
export type Repayment=z.infer<typeof repaymentSchema>;
