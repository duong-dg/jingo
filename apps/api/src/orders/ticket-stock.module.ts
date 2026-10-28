import { BadRequestException, Body, ConflictException, Controller, Get, Injectable, Module, NotFoundException, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { PoolClient } from 'pg';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { DatabaseService } from '../database/database.module';
import { AdminGuard, AuthModule } from '../admin/auth.module';
const digest = (s: string) => createHash('sha256').update(s).digest('hex');
const importSchema = z.object({ requestId: z.uuid(), lotId: z.uuid(), codes: z.array(z.string().trim().min(1).max(2000)).min(1).max(500) }).strict();
function parse<T>(schema: z.ZodType<T>, body: unknown): T { const r = schema.safeParse(body); if (!r.success) throw new BadRequestException('Kiểm tra nguồn, mã vé và bộ lọc.'); return r.data; }
type Client = Pick<PoolClient, 'query'>;
@Injectable()
export class TicketStockService {
  constructor(private readonly db: DatabaseService) {}
  async lock(client: Client) { await client.query("SELECT id FROM jingo_migrations WHERE id='035_ticket_stock_lock' FOR UPDATE"); }
  async receive(body: unknown, actor: string) {
    const input = parse(importSchema, body), hashes = input.codes.map(digest), fingerprint = digest(JSON.stringify(input));
    if (new Set(hashes).size !== hashes.length) throw new BadRequestException('Danh sách nhập có mã trùng. Chưa lưu mã nào.');
    const client = await this.db.pool.connect();
    try {
      await client.query('BEGIN');
      // Match delivery lock ordering: source first, then the shared code namespace.
      const lot = (await client.query('SELECT * FROM jingo_supply_lots WHERE id=$1 FOR SHARE', [input.lotId])).rows[0];
      if (!lot || lot.archived || !lot.enabled) throw new BadRequestException('Chọn nguồn đang hoạt động.');
      await this.lock(client);
      const prior = (await client.query('SELECT request_hash,quantity FROM jingo_stock_imports WHERE id=$1', [input.requestId])).rows[0];
      if (prior) { if (prior.request_hash !== fingerprint) throw new ConflictException('Mã nhập đã dùng với dữ liệu khác.'); await client.query('COMMIT'); return { quantity: prior.quantity, duplicate: true }; }
      for (const hash of hashes) {
        if ((await client.query('SELECT id FROM jingo_ticket_stock WHERE code_hash=$1', [hash])).rowCount || (await client.query('SELECT id FROM jingo_order_tickets WHERE code_hash=$1', [hash])).rowCount) throw new ConflictException('Có mã đã nằm trong kho hoặc đã giao. Chưa lưu mã nào.');
      }
      for (let i = 0; i < input.codes.length; i++) await client.query('INSERT INTO jingo_ticket_stock(id,lot_id,code,code_hash)VALUES($1,$2,$3,$4)', [randomUUID(), input.lotId, input.codes[i], hashes[i]]);
      await client.query('INSERT INTO jingo_stock_imports(id,lot_id,request_hash,quantity)VALUES($1,$2,$3,$4)', [input.requestId, input.lotId, fingerprint, input.codes.length]);
      await client.query('INSERT INTO jingo_audit(id,admin_id,action,entity_id)VALUES($1,$2,$3,$4)', [randomUUID(), actor, 'ticket-stock.import', input.requestId]);
      await client.query('COMMIT'); return { quantity: input.codes.length, duplicate: false };
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  }
  async list(query: unknown) {
    const input = parse(z.object({ lotId: z.uuid(), status: z.enum(['AVAILABLE', 'BLOCKED', 'ISSUED']).optional(), page: z.coerce.number().int().min(1).max(100000).default(1) }).strict(), query);
    const values: unknown[] = [input.lotId], where = ' WHERE s.lot_id=$1' + (input.status ? ' AND s.status=$2' : ''); if (input.status) values.push(input.status);
    const total = Number((await this.db.pool.query('SELECT COUNT(*) AS total FROM jingo_ticket_stock s' + where, values)).rows[0].total), page = Math.min(input.page, Math.max(1, Math.ceil(total / 50)));
    const data = (await this.db.pool.query('SELECT s.id,s.code,s.status,s.version,s.reason,s.created_at,s.order_id,o.code AS order_code FROM jingo_ticket_stock s LEFT JOIN jingo_orders o ON o.id=s.order_id' + where + ' ORDER BY s.created_at,s.id LIMIT 50 OFFSET $' + (values.length + 1), [...values, (page - 1) * 50])).rows;
    const counts = (await this.db.pool.query('SELECT status,COUNT(*) AS quantity FROM jingo_ticket_stock WHERE lot_id=$1 GROUP BY status', [input.lotId])).rows;
    return { data, total, page, pageSize: 50, counts: Object.fromEntries(counts.map(r => [r.status, Number(r.quantity)])) };
  }
  async manage(id: string, body: unknown, actor: string) {
    const input = parse(z.object({ version: z.number().int().positive(), action: z.enum(['BLOCK', 'UNBLOCK']), reason: z.string().trim().min(3).max(500) }).strict(), body), client = await this.db.pool.connect();
    try {
      await client.query('BEGIN'); await this.lock(client);
      const row = (await client.query('SELECT * FROM jingo_ticket_stock WHERE id=$1 FOR UPDATE', [id])).rows[0];
      if (!row) throw new NotFoundException();
      if (row.status === 'ISSUED') throw new ConflictException('Mã đã giao không thể đưa lại kho hoặc khóa như mã chưa bán.');
      if (row.version !== input.version || (input.action === 'BLOCK' ? row.status !== 'AVAILABLE' : row.status !== 'BLOCKED')) throw new ConflictException('Mã đã thay đổi. Tải lại.');
      await client.query('UPDATE jingo_ticket_stock SET status=$2,reason=$3,version=version+1 WHERE id=$1', [id, input.action === 'BLOCK' ? 'BLOCKED' : 'AVAILABLE', input.reason]);
      await client.query('INSERT INTO jingo_audit(id,admin_id,action,entity_id)VALUES($1,$2,$3,$4)', [randomUUID(), actor, 'ticket-stock.' + input.action.toLowerCase(), id]);
      await client.query('COMMIT'); return { ok: true };
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  }
  async choices(orderId: string) {
    const order = (await this.db.pool.query('SELECT * FROM jingo_orders WHERE id=$1', [orderId])).rows[0]; if (!order) throw new NotFoundException();
    if (order.booking_status !== 'CONFIRMED' || !['PAID', 'CREDIT'].includes(order.payment_status) || (await this.db.pool.query('SELECT order_id FROM jingo_order_archives WHERE order_id=$1', [orderId])).rowCount) return { data: [] };
    const allocations = (await this.db.pool.query('SELECT l.*,a.quantity FROM jingo_supply_allocations a JOIN jingo_supply_lots l ON l.id=a.lot_id WHERE a.order_id=$1 AND a.released=false ORDER BY l.id', [orderId])).rows;
    const data = [];
    for (const lot of allocations) {
      if (lot.product_id !== order.snapshot.productId || lot.variant_id !== order.snapshot.variantId || lot.valid_from > order.snapshot.date || lot.valid_to < order.snapshot.date) continue;
      const issued = Number((await this.db.pool.query("SELECT COUNT(*) AS total FROM jingo_ticket_stock WHERE lot_id=$1 AND order_id=$2 AND status='ISSUED'", [lot.id, orderId])).rows[0].total), capacity = Math.max(0, lot.quantity - issued);
      if (!capacity) continue;
      const codes = (await this.db.pool.query("SELECT id,code FROM jingo_ticket_stock WHERE lot_id=$1 AND status='AVAILABLE' ORDER BY created_at,id LIMIT 150", [lot.id])).rows;
      data.push({ lotId: lot.id, supplierName: lot.data.supplierName, customerType: lot.customer_type, capacity, codes });
    }
    return { data };
  }
  // Lock source scope before the shared code namespace, matching receive/allocate lock order.
  async prepare(client: Client, order: { id: string; snapshot: { productId: string; variantId?: string; date: string } }, tickets: { code: string; kind: string; covers: number }[]) {
    await client.query('SELECT id FROM jingo_products WHERE id=$1 FOR UPDATE', [order.snapshot.productId]);
    await client.query('SELECT id FROM jingo_supply_lots WHERE product_id=$1 ORDER BY id FOR UPDATE', [order.snapshot.productId]);
    await this.lock(client);
    const planned = new Map<string, number>();
    for (const ticket of tickets) {
      if ((await client.query('SELECT id FROM jingo_order_tickets WHERE code_hash=$1', [digest(ticket.code)])).rowCount) throw new ConflictException('Có mã vé đã được giao.');
      const row = (await client.query('SELECT * FROM jingo_ticket_stock WHERE code_hash=$1 FOR UPDATE', [digest(ticket.code)])).rows[0];
      if (!row) continue;
      if (row.status !== 'AVAILABLE' || ticket.kind !== 'SUPPLIER_CODE' || ticket.covers !== 1) throw new ConflictException('Mã trong kho phải còn sẵn, là mã nhà cung cấp và áp dụng cho một khách.');
      const lot = (await client.query('SELECT l.*,a.quantity FROM jingo_supply_allocations a JOIN jingo_supply_lots l ON l.id=a.lot_id WHERE a.order_id=$1 AND a.lot_id=$2 AND a.released=false', [order.id, row.lot_id])).rows[0];
      if (!lot || lot.product_id !== order.snapshot.productId || lot.variant_id !== order.snapshot.variantId || lot.valid_from > order.snapshot.date || lot.valid_to < order.snapshot.date) throw new ConflictException('Mã không thuộc nguồn đã phân bổ đúng gói/ngày của đơn.');
      const used = Number((await client.query("SELECT COUNT(*) AS total FROM jingo_ticket_stock WHERE lot_id=$1 AND order_id=$2 AND status='ISSUED'", [row.lot_id, order.id])).rows[0].total), quantity = (planned.get(row.lot_id) || 0) + 1;
      if (used + quantity > lot.quantity) throw new ConflictException('Số mã vượt phần nguồn đã phân bổ cho đơn.');
      planned.set(row.lot_id, quantity);
    }
  }
  // Only called after prepare(), while the transaction still holds its namespace lock.
  async use(client: Client, order: { id: string }, ticket: { code: string }, ticketId: string) {
    await client.query("UPDATE jingo_ticket_stock SET status='ISSUED',order_id=$2,ticket_id=$3,version=version+1 WHERE code_hash=$1 AND status='AVAILABLE'", [digest(ticket.code), order.id, ticketId]);
  }

}
@Controller('admin/ticket-stock') @UseGuards(AdminGuard)
class TicketStockController {
  constructor(private readonly stock: TicketStockService) {}
  @Get() list(@Query() query: unknown, @Res({ passthrough: true }) res: Response) { res.setHeader('Cache-Control', 'private, no-store'); return this.stock.list(query); }
  @Post() receive(@Body() body: unknown, @Req() req: Request & { admin: { id: string } }) { return this.stock.receive(body, req.admin.id); }
  @Post(':id/manage') manage(@Param('id') id: string, @Body() body: unknown, @Req() req: Request & { admin: { id: string } }) { return this.stock.manage(id, body, req.admin.id); }
  @Get('orders/:id') choices(@Param('id') id: string, @Res({ passthrough: true }) res: Response) { res.setHeader('Cache-Control', 'private, no-store'); return this.stock.choices(id); }
}
@Module({ imports: [AuthModule], providers: [TicketStockService], controllers: [TicketStockController], exports: [TicketStockService] })
export class TicketStockModule {}
