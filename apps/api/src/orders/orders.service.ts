import { BadRequestException, ConflictException, Injectable, NotFoundException,ForbiddenException } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.module';
import { ManagedProduct } from '../admin/product.schema';
import { calculateQuote } from '../pricing/pricing';
import { ActionInput, OrderInput } from './orders.schema';
import{PartnerAccount,PriceGroup}from'../partners/partners.schema';
import{applyNetPricing}from'../partners/net-pricing';
import{ledgerRows,creditSummary,checkCredit}from'../partners/credit';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export interface OrderSnapshot { productId: string; productName: string; variantName: string; date: string; total: number; demo: boolean; lines: { customerType: string; quantity: number; unitPrice: number; subtotal: number }[]; conditions: object; policy: string }
interface OrderRow { id: string; code: string; snapshot: OrderSnapshot; contact: object; instructions: string; booking_status: string; payment_status: string; version: number; created_at: Date; request_hash: string }
@Injectable()
export class OrdersService {
  constructor(private readonly db: DatabaseService) {}
  async create(input: OrderInput,partnerId?:string) {
    const requestHash = hash(JSON.stringify(partnerId?{partnerId,input}:input));
    const client = await this.db.pool.connect();
    try {
      await client.query('BEGIN');
      const prior = await client.query('SELECT id,code,request_hash FROM jingo_orders WHERE request_id=$1', [input.requestId]);
      if (prior.rowCount) {
        if (prior.rows[0].request_hash !== requestHash) throw new ConflictException('Yêu cầu này đã được dùng với nội dung khác.');
        await client.query('COMMIT'); return { code: prior.rows[0].code, accessKey: input.accessKey };
      }
      let group:PriceGroup|undefined;
      if(partnerId){const owner=await client.query('SELECT data FROM jingo_partners WHERE id=$1 FOR UPDATE',[partnerId]);const account=owner.rows[0]?.data as PartnerAccount|undefined;if(!account||account.status!=='ACTIVE')throw new ForbiddenException('CTV không được tạo đơn mới.');const price=await client.query('SELECT data,version FROM jingo_price_groups WHERE id=$1 FOR SHARE',[account.groupId]);if(!price.rowCount)throw new BadRequestException('Không tìm thấy bảng giá CTV.');group={...price.rows[0].data,version:price.rows[0].version};}
      const result = await client.query('SELECT data FROM jingo_products WHERE id=$1 FOR SHARE', [input.productId]);
      const product = result.rows[0]?.data as ManagedProduct | undefined;
      if (!product || product.status !== 'PUBLISHED') throw new NotFoundException('Sản phẩm chưa mở bán.');
      if (product.demo) throw new BadRequestException('Sản phẩm minh họa không nhận đơn.');
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year:'numeric',month:'2-digit',day:'2-digit' }).format(new Date());
      if (input.date < today) throw new BadRequestException('Ngày sử dụng đã qua.');
      let quote;
      try { quote = calculateQuote(product, input.variantId, input.date, input.quantities, product.rules, product.closures); }
      catch (e) { throw new BadRequestException(e instanceof Error ? e.message : 'Không thể lấy giá.'); }
      if(group)quote=applyNetPricing(quote,group);
      if (quote.total !== input.expectedTotal) throw new ConflictException('Giá vừa thay đổi. Vui lòng kiểm tra giá mới trước khi gửi.');
      const variant = product.variants.find(v => v.id === input.variantId)!;
      const snapshot: OrderSnapshot = { productId: product.id, productName: product.name, variantName: variant.name, date: input.date,
        total: quote.total, lines: quote.lines, demo: false, conditions: variant.conditions || {},
        policy: 'Yêu cầu đặt cần JinGo xác nhận nguồn vé/chỗ. Chưa giữ chỗ hoặc bảo đảm có vé. Chỉ chuyển khoản sau khi JinGo xác nhận và cung cấp hướng dẫn. Chính sách đổi/hủy do JinGo xác nhận với nhà cung cấp trước khi bạn thanh toán.' };
      const code = 'JG' + randomBytes(5).toString('hex').toUpperCase();
      const id=randomUUID();
      await client.query('INSERT INTO jingo_orders(id,code,request_id,request_hash,access_hash,snapshot,contact) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [id, code, input.requestId, requestHash, hash(input.accessKey), JSON.stringify(snapshot),JSON.stringify(input.contact)]);
      if(partnerId)await client.query('INSERT INTO jingo_partner_orders(order_id,partner_id)VALUES($1,$2)',[id,partnerId]);
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
    const owner=await client.query('SELECT p.data FROM jingo_partner_orders o JOIN jingo_partners p ON p.id=o.partner_id WHERE o.order_id=$1',[row.id]);
    const partner=owner.rows[0]?.data as PartnerAccount|undefined;
    return { ...response, contact: row.contact, payments: payments.rows, history: history.rows,...(partner?{partner:{id:partner.id,name:partner.name,creditEnabled:partner.creditEnabled}}:{}) };
  }
  async lookup(code: string, accessKey: string) {
    const result = await this.db.pool.query('SELECT * FROM jingo_orders WHERE code=$1 AND access_hash=$2', [code, hash(accessKey)]);
    if (!result.rowCount) throw new NotFoundException('Không tìm thấy đơn hoặc khóa tra cứu không đúng.');
    if((await this.db.pool.query('SELECT order_id FROM jingo_partner_orders WHERE order_id=$1',[result.rows[0].id])).rowCount)throw new NotFoundException('Đơn CTV chỉ tra cứu trong tài khoản CTV.');
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
  async act(id: string, action: ActionInput, adminId: string,partnerId?:string) {
    const client = await this.db.pool.connect();
    const requestHash = hash(JSON.stringify({ id, action }));
    try {
      await client.query('BEGIN');
      const result = await client.query('SELECT * FROM jingo_orders WHERE id=$1 FOR UPDATE', [id]);
      if (!result.rowCount) throw new NotFoundException('Không tìm thấy đơn.');
      const row = result.rows[0] as OrderRow;
      const owner=await client.query('SELECT partner_id FROM jingo_partner_orders WHERE order_id=$1',[id]);
      if(partnerId&&(action.action!=='CREDIT'||owner.rows[0]?.partner_id!==partnerId))throw new NotFoundException('Không tìm thấy đơn CTV.');
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
        if (row.payment_status !== 'UNPAID') throw new ConflictException('Đơn đã thu tiền hoặc ghi công nợ cần quy trình hoàn riêng; không thể hủy trực tiếp.');
        await client.query("UPDATE jingo_orders SET booking_status='CANCELLED' WHERE id=$1", [id]);
      } else if (action.action === 'PAY') {
        if (row.booking_status !== 'CONFIRMED' || row.payment_status !== 'UNPAID') throw new ConflictException('Đơn đã xác nhận và chưa được thu tiền/ghi công nợ mới được thu tiền.');
        if (action.amount !== row.snapshot.total) throw new BadRequestException('Số tiền phải đúng tổng đơn. Thanh toán thiếu/thừa cần xử lý riêng.');
        await client.query('INSERT INTO jingo_payment_references(reference,kind,entity_id,amount)VALUES($1,$2,$3,$4)',[action.reference.toUpperCase(),'ORDER_PAYMENT',id,action.amount]);
        await client.query('INSERT INTO jingo_order_payments(id,order_id,amount,reference,admin_id) VALUES ($1,$2,$3,$4,$5)', [randomUUID(), id, action.amount, action.reference.toUpperCase(), adminId]);
        await client.query("UPDATE jingo_orders SET payment_status='PAID' WHERE id=$1", [id]);
      } else if(action.action==='CREDIT'){
        if(row.booking_status!=='CONFIRMED'||row.payment_status!=='UNPAID'||!owner.rowCount)throw new ConflictException('Chỉ ghi công nợ cho đơn CTV đã xác nhận và chưa thanh toán.');
        const accountRow=await client.query('SELECT data FROM jingo_partners WHERE id=$1 FOR UPDATE',[owner.rows[0].partner_id]);const account=accountRow.rows[0]?.data as PartnerAccount|undefined;
        if(!account||account.status!=='ACTIVE'||!account.creditEnabled)throw new ForbiddenException('CTV chưa được dùng công nợ.');
        const entries=await ledgerRows(client,account.id);checkCredit(creditSummary(entries,account.creditLimit),row.snapshot.total);
        const due=new Date(Date.now()+account.creditDays*24*3600_000);
        await client.query('INSERT INTO jingo_partner_ledger(id,partner_id,order_id,kind,amount,reference,note,actor_id,request_hash,due_at)VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[action.requestId,account.id,id,'CHARGE',row.snapshot.total,row.code,`Ghi công nợ đơn ${row.code}`,adminId,requestHash,due]);
        await client.query("UPDATE jingo_orders SET payment_status='CREDIT' WHERE id=$1",[id]);
      } else {
        if (row.booking_status !== 'CONFIRMED' || !['PAID','CREDIT'].includes(row.payment_status)) throw new ConflictException('Chỉ giao vé sau khi xác nhận đơn và thu đủ tiền hoặc ghi công nợ.');
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
  async partnerList(partnerId:string){return(await this.db.pool.query('SELECT o.id,o.code,o.snapshot,o.contact,o.booking_status,o.payment_status,o.created_at,o.version FROM jingo_orders o JOIN jingo_partner_orders p ON p.order_id=o.id WHERE p.partner_id=$1 ORDER BY o.created_at DESC LIMIT 200',[partnerId])).rows;}
  async partnerGet(id:string,partnerId:string){const result=await this.db.pool.query('SELECT o.* FROM jingo_orders o JOIN jingo_partner_orders p ON p.order_id=o.id WHERE o.id=$1 AND p.partner_id=$2',[id,partnerId]);if(!result.rowCount)throw new NotFoundException('Không tìm thấy đơn.');return{...await this.detail(result.rows[0],false),contact:result.rows[0].contact};}
  async createShare(id:string,partnerId:string,requestId:string,accessKey:string){const order=await this.partnerGet(id,partnerId);const previous=await this.db.pool.query('SELECT order_id,access_hash FROM jingo_partner_shares WHERE id=$1',[requestId]);if(previous.rowCount){if(previous.rows[0].order_id!==id||previous.rows[0].access_hash!==hash(accessKey))throw new ConflictException('Mã yêu cầu đã dùng.');return{code:order.code,accessKey};}try{await this.db.pool.query('INSERT INTO jingo_partner_shares(id,order_id,access_hash)VALUES($1,$2,$3)',[requestId,id,hash(accessKey)]);}catch(e){if((e as{code?:string}).code==='23505')throw new ConflictException('Mã chia sẻ đã dùng.');throw e;}return{code:order.code,accessKey};}
  async deliveryLookup(code:string,key:string){const result=await this.db.pool.query('SELECT o.* FROM jingo_orders o JOIN jingo_partner_shares s ON s.order_id=o.id WHERE o.code=$1 AND s.access_hash=$2',[code,hash(key)]);if(!result.rowCount)throw new NotFoundException('Không tìm thấy vé.');const row=result.rows[0]as OrderRow;const detail=await this.detail(row,false);return{code:row.code,productName:row.snapshot.productName,variantName:row.snapshot.variantName,date:row.snapshot.date,bookingStatus:row.booking_status,totalGuests:detail.totalGuests,deliveredGuests:detail.deliveredGuests,tickets:detail.tickets};}
}
