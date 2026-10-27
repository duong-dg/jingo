import{ShiftsService}from'../shifts/shifts.module';
import{SupplyService}from'../supply/supply.module';
import{VouchersService}from'../vouchers/vouchers.module';
import{InventoryService}from'../inventory/inventory.module';
import{MailService}from'../mail/mail.module';
import{translated,localizeProduct}from'../content/translations';
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
export interface OrderSnapshot {discount?:{code:string;amount:number;subtotal:number};variantId?:string;timeSlot?:{id:string;start:string;end?:string;requiresSelection?:boolean}; locale?:string; productId: string; productName: string; variantName: string; date: string; total: number; demo: boolean; lines: { customerType: string; quantity: number; unitPrice: number; subtotal: number }[]; conditions: object; policy: string }
interface OrderRow { id: string; code: string; snapshot: OrderSnapshot; contact: object; instructions: string; booking_status: string; payment_status: string; version: number; created_at: Date; request_hash: string }
@Injectable()
export class OrdersService {
  constructor(private readonly db: DatabaseService,private readonly mail:MailService,private readonly inventory:InventoryService,private readonly vouchers:VouchersService,private readonly supply:SupplyService,private readonly shifts:ShiftsService) {}
  private async checkPosStaff(client:Pick<PoolClient,'query'>,staffId:string,counterId:string,permission:string){const result=await client.query('SELECT data FROM jingo_pos_users WHERE id=$1 FOR SHARE',[staffId]);const user=result.rows[0]?.data;if(!user||user.status!=='ACTIVE'||!user.counterIds.includes(counterId)||!user.permissions.includes(permission))throw new ForbiddenException('Quyền hoặc quầy được gán đã thay đổi. Đăng nhập lại để tiếp tục.');}
  async create(input: OrderInput,partnerId?:string,pos?:{counterId:string;adminId:string;staffId?:string}) {
    if(input.voucherCode&&(partnerId||pos))throw new BadRequestException('Mã giảm giá chỉ dùng cho đơn web bán lẻ.');
    const requestHash = hash(JSON.stringify(pos?{pos,input}:partnerId?{partnerId,input}:input));
    const client = await this.db.pool.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
      if(pos?.staffId)await this.checkPosStaff(client,pos.staffId,pos.counterId,'SELL');
      const prior = await client.query('SELECT id,code,request_hash FROM jingo_orders WHERE request_id=$1', [input.requestId]);
      if (prior.rowCount) {
        if (prior.rows[0].request_hash !== requestHash) throw new ConflictException('Yêu cầu này đã được dùng với nội dung khác.');
        await client.query('COMMIT'); return { code: prior.rows[0].code, accessKey: input.accessKey };
      }
      if(pos){const counter=await client.query('SELECT data FROM jingo_counters WHERE id=$1 FOR SHARE',[pos.counterId]);if(!counter.rowCount||counter.rows[0].data.status!=='ACTIVE')throw new BadRequestException('Chọn quầy đang hoạt động.');}
      let group:PriceGroup|undefined;
      if(partnerId){const owner=await client.query('SELECT data FROM jingo_partners WHERE id=$1 FOR UPDATE',[partnerId]);const account=owner.rows[0]?.data as PartnerAccount|undefined;if(!account||account.status!=='ACTIVE')throw new ForbiddenException('CTV không được tạo đơn mới.');const price=await client.query('SELECT data,version FROM jingo_price_groups WHERE id=$1 FOR SHARE',[account.groupId]);if(!price.rowCount)throw new BadRequestException('Không tìm thấy bảng giá CTV.');group={...price.rows[0].data,version:price.rows[0].version};}
      const result = await client.query('SELECT data FROM jingo_products WHERE id=$1 FOR UPDATE', [input.productId]);
      const lockedPrior=await client.query('SELECT code,request_hash FROM jingo_orders WHERE request_id=$1',[input.requestId]);if(lockedPrior.rowCount){if(lockedPrior.rows[0].request_hash!==requestHash)throw new ConflictException('Yêu cầu này đã được dùng với nội dung khác.');await client.query('COMMIT');return{code:lockedPrior.rows[0].code,accessKey:input.accessKey};}
      const product = result.rows[0]?.data as ManagedProduct | undefined;
      if (!product || product.status !== 'PUBLISHED') throw new NotFoundException('Sản phẩm chưa mở bán.');
      if (product.demo) throw new BadRequestException('Sản phẩm minh họa không nhận đơn.');
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year:'numeric',month:'2-digit',day:'2-digit' }).format(new Date());
      if (input.date < today) throw new BadRequestException('Ngày sử dụng đã qua.');
      let quote;
      try { quote = calculateQuote(product, input.variantId, input.date, input.quantities, product.rules, product.closures,input.slotId); }
      catch (e) { throw new BadRequestException(e instanceof Error ? e.message : 'Không thể lấy giá.'); }
      if(group)quote=applyNetPricing(quote,group);
      const quantity=quote.lines.reduce((sum,line)=>sum+line.quantity,0);await this.inventory.check(product.id,input.variantId,input.date,quote.timeSlot?.id||'',quantity,client);
      const discount=input.voucherCode?await this.vouchers.discount(input.voucherCode,quote.total,client,true):null;const netTotal=quote.total-(discount?.amount||0);
      if (netTotal !== input.expectedTotal) throw new ConflictException('Giá vừa thay đổi. Vui lòng kiểm tra giá mới trước khi gửi.');
      if(input.locale==='en'&&!translated('PRODUCT',product))throw new ConflictException('English content has changed. Please refresh before booking.');const view=input.locale==='en'?localizeProduct(product):product;const variant = view.variants.find((v:{id:string}) => v.id === input.variantId)!;
      const snapshot: OrderSnapshot = {...(quote.timeSlot?{timeSlot:quote.timeSlot}:{}), productId: product.id,variantId:input.variantId, ...(input.locale?{locale:input.locale}:{}),productName: view.name, variantName: variant.name, date: input.date,
        ...(discount?{discount:{code:discount.code,amount:discount.amount,subtotal:discount.subtotal}}:{}),total: netTotal, lines: quote.lines, demo: false, conditions: variant.conditions || {},
        policy: input.locale==='en'?'Your booking is recorded immediately. JinGo will send your tickets by email after processing. Booking confirmation does not mean payment has been received or tickets have been issued. Follow the payment instructions provided for your booking.':'Đơn đặt vé được ghi nhận ngay. JinGo sẽ gửi vé qua email sau khi xử lý. Xác nhận đặt vé không đồng nghĩa đã thanh toán hoặc đã xuất vé. Thanh toán theo hướng dẫn của đơn hàng.' };
      const code = 'JG' + randomBytes(5).toString('hex').toUpperCase();
      const id=randomUUID();const customerAccessKey=pos?randomBytes(32).toString('hex'):input.accessKey;
      await client.query('INSERT INTO jingo_orders(id,code,request_id,request_hash,access_hash,snapshot,contact,booking_status) VALUES ($1,$2,$3,$4,$5,$6,$7,\'CONFIRMED\')',
        [id, code, input.requestId, requestHash, hash(customerAccessKey), JSON.stringify(snapshot),JSON.stringify(input.contact)]);
      await this.inventory.allocate(client,id,product.id,input.variantId,input.date,quote.timeSlot?.id||'',quantity);
      if(discount)await this.vouchers.allocate(client,id,discount.id);
      if(pos){await client.query('INSERT INTO jingo_pos_orders(order_id,counter_id,admin_id)VALUES($1,$2,$3)',[id,pos.counterId,pos.adminId]);await client.query('INSERT INTO jingo_audit(id,admin_id,action,entity_id)VALUES($1,$2,$3,$4)',[randomUUID(),pos.adminId,'pos.order-create',id]);}
      if(partnerId)await client.query('INSERT INTO jingo_partner_orders(order_id,partner_id)VALUES($1,$2)',[id,partnerId]);else{await this.mail.register(client,id,customerAccessKey);await this.mail.enqueue(client,id,'CREATED',1);}
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
    const payments = await client.query('SELECT p.amount,p.reference,p.created_at,m.method FROM jingo_order_payments p LEFT JOIN jingo_payment_methods m ON m.payment_id=p.id WHERE p.order_id=$1', [row.id]);
    const pos=await client.query('SELECT p.counter_id,c.data FROM jingo_pos_orders p JOIN jingo_counters c ON c.id=p.counter_id WHERE p.order_id=$1',[row.id]);
    const history = await client.query('SELECT action,note,created_at FROM jingo_order_actions WHERE order_id=$1 ORDER BY created_at', [row.id]);
    const owner=await client.query('SELECT p.data FROM jingo_partner_orders o JOIN jingo_partners p ON p.id=o.partner_id WHERE o.order_id=$1',[row.id]);
    const partner=owner.rows[0]?.data as PartnerAccount|undefined;
    const archived=await client.query('SELECT reason,created_at FROM jingo_order_archives WHERE order_id=$1',[row.id]);
    return { ...response,channel:pos.rowCount?'POS':partner?'CTV':'WEB',counter:pos.rows[0]?{id:pos.rows[0].counter_id,name:pos.rows[0].data.name}:null,archived:!!archived.rowCount,archiveReason:archived.rows[0]?.reason||'', contact: row.contact, payments: payments.rows, history: history.rows,...(partner?{partner:{id:partner.id,name:partner.name,creditEnabled:partner.creditEnabled}}:{}) };
  }
  async lookup(code: string, accessKey?: string, email?: string) {
    const result = accessKey?await this.db.pool.query('SELECT * FROM jingo_orders WHERE code=$1 AND access_hash=$2', [code, hash(accessKey)]):await this.db.pool.query('SELECT * FROM jingo_orders WHERE code=$1',[code]);
    if(!accessKey&&(!email||result.rows[0]?.contact?.email?.trim().toLowerCase()!==email.trim().toLowerCase()))throw new NotFoundException('Không tìm thấy đơn hàng.');
    if (!result.rowCount) throw new NotFoundException('Không tìm thấy đơn hoặc khóa tra cứu không đúng.');
    if((await this.db.pool.query('SELECT order_id FROM jingo_partner_orders WHERE order_id=$1',[result.rows[0].id])).rowCount)throw new NotFoundException('Đơn CTV chỉ tra cứu trong tài khoản CTV.');
    const response=await this.detail(result.rows[0],false);if(!accessKey&&(await this.db.pool.query('SELECT order_id FROM jingo_pos_orders WHERE order_id=$1',[result.rows[0].id])).rowCount)return{...response,tickets:[],ticketAccess:'EMAIL_LINK' as const};return response;
  }
  async list(archived=false) {
    const result = await this.db.pool.query('SELECT o.id,o.code,o.snapshot,o.contact,o.booking_status,o.payment_status,o.version,o.created_at FROM jingo_orders o LEFT JOIN jingo_order_archives a ON a.order_id=o.id WHERE '+(archived?'a.order_id IS NOT NULL':'a.order_id IS NULL')+' ORDER BY o.created_at DESC LIMIT 200');
    return result.rows;
  }
  async get(id: string) {
    const result = await this.db.pool.query('SELECT * FROM jingo_orders WHERE id=$1', [id]);
    if (!result.rowCount) throw new NotFoundException('Không tìm thấy đơn.');
    return this.detail(result.rows[0], true);
  }
  async act(id: string, action: ActionInput, adminId: string,partnerId?:string,staffId?:string) {
    const client = await this.db.pool.connect();
    const requestHash = hash(JSON.stringify({ id, action }));
    try {
      await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
      const result = await client.query('SELECT * FROM jingo_orders WHERE id=$1 FOR UPDATE', [id]);
      if (!result.rowCount) throw new NotFoundException('Không tìm thấy đơn.');
      const row = result.rows[0] as OrderRow;
      if(action.action==='PAY')await this.shifts.lockCounterForOrder(client,id);
      if(staffId){const pos=await client.query('SELECT counter_id FROM jingo_pos_orders WHERE order_id=$1',[id]);const permission=action.action==='PAY'?'COLLECT':action.action==='DELIVER'?'DELIVER':action.action==='CANCEL'?'CANCEL':null;if(!permission||!pos.rowCount)throw new ForbiddenException('Không được xử lý đơn này tại quầy.');await this.checkPosStaff(client,staffId,pos.rows[0].counter_id,permission);}
      const owner=await client.query('SELECT partner_id FROM jingo_partner_orders WHERE order_id=$1',[id]);
      if(partnerId&&(action.action!=='CREDIT'||owner.rows[0]?.partner_id!==partnerId))throw new NotFoundException('Không tìm thấy đơn CTV.');
      const prior = await client.query('SELECT request_hash FROM jingo_order_actions WHERE id=$1', [action.requestId]);
      if (prior.rowCount) {
        if (prior.rows[0].request_hash !== requestHash) throw new ConflictException('Mã thao tác đã dùng.');
        await client.query('COMMIT'); return this.get(id);
      }
      if (row.version !== action.version) throw new ConflictException('Đơn đã thay đổi. Tải lại trước khi xử lý.');
      const archived=await client.query('SELECT order_id FROM jingo_order_archives WHERE order_id=$1',[id]);
      if(archived.rowCount&&action.action!=='RESTORE')throw new ConflictException('Đơn đang ở thùng rác. Khôi phục trước khi xử lý.');
      if(action.action==='RESTORE'&&!archived.rowCount)throw new ConflictException('Đơn chưa bị xóa / lưu trữ.');
      if (row.booking_status === 'CANCELLED'&&!['ARCHIVE','RESTORE'].includes(action.action)) throw new ConflictException('Đơn đã hủy.');
      if(action.action==='ARCHIVE'){
        await client.query('INSERT INTO jingo_order_archives(order_id,archived_by,reason)VALUES($1,$2,$3)',[id,adminId,action.note]);
        if(row.payment_status==='UNPAID'){const issued=await client.query('SELECT id FROM jingo_order_tickets WHERE order_id=$1',[id]);if(!issued.rowCount&&row.booking_status!=='CANCELLED'){await client.query("UPDATE jingo_orders SET booking_status='CANCELLED' WHERE id=$1",[id]);await this.inventory.release(client,id);await this.vouchers.release(client,id);await this.supply.release(client,id);await this.mail.enqueue(client,id,'CANCEL',row.version+1);}}
      }else if(action.action==='RESTORE'){await client.query('DELETE FROM jingo_order_archives WHERE order_id=$1',[id]);
      }else if (action.action === 'CONFIRM') {
        if (row.booking_status !== 'REQUESTED') throw new ConflictException('Đơn đã được xác nhận.');
        await client.query("UPDATE jingo_orders SET booking_status='CONFIRMED', instructions=$2 WHERE id=$1", [id,action.instructions]);
      } else if(action.action==='INSTRUCTIONS'){
        if(row.booking_status!=='CONFIRMED')throw new ConflictException('Chỉ cập nhật hướng dẫn cho đơn đã đặt.');
        await client.query('UPDATE jingo_orders SET instructions=$2 WHERE id=$1',[id,action.instructions]);
      } else if (action.action === 'CANCEL') {
        if (row.payment_status !== 'UNPAID') throw new ConflictException('Đơn đã thu tiền hoặc ghi công nợ cần quy trình hoàn riêng; không thể hủy trực tiếp.');
        await client.query("UPDATE jingo_orders SET booking_status='CANCELLED' WHERE id=$1", [id]);await this.inventory.release(client,id);await this.vouchers.release(client,id);await this.supply.release(client,id);
      } else if (action.action === 'PAY') {
        if (row.booking_status !== 'CONFIRMED' || row.payment_status !== 'UNPAID') throw new ConflictException('Đơn đã xác nhận và chưa được thu tiền/ghi công nợ mới được thu tiền.');
        if (action.amount !== row.snapshot.total) throw new BadRequestException('Số tiền phải đúng tổng đơn. Thanh toán thiếu/thừa cần xử lý riêng.');
        const reference=action.method==='CASH'?'CASH:'+action.requestId:action.reference.toUpperCase();const paymentId=randomUUID();
        await client.query('INSERT INTO jingo_payment_references(reference,kind,entity_id,amount)VALUES($1,$2,$3,$4)',[reference,'ORDER_PAYMENT',id,action.amount]);
        await client.query('INSERT INTO jingo_order_payments(id,order_id,amount,reference,admin_id) VALUES ($1,$2,$3,$4,$5)', [paymentId, id, action.amount, reference, adminId]);
        await client.query('INSERT INTO jingo_payment_methods(payment_id,method)VALUES($1,$2)',[paymentId,action.method||'BANK']);
        await this.shifts.attachPayment(client,id,paymentId);
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
        const hashes=action.tickets.map(ticket=>hash(ticket.code));
        if(new Set(hashes).size!==hashes.length)throw new BadRequestException('Danh sách có mã vé trùng. Kiểm tra lại trước khi giao.');
        const used=await client.query('SELECT id FROM jingo_order_tickets WHERE code_hash IN ('+hashes.map((_,index)=>'$'+(index+1)).join(',')+')',hashes);
        if(used.rowCount)throw new ConflictException('Có mã vé đã được giao. Kiểm tra lại danh sách trước khi lưu.');
        await this.supply.forDelivery(client,row,adminId);
        for (const ticket of action.tickets) await client.query('INSERT INTO jingo_order_tickets(id,order_id,code,code_hash,kind,covers,note) VALUES ($1,$2,$3,$4,$5,$6,$7)',
          [randomUUID(), id, ticket.code, hash(ticket.code), ticket.kind, ticket.covers, ticket.note]);
      }
      await client.query('UPDATE jingo_orders SET version=version+1 WHERE id=$1', [id]);
      await client.query('INSERT INTO jingo_order_actions(id,order_id,request_hash,admin_id,action,note) VALUES ($1,$2,$3,$4,$5,$6)', [action.requestId,id,requestHash,adminId,action.action,action.note]);
      await client.query('INSERT INTO jingo_audit(id,admin_id,action,entity_id) VALUES ($1,$2,$3,$4)', [randomUUID(),adminId,`order.${action.action.toLowerCase()}`,id]);
      if(!['ARCHIVE','RESTORE'].includes(action.action))await this.mail.enqueue(client,id,action.action,row.version+1);await client.query('COMMIT');
    } catch(e) { await client.query('ROLLBACK'); if ((e as { code?: string }).code === '23505') throw new ConflictException('Mã vé, mã giao dịch hoặc mã thao tác đã được dùng.'); throw e; }
    finally { client.release(); }
    return this.get(id);
  }
  async partnerList(partnerId:string){return(await this.db.pool.query('SELECT o.id,o.code,o.snapshot,o.contact,o.booking_status,o.payment_status,o.created_at,o.version FROM jingo_orders o JOIN jingo_partner_orders p ON p.order_id=o.id WHERE p.partner_id=$1 ORDER BY o.created_at DESC LIMIT 200',[partnerId])).rows;}
  async partnerGet(id:string,partnerId:string){const result=await this.db.pool.query('SELECT o.* FROM jingo_orders o JOIN jingo_partner_orders p ON p.order_id=o.id WHERE o.id=$1 AND p.partner_id=$2',[id,partnerId]);if(!result.rowCount)throw new NotFoundException('Không tìm thấy đơn.');return{...await this.detail(result.rows[0],false),contact:result.rows[0].contact};}
  async createShare(id:string,partnerId:string,requestId:string,accessKey:string){const order=await this.partnerGet(id,partnerId);const previous=await this.db.pool.query('SELECT order_id,access_hash FROM jingo_partner_shares WHERE id=$1',[requestId]);if(previous.rowCount){if(previous.rows[0].order_id!==id||previous.rows[0].access_hash!==hash(accessKey))throw new ConflictException('Mã yêu cầu đã dùng.');return{code:order.code,accessKey};}try{await this.db.pool.query('INSERT INTO jingo_partner_shares(id,order_id,access_hash)VALUES($1,$2,$3)',[requestId,id,hash(accessKey)]);}catch(e){if((e as{code?:string}).code==='23505')throw new ConflictException('Mã chia sẻ đã dùng.');throw e;}return{code:order.code,accessKey};}
  async deliveryLookup(code:string,key:string){const result=await this.db.pool.query('SELECT o.* FROM jingo_orders o JOIN jingo_partner_shares s ON s.order_id=o.id WHERE o.code=$1 AND s.access_hash=$2',[code,hash(key)]);if(!result.rowCount)throw new NotFoundException('Không tìm thấy vé.');const row=result.rows[0]as OrderRow;const detail=await this.detail(row,false);return{code:row.code,productName:row.snapshot.productName,variantName:row.snapshot.variantName,date:row.snapshot.date,...(row.snapshot.timeSlot?{timeSlot:row.snapshot.timeSlot}:{}),bookingStatus:row.booking_status,totalGuests:detail.totalGuests,deliveredGuests:detail.deliveredGuests,tickets:detail.tickets};}
}
