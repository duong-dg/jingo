import { z } from 'zod';
export const invoiceInput=z.object({name:z.string().trim().min(2).max(200),taxCode:z.string().trim().max(30).regex(/^[A-Za-z0-9-]*$/).default(''),address:z.string().trim().min(3).max(300),email:z.email().max(200)}).strict();
const quantity = z.number().int().min(0).max(50);
export const orderInput = z.object({
  requestId: z.uuid(), accessKey: z.string().regex(/^[a-f0-9]{64}$/),
  productId: z.string().min(1).max(80), variantId: z.string().min(1).max(80), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  voucherCode:z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9_-]{2,39}$/).optional(),slotId:z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/).optional(),quantities: z.object({ ADULT: quantity.optional(), CHILD: quantity.optional(), SENIOR: quantity.optional(), LOCAL_ADULT: quantity.optional(), LOCAL_CHILD: quantity.optional(), LOCAL_SENIOR: quantity.optional() }).strict(),
  expectedTotal: z.number().int().min(0).max(15_000_000_000),
  contact: z.object({ invoice:invoiceInput.optional(),name: z.string().trim().min(2).max(100), phone: z.string().trim().regex(/^\+?[0-9 ()-]{8,25}$/).refine(value=>{const length=value.replace(/\D/g,'').length;return length>=8&&length<=15;},'Số điện thoại cần 8–15 chữ số'), email: z.email().max(200), note: z.string().trim().max(1000).default('') }).strict(),
  locale:z.enum(['vi','en']).optional(),accepted: z.literal(true)
}).strict();
export const lookupInput = z.object({ code: z.string().regex(/^JG[A-F0-9]{10}$/), accessKey: z.string().regex(/^[a-f0-9]{64}$/).optional(),email:z.email().max(200).optional() }).strict().refine(value=>!!value.accessKey||!!value.email,'Nhập email đã đặt vé.');
const base = { requestId: z.uuid(), version: z.number().int().min(1), note: z.string().trim().min(1).max(1000) };
export const actionInput = z.discriminatedUnion('action', [
  z.object({...base,action:z.literal('ARCHIVE')}).strict(),
  z.object({...base,action:z.literal('RESTORE')}).strict(),
  z.object({...base,action:z.literal('INSTRUCTIONS'),instructions:z.string().trim().min(1).max(4000)}).strict(),
  z.object({ ...base, action: z.literal('CONFIRM'), instructions: z.string().trim().min(10).max(4000) }).strict(),
  z.object({ ...base, action: z.literal('CANCEL') }).strict(),
  z.object({ ...base, action: z.literal('CREDIT') }).strict(),
  z.object({ ...base, action: z.literal('PAY'), method:z.enum(['BANK','CASH']).optional(), amount: z.number().int().min(0).max(15_000_000_000), reference: z.string().trim().min(1).max(200) }).strict(),
  z.object({ ...base, action: z.literal('DELIVER'), tickets: z.array(z.object({ code: z.string().trim().min(1).max(2000), kind: z.enum(['SUPPLIER_CODE','TOUR_VOUCHER']), covers: z.number().int().min(1).max(150), note: z.string().trim().max(1000).default('') }).strict()).min(1).max(150) }).strict()
]);
export type OrderInput = z.infer<typeof orderInput>;
export type ActionInput = z.infer<typeof actionInput>;
