import{slotSchema}from'../pricing/schedule';
import {translationState} from '../content/translations';
import { z } from 'zod';
import { validateDate } from '../pricing/pricing';
import {imageRef} from '../content/content.schema';

const date = z.string().refine((value) => { try { validateDate(value); return true; } catch { return false; } }, 'Ngày không hợp lệ');
const money = z.number().int().min(0).max(100_000_000);
const prices = z.object({ ADULT: money.optional(), CHILD: money.optional(), SENIOR: money.optional() }).strict();
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
const text = z.string().trim().max(10000);
const rule = z.object({ id, productId: id, variantId: id, customerType: z.enum(['ADULT', 'CHILD', 'SENIOR']), startDate: date, endDate: date,
  weekdays: z.array(z.number().int().min(1).max(7)).min(1).max(7).optional(), priority: z.number().int().min(0).max(10000), amount: money }).strict();
const closure = z.object({ productId: id, variantId: id.optional(), startDate: date, endDate: date, reason: text.max(200).optional() }).strict();
export const productSchema = z.object({
  id, slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160),
  name: text.min(1).max(200), destination: text.min(1).max(150), type: id, description: text,
  cover:imageRef.nullable().default(null),gallery:z.array(imageRef).max(20).default([]),detailHtml:z.string().max(200000).default(''),
  status: z.enum(['DRAFT', 'PUBLISHED']), demo: z.boolean().default(false), version: z.number().int().min(0),
  variants: z.array(z.object({ id, name: text.min(1).max(100), prices,timeSlots:z.array(slotSchema).max(30).default([]),
    conditions: z.object({ ADULT: text.max(300).optional(), CHILD: text.max(300).optional(), SENIOR: text.max(300).optional() }).strict().optional()
  }).strict()).min(1).max(30),
  rules: z.array(rule).max(1000).default([]), closures: z.array(closure).max(500).default([]),
  english: z.object({ name: text.max(200), description: text, seoTitle: text.max(200), seoDescription: text.max(500), destination:text.max(150).default(''),detailHtml:z.string().max(200000).default(''),variants:z.array(z.object({id,name:text.max(100),conditions:z.object({ADULT:text.max(300).optional(),CHILD:text.max(300).optional(),SENIOR:text.max(300).optional()}).strict().optional()}).strict()).max(30).default([]),...translationState }).strict().optional(),
  seoTitle: text.max(200).default(''), seoDescription: text.max(500).default('')
}).strict().superRefine((product, ctx) => {
  const fail = (message: string) => ctx.addIssue({ code: 'custom', message });
  if (new Set(product.variants.map(v => v.id)).size !== product.variants.length) fail('Mã gói vé bị trùng.');
  if (new Set(product.rules.map(r => r.id)).size !== product.rules.length) fail('Mã lịch giá bị trùng.');
  for(const variant of product.variants){if(new Set(variant.timeSlots.map(s=>s.id)).size!==variant.timeSlots.length||new Set(variant.timeSlots.map(s=>s.start)).size!==variant.timeSlots.length)fail('Khung giờ bị trùng mã hoặc giờ bắt đầu.');}
  for (const variant of product.variants) if (!Object.values(variant.prices).some(p => p !== undefined)) fail(`Gói ${variant.name} cần ít nhất một giá.`);
  for (const item of [...product.rules, ...product.closures]) {
    if (item.productId !== product.id) fail('Lịch phải thuộc sản phẩm đang sửa.');
    if (item.startDate > item.endDate) fail('Ngày kết thúc phải sau ngày bắt đầu.');
    if (item.variantId && !product.variants.some(v => v.id === item.variantId)) fail('Lịch tham chiếu gói không tồn tại.');
  }
  for (const r of product.rules) {
    if (product.variants.find(v => v.id === r.variantId)?.prices[r.customerType] === undefined) fail('Lịch giá tham chiếu nhóm khách chưa bật.');
    const overlaps = product.rules.some(other => other !== r && other.variantId === r.variantId && other.customerType === r.customerType && other.priority === r.priority
      && other.startDate <= r.endDate && r.startDate <= other.endDate && (other.weekdays || [1,2,3,4,5,6,7]).some(d => (r.weekdays || [1,2,3,4,5,6,7]).includes(d)));
    if (overlaps) fail('Có lịch giá trùng phạm vi và độ ưu tiên.');
  }
});
export type ManagedProduct = z.infer<typeof productSchema>;
