import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.module';
import { ManagedProduct } from '../admin/product.schema';
import { calculateQuote } from '../pricing/pricing';
import { ActionInput, OrderInput } from './orders.schema';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export interface OrderSnapshot { productId: string; productName: string; variantName: string; date: string; total: number; demo: boolean; lines: { customerType: string; quantity: number; unitPrice: number; subtotal: number }[]; conditions: object; policy: string }
interface OrderRow { id: string; code: string; snapshot: OrderSnapshot; contact: object; instructions: string; booking_status: string; payment_status: string; version: number; created_at: Date; request_hash: string }
@Injectable()
export class OrdersService {
  constructor(private readonly db: DatabaseService) {}
  async create(input: OrderInput) {
    const requestHash = hash(JSON.stringify(input));
    const client = await this.db.pool.connect();
    try {
      await client.query('BEGIN');
      const prior = await client.query('SELECT id,code,request_hash FROM jingo_orders WHERE request_id=$1', [input.requestId]);
      if (prior.rowCount) {
        if (prior.rows[0].request_hash !== requestHash) throw new ConflictException('Yêu cầu này đã được dùng với nội dung khác.');
        await client.query('COMMIT'); return { code: prior.rows[0].code, accessKey: input.accessKey };
      }
      const result = await client.query('SELECT data FROM jingo_products WHERE id=$1 FOR SHARE', [input.productId]);
      const product = result.rows[0]?.data as ManagedProduct | undefined;
      if (!product || product.status !== 'PUBLISHED') throw new NotFoundException('Sản phẩm chưa mở bán.');
      if (product.demo) throw new BadRequestException('Sản phẩm minh họa không nhận đơn.');
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year:'numeric',month:'2-digit',day:'2-digit' }).format(new Date());
      if (input.date < today) throw new BadRequestException('Ngày sử dụng đã qua.');
      let quote;
      try { quote = calculateQuote(product, input.variantId, input.date, input.quantities, product.rules, product.closures); }
      catch (e) { throw new BadRequestException(e instanceof Error ? e.message : 'Không thể lấy giá.'); }
      if (quote.total !== input.expectedTotal) throw new ConflictException('Giá vừa thay đổi. Vui lòng kiểm tra giá mới trước khi gửi.');
      const variant = product.variants.find(v => v.id === input.variantId)!;
      const snapshot: OrderSnapshot = { productId: product.id, productName: product.name, variantName: variant.name, date: input.date,
        total: quote.total, lines: quote.lines, demo: false, conditions: variant.conditions || {},
        policy: 'Yêu cầu đặt cần JinGo xác nhận nguồn vé/chỗ. Chưa giữ chỗ hoặc bảo đảm có vé. Chỉ chuyển khoản sau khi JinGo xác nhận và cung cấp hướng dẫn. Chính sách đổi/hủy do JinGo xác nhận với nhà cung cấp trước khi bạn thanh toán.' };
      const code = 'JG' + randomBytes(5).toString('hex').toUpperCase();
      await client.query('INSERT INTO jingo_orders(id,code,request_id,request_hash,access_hash,snapshot,contact) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [randomUUID(), code, input.requestId, requestHash, hash(input.accessKey), JSON.stringify(snapshot), JSON.stringify(input.contact)]);
      await client.query('COMMIT'); return { code, accessKey: input.accessKey };
    } catch (e) {
      await client.query('ROLLBACK');
      if ((e as { code?: string }).code === '23505') {
        const prior = await this.db.pool.query('SELECT code,request_hash FROM jingo_orders WHERE request_id=$1', [input.requestId]);
        if (prior.rows[0]?.request_hash === requestHash) return { code: prior.rows[0].code, accessKey: input.accessKey };
        throw new ConflictException('Yêu cầu bị trùng. Vui lòng thử lại.');
      }
      throw e;
    } finally { client.release(); }
  }
  private async detail(row: OrderRow, admin: boolean, client: Pick<PoolClient,'query'> = this.db.pool) {
    const tickets = await client.query('SELECT id,code,kind,covers,note,created_at FROM jingo_order_tickets WHERE order_id=$1 ORDER BY created_at', [row.id]);
    const issued = tickets.rows.reduce((sum: number, ticket: { covers: number }) => sum + ticket.covers, 0);
    const totalGuests = row.snapshot.lines.reduce((sum, line) => sum + line.quantity, 0);
    const response = { id: row.id, code: row.code, snapshot: row.snapshot, bookingStatus: row.booking_status, paymentStatus: row.payment_status,
      fulfillmentStatus: issued === 0 ? 'PENDING' : issued >= totalGuests ? 'DELIVERED' : 'PARTIAL', tickets: tickets.rows,
      version: row.version, createdAt: row.created_at, deliveredGuests: issued, totalGuests, instructions: row.instructions };
    if (!admin) return response;
    const payments = await client.query('SELECT amount,reference,created_at FROM jingo_order_payments WHERE order_id=$1', [row.id]);
    const history = await client.query('SELECT action,note,created_at FROM jingo_order_actions WHERE order_id=$1 ORDER BY created_at', [row.id]);
    return { ...response, contact: row.contact, payments: payments.rows, history: history.rows };
  }
  async lookup(code: string, accessKey: string) {
    const result = await this.db.pool.query('SELECT * FROM jingo_orders WHERE code=$1 AND access_hash=$2', [code, hash(accessKey)]);
    if (!result.rowCount) throw new NotFoundException('Không tìm thấy đơn hoặc khóa tra cứu không đúng.');
    return this.detail(result.rows[0], false);
  }
  async list() {
    const result = await this.db.pool.query('SELECT id,code,snapshot,contact,booking_status,payment_status,version,created_at FROM jingo_orders ORDER BY created_at DESC LIMIT 200');
    return result.rows;
  }
  async get(id: string) {
    const result = await this.db.pool.query('SELECT * FROM jingo_orders WHERE id=$1', [id]);
    if (!result.rowCount) throw new NotFoundException('Không tìm thấy đơn.');
    return this.detail(result.rows[0], true);
  }
  async act(id: string, action: ActionInput, adminId: string) {
    const client = await this.db.pool.connect();
    const requestHash = hash(JSON.stringify({ id, action }));
    try {
      await client.query('BEGIN');
      const result = await client.query('SELECT * FROM jingo_orders WHERE id=$1 FOR UPDATE', [id]);
      if (!result.rowCount) throw new NotFoundException('Không tìm thấy đơn.');
      const row = result.rows[0] as OrderRow;
      const prior = await client.query('SELECT request_hash FROM jingo_order_actions WHERE id=$1', [action.requestId]);
      if (prior.rowCount) {
        if (prior.rows[0].request_hash !== requestHash) throw new ConflictException('Mã thao tác đã dùng.');
        await client.query('COMMIT'); return this.get(id);
      }
      if (row.version !== action.version) throw new ConflictException('Đơn đã thay đổi. Tải lại trước khi xử lý.');
      if (row.booking_status === 'CANCELLED') throw new ConflictException('Đơn đã hủy.');
      if (action.action === 'CONFIRM') {
        if (row.booking_status !== 'REQUESTED') throw new ConflictException('Đơn đã được xác nhận.');
        await client.query("UPDATE jingo_orders SET booking_status='CONFIRMED', instructions=$2 WHERE id=$1", [id,action.instructions]);
      } else if (action.action === 'CANCEL') {
        if (row.payment_status === 'PAID') throw new ConflictException('Đơn đã thu tiền cần quy trình hoàn tiền riêng; không thể hủy trực tiếp.');
        await client.query("UPDATE jingo_orders SET booking_status='CANCELLED' WHERE id=$1", [id]);
      } else if (action.action === 'PAY') {
        if (row.booking_status !== 'CONFIRMED' || row.payment_status === 'PAID') throw new ConflictException('Chỉ xác nhận thu tiền một lần cho đơn đã xác nhận.');
        if (action.amount !== row.snapshot.total) throw new BadRequestException('Số tiền phải đúng tổng đơn. Thanh toán thiếu/thừa cần xử lý riêng.');
        await client.query('INSERT INTO jingo_order_payments(id,order_id,amount,reference,admin_id) VALUES ($1,$2,$3,$4,$5)', [randomUUID(), id, action.amount, action.reference.toUpperCase(), adminId]);
        await client.query("UPDATE jingo_orders SET payment_status='PAID' WHERE id=$1", [id]);
      } else {
        if (row.booking_status !== 'CONFIRMED' || row.payment_status !== 'PAID') throw new ConflictException('Chỉ giao vé sau khi xác nhận đơn và thu đủ tiền.');
        const existing = await client.query('SELECT covers FROM jingo_order_tickets WHERE order_id=$1', [id]);
        const issued = existing.rows.reduce((sum, ticket) => sum + ticket.covers, 0);
        const needed = row.snapshot.lines.reduce((sum, line) => sum + line.quantity, 0);
        if (issued + action.tickets.reduce((sum, ticket) => sum + ticket.covers, 0) > needed) throw new BadRequestException('Số khách được cấp vé vượt số khách trong đơn.');
        for (const ticket of action.tickets) await client.query('INSERT INTO jingo_order_tickets(id,order_id,code,code_hash,kind,covers,note) VALUES ($1,$2,$3,$4,$5,$6,$7)',
          [randomUUID(), id, ticket.code, hash(ticket.code), ticket.kind, ticket.covers, ticket.note]);
      }
      await client.query('UPDATE jingo_orders SET version=version+1 WHERE id=$1', [id]);
      await client.query('INSERT INTO jingo_order_actions(id,order_id,request_hash,admin_id,action,note) VALUES ($1,$2,$3,$4,$5,$6)', [action.requestId,id,requestHash,adminId,action.action,action.note]);
      await client.query('INSERT INTO jingo_audit(id,admin_id,action,entity_id) VALUES ($1,$2,$3,$4)', [randomUUID(),adminId,`order.${action.action.toLowerCase()}`,id]);
      await client.query('COMMIT');
    } catch(e) { await client.query('ROLLBACK'); if ((e as { code?: string }).code === '23505') throw new ConflictException('Mã vé, mã giao dịch hoặc mã thao tác đã được dùng.'); throw e; }
    finally { client.release(); }
    return this.get(id);
  }
}
