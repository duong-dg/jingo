import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import { DatabaseService } from '../database/database.module';
import { MailService } from '../mail/mail.module';
import { OrdersService } from './orders.service';
import { orderInput } from './orders.schema';
import { calculateQuote } from '../pricing/pricing';
import { translated } from '../content/translations';
import { applyNetPricing } from '../partners/net-pricing';
import { checkCredit, creditSummary, ledgerRows } from '../partners/credit';
import { inventoryUsage, InventoryService } from '../inventory/inventory.module';
import { VouchersService } from '../vouchers/vouchers.module';
import type { PosActor } from '../pos/pos.schema';
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const item = orderInput.omit({ requestId: true, accessKey: true, contact: true, accepted: true, locale: true });
const schema = orderInput.pick({ requestId: true, accessKey: true, contact: true, accepted: true, locale: true }).extend({ items: z.array(item).min(1).max(20), counterId: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/).optional() }).strict();
type Context = { channel: 'WEB' | 'CTV' | 'POS' | 'ADMIN'; partnerId?: string; actor?: PosActor };
type Input = z.infer<typeof schema>;
export const cartLookupInput = z.object({ code: z.string().regex(/^JC[A-F0-9]{10}$/), accessKey: z.string().regex(/^[a-f0-9]{64}$/).optional(), email: z.email().max(200).optional() }).strict().refine(v => !!v.accessKey || !!v.email);
@Injectable()
export class CartsService {
  constructor(private readonly db: DatabaseService, private readonly orders: OrdersService, private readonly mail: MailService, private readonly inventory: InventoryService, private readonly vouchers: VouchersService) {}
  private scope(cart: any, context: Context) {
    if (context.channel === 'ADMIN') return;
    if (cart.channel !== context.channel || context.channel === 'CTV' && cart.partner_id !== context.partnerId || context.channel === 'POS' && context.actor?.role !== 'ADMIN' && !context.actor?.counterIds.includes(cart.counter_id)) throw new NotFoundException('Không tìm thấy giỏ đặt vé.');
  }
  async members(client: Pick<PoolClient, 'query'>, id: string, lock = false) { return (await client.query('SELECT o.* FROM jingo_cart_orders c JOIN jingo_orders o ON o.id=c.order_id WHERE c.cart_id=$1 ORDER BY o.id' + (lock ? ' FOR UPDATE' : ''), [id])).rows; }
  private async validate(input: Input, context: Context, client: PoolClient) {
    if (context.channel !== 'POS' && input.counterId) throw new BadRequestException('Giỏ này không chọn quầy.');
    if (context.channel === 'POS') {
      const actor = context.actor!;
      if (!actor.permissions.includes('SELL')) throw new ForbiddenException('Bạn chưa được cấp quyền bán vé.');
      if (!input.counterId || actor.role !== 'ADMIN' && !actor.counterIds.includes(input.counterId)) throw new NotFoundException('Không tìm thấy quầy được cấp quyền.');
      if (actor.role === 'STAFF') { const staff = (await client.query('SELECT data FROM jingo_pos_users WHERE id=$1 FOR SHARE', [actor.id])).rows[0]?.data; if (!staff || staff.status !== 'ACTIVE' || !staff.permissions.includes('SELL') || !staff.counterIds.includes(input.counterId)) throw new ForbiddenException('Quyền bán tại quầy đã thay đổi.'); }
      const counter = (await client.query('SELECT data FROM jingo_counters WHERE id=$1 FOR SHARE', [input.counterId])).rows[0]?.data;
      if (counter?.status !== 'ACTIVE') throw new BadRequestException('Quầy chưa hoạt động.');
    }
    let pricing: any;
    if (context.channel === 'CTV') {
      const account = (await client.query('SELECT data FROM jingo_partners WHERE id=$1 FOR UPDATE', [context.partnerId])).rows[0]?.data;
      if (account?.status !== 'ACTIVE') throw new ForbiddenException('CTV không được tạo đơn mới.');
      pricing = (await client.query('SELECT data FROM jingo_price_groups WHERE id=$1 FOR SHARE', [account.groupId])).rows[0]?.data;
      if (pricing?.status !== 'ACTIVE') throw new BadRequestException('Chưa có bảng giá CTV.');
    }
    const products = new Map<string, any>();
    for (const id of [...new Set(input.items.map(i => i.productId))].sort()) { const product = (await client.query('SELECT data FROM jingo_products WHERE id=$1 FOR UPDATE', [id])).rows[0]?.data; if (!product || product.status !== 'PUBLISHED' || product.demo) throw new BadRequestException('Có sản phẩm chưa mở bán.'); products.set(id, product); }
    for (const code of [...new Set(input.items.flatMap(i => i.voucherCode ? [i.voucherCode] : []))].sort()) await client.query('SELECT id FROM jingo_vouchers WHERE code=$1 FOR UPDATE', [code]);
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()), planned: any[] = [], vouchers = new Map<string, number>();
    let total = 0, guests = 0;
    const identities = new Set<string>();
    for (const line of input.items) {
      if (line.date < today) throw new BadRequestException('Ngày sử dụng đã qua.');
      const product = products.get(line.productId), identity = JSON.stringify([line.productId, line.variantId, line.date, line.slotId || '']);
      if (identities.has(identity)) throw new BadRequestException('Gộp số lượng các dòng cùng gói/ngày/giờ trước khi đặt.'); identities.add(identity);
      if (input.locale === 'en' && !translated('PRODUCT', product)) throw new ConflictException('English content has changed. Please refresh before booking.');
      let quote; try { quote = calculateQuote(product, line.variantId, line.date, line.quantities, product.rules, product.closures, line.slotId); if (pricing) quote = applyNetPricing(quote, pricing); } catch (e) { throw new BadRequestException((e as Error).message); }
      const quantity = quote.lines.reduce((n, l) => n + l.quantity, 0), slot = quote.timeSlot?.id || '';
      await this.inventory.check(line.productId, line.variantId, line.date, slot, quantity, client);
      let discount = 0;
      if (line.voucherCode) {
        if (context.channel !== 'WEB') throw new BadRequestException('Mã giảm giá chỉ dùng cho khách web.');
        const result = await this.vouchers.discount(line.voucherCode, quote.total, client, true, { productId: line.productId, variantId: line.variantId, date: line.date }); discount = result.amount;
        const used = (vouchers.get(result.id) || 0) + 1; vouchers.set(result.id, used);
        const config = (await client.query('SELECT data FROM jingo_vouchers WHERE id=$1', [result.id])).rows[0].data, existing = Number((await client.query('SELECT COUNT(*) AS total FROM jingo_voucher_uses WHERE voucher_id=$1 AND released=false', [result.id])).rows[0].total);
        if (config.maxUses !== null && existing + used > config.maxUses) throw new ConflictException('Mã giảm giá không còn đủ lượt cho các dòng trong giỏ.');
      }
      if (quote.total - discount !== line.expectedTotal) throw new ConflictException('Giá trong giỏ vừa thay đổi. Cập nhật giá trước khi đặt.');
      total += line.expectedTotal; guests += quantity;
      planned.push({ product_id: line.productId, variant_id: line.variantId, visit_date: line.date, slot_id: slot, quantity, released: false });
    }
    if (guests > 150 || total > 15000000000) throw new BadRequestException('Mỗi giỏ tối đa 150 khách và 15 tỷ đồng.');
    // Check shared day/slot buckets against the whole basket before creating any orders.
    for (const row of planned) {
      if (!(await client.query('SELECT enabled FROM jingo_inventory_configs WHERE product_id=$1', [row.product_id])).rows[0]?.enabled) continue;
      const buckets = (await client.query('SELECT * FROM jingo_inventory_buckets WHERE product_id=$1 AND variant_id=$2 AND visit_date=$3', [row.product_id, row.variant_id, row.visit_date])).rows;
      const existing = (await client.query('SELECT * FROM jingo_inventory_allocations WHERE product_id=$1 AND visit_date=$2 AND released=false', [row.product_id, row.visit_date])).rows;
      const added = planned.filter(p => p.product_id === row.product_id && p.visit_date === row.visit_date);
      for (const bucket of buckets) if (inventoryUsage([...existing, ...added], bucket.variant_id, bucket.slot_id) > bucket.capacity) throw new ConflictException('Tổng số vé trong giỏ vượt tồn còn lại của ngày/suất.');
    }
    return total;
  }
  async create(body: unknown, context: Context = { channel: 'WEB' }) {
    const parsed = schema.safeParse(body); if (!parsed.success) throw new BadRequestException('Kiểm tra giỏ, số khách và thông tin liên hệ.');
    const input = parsed.data, fingerprint = hash(JSON.stringify({ input, context:{channel:context.channel,partnerId:context.partnerId,actorId:context.actor?.id} })), client = await this.db.pool.connect(); let code = '';
    try {
      await client.query('BEGIN');
      // A shared request lock serializes a retry without relying on a failed unique INSERT.
      await client.query("SELECT id FROM jingo_migrations WHERE id='037_cart_requests' FOR UPDATE");
      const prior = (await client.query('SELECT code,request_hash FROM jingo_carts WHERE request_id=$1', [input.requestId])).rows[0];
      if (prior) { if (prior.request_hash !== fingerprint) throw new ConflictException('Yêu cầu giỏ đã dùng với nội dung khác.'); await client.query('COMMIT'); return { code: prior.code, ...(context.channel === 'WEB' ? { accessKey: input.accessKey } : {}) }; }
      const total = await this.validate(input, context, client), id = randomUUID(), secret = context.channel === 'POS' ? randomBytes(32).toString('hex') : input.accessKey;
      code = 'JC' + randomBytes(5).toString('hex').toUpperCase();
      await client.query('INSERT INTO jingo_carts(id,code,request_id,request_hash,channel,partner_id,counter_id,access_hash,secret,total)VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [id, code, input.requestId, fingerprint, context.channel, context.partnerId || null, input.counterId || null, hash(secret), await this.mail.encrypt(secret), total]);
      const actor = context.actor, pos = actor ? { counterId: input.counterId!, adminId: actor.role === 'STAFF' ? 'pos-user:' + actor.id : actor.id, ...(actor.role === 'STAFF' ? { staffId: actor.id } : {}) } : undefined;
      let anchor = '';
      for (let i = 0; i < input.items.length; i++) {
        const created = await this.orders.create({ ...input.items[i], requestId: randomUUID(), accessKey: secret, contact: input.contact, accepted: true, ...(input.locale ? { locale: input.locale } : {}) }, context.partnerId, pos, { client, silent: true });
        const order = (await client.query('SELECT id FROM jingo_orders WHERE code=$1', [created.code])).rows[0]; anchor ||= order.id;
        await client.query('INSERT INTO jingo_cart_orders(cart_id,order_id,position)VALUES($1,$2,$3)', [id, order.id, i]);
      }
      await this.mail.enqueue(client, anchor, 'CART_CREATED', 1);
      await client.query('INSERT INTO jingo_audit(id,admin_id,action,entity_id)VALUES($1,$2,$3,$4)', [randomUUID(), context.partnerId ? 'partner:' + context.partnerId : actor?.id || 'customer', 'cart.create', id]);
      await client.query('COMMIT');
      return { code, ...(context.channel === 'WEB' ? { accessKey: input.accessKey } : {}) };
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  }
  async view(code: string, context: Context, publicAuth?: { accessKey?: string; email?: string }) {
    const cart = (await this.db.pool.query('SELECT * FROM jingo_carts WHERE code=$1', [code])).rows[0]; if (!cart) throw new NotFoundException('Không tìm thấy giỏ đặt vé.');
    let customerFull = false;
    if (publicAuth) {
      if (cart.channel === 'CTV') throw new NotFoundException('Không tìm thấy giỏ đặt vé.');
      const rows = await this.members(this.db.pool, cart.id), first = rows[0];
      if (!first || (publicAuth.accessKey ? hash(publicAuth.accessKey) !== cart.access_hash : !publicAuth.email || first.contact.email.trim().toLowerCase() !== publicAuth.email.trim().toLowerCase())) throw new NotFoundException('Không tìm thấy giỏ đặt vé.');
      customerFull = cart.channel === 'WEB' || !!publicAuth.accessKey;
    } else this.scope(cart, context);
    const members = (await this.db.pool.query('SELECT order_id FROM jingo_cart_orders WHERE cart_id=$1 ORDER BY position', [cart.id])).rows;
    const items = [];
    for (const member of members) {
      const detail = await this.orders.get(member.order_id), canSee = publicAuth ? customerFull : context.channel !== 'POS' || context.actor!.permissions.some(p => p === 'PRINT' || p === 'DELIVER');
      const { id, code, snapshot, bookingStatus, paymentStatus, fulfillmentStatus, tickets, version, instructions, deliveredGuests, totalGuests } = detail;
      const archived = 'archived' in detail ? detail.archived : false;
      let accessKey: string | undefined;
      if (customerFull && !archived && bookingStatus === 'CONFIRMED') { const key = (await this.db.pool.query('SELECT secret FROM jingo_order_mail_keys WHERE order_id=$1', [id])).rows[0]?.secret; if (key) accessKey = await this.mail.decrypt(key); }
      items.push({ id, code, snapshot, bookingStatus, paymentStatus, fulfillmentStatus, version, instructions, deliveredGuests, totalGuests, archived, tickets: canSee && !archived && bookingStatus !== 'CANCELLED' ? tickets : [], ...(accessKey ? { accessKey } : {}) });
    }
    const active = items.filter(i => !i.archived && i.bookingStatus === 'CONFIRMED'), payable = active.filter(i => i.paymentStatus === 'UNPAID').reduce((n, i) => n + i.snapshot.total, 0);
    return { code: cart.code, channel: cart.channel, version: cart.version, total: Number(cart.total), payable, settled: active.length > 0 && active.every(i => i.paymentStatus !== 'UNPAID'), items, onlinePaymentEligible: cart.channel === 'WEB' && active.some(i => i.paymentStatus === 'UNPAID') && payable > 0, ...(publicAuth && cart.channel === 'POS' && !customerFull ? { ticketAccess: 'EMAIL_LINK' } : {}) };
  }
  async lookup(body: unknown) { const input = cartLookupInput.safeParse(body); if (!input.success) throw new BadRequestException('Nhập mã giỏ và email hoặc khóa tra cứu.'); return this.view(input.data.code, { channel: 'WEB' }, input.data); }
  async act(code: string, body: unknown, context: Context) {
    const input = z.object({ requestId: z.uuid(), action: z.enum(['PAY', 'CREDIT']), expectedTotal: z.number().int().min(0).max(15000000000), method: z.enum(['BANK', 'CASH']).optional(), reference: z.string().trim().max(150).optional() }).strict().safeParse(body);
    if (!input.success) throw new BadRequestException('Kiểm tra số tiền và phương thức thu.');
    const data = input.data, fingerprint = hash(JSON.stringify({ code, data, context:{channel:context.channel,partnerId:context.partnerId,actorId:context.actor?.id} })), client = await this.db.pool.connect();
    try {
      await client.query('BEGIN'); const cart = (await client.query('SELECT * FROM jingo_carts WHERE code=$1 FOR UPDATE', [code])).rows[0]; if (!cart) throw new NotFoundException(); this.scope(cart, context);
      if (context.channel === 'WEB' || context.channel === 'CTV' && data.action !== 'CREDIT' || context.channel === 'POS' && (!context.actor?.permissions.includes('COLLECT') || data.action !== 'PAY')) throw new ForbiddenException('Không được thu tiền hoặc ghi nợ giỏ này.');
      const prior = (await client.query('SELECT request_hash FROM jingo_cart_actions WHERE id=$1', [data.requestId])).rows[0]; if (prior) { if (prior.request_hash !== fingerprint) throw new ConflictException('Mã thao tác đã dùng.'); await client.query('COMMIT'); return this.view(code, context); }
      const rows = await this.members(client, cart.id, true), eligible = [];
      for (const row of rows) if (row.booking_status === 'CONFIRMED' && row.payment_status === 'UNPAID' && !(await client.query('SELECT order_id FROM jingo_order_archives WHERE order_id=$1', [row.id])).rowCount) eligible.push(row);
      const total = eligible.reduce((n, r) => n + r.snapshot.total, 0);
      if (!eligible.length || total !== data.expectedTotal) throw new ConflictException('Số tiền còn phải thanh toán đã thay đổi. Cập nhật giỏ.');
      if (data.action === 'CREDIT') {
        if (!cart.partner_id) throw new ForbiddenException(); const account = (await client.query('SELECT data FROM jingo_partners WHERE id=$1 FOR UPDATE', [cart.partner_id])).rows[0]?.data;
        if (!account?.creditEnabled || account.status !== 'ACTIVE') throw new ForbiddenException('CTV chưa được dùng công nợ.'); checkCredit(creditSummary(await ledgerRows(client, cart.partner_id), account.creditLimit), total);
      } else {
        if (!data.method || data.method === 'BANK' && !data.reference) throw new BadRequestException('Chọn phương thức và mã giao dịch ngân hàng.');
        const reference = data.method === 'CASH' ? 'CART_CASH:' + data.requestId : data.reference!.toUpperCase();
        if ((await client.query('SELECT reference FROM jingo_payment_references WHERE reference=$1', [reference])).rowCount) throw new ConflictException('Mã giao dịch đã được ghi nhận.');
        await client.query('INSERT INTO jingo_payment_references(reference,kind,entity_id,amount)VALUES($1,$2,$3,$4)', [reference, 'CART_PAYMENT', cart.id, total]);
      }
      for (const row of eligible) await this.orders.act(row.id, data.action === 'CREDIT' ? { requestId: randomUUID(), version: row.version, action: 'CREDIT', note: 'CTV ghi nợ giỏ ' + code } : { requestId: randomUUID(), version: row.version, action: 'PAY', amount: row.snapshot.total, method: data.method!, reference: data.method === 'CASH' ? 'CASH' : data.reference!.toUpperCase() + '#' + row.code, note: 'Thu chung giỏ ' + code }, context.partnerId ? 'partner:' + context.partnerId : context.actor?.role === 'STAFF' ? 'pos-user:' + context.actor.id : context.actor?.id || 'admin', data.action === 'CREDIT' ? cart.partner_id : undefined, context.actor?.role === 'STAFF' ? context.actor.id : undefined, { client, silent: true });
      await client.query('INSERT INTO jingo_cart_actions(id,cart_id,request_hash)VALUES($1,$2,$3)', [data.requestId, cart.id, fingerprint]); await client.query('UPDATE jingo_carts SET version=version+1 WHERE id=$1', [cart.id]);
      if (data.action === 'PAY') await this.mail.enqueue(client, eligible[0].id, 'CART_PAY', cart.version + 1);
      await client.query('COMMIT');
    } catch (e) { await client.query('ROLLBACK'); if ((e as { code?: string }).code === '23505') throw new ConflictException('Mã giao dịch hoặc thao tác đã được dùng.'); throw e; } finally { client.release(); }
    return this.view(code, context);
  }
}
