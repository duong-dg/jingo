import{supplierQrImage}from'./supplier-qr';
import{brandedTicketPdf}from'./branded-ticket';import{PosModule}from'../pos/pos.module';import{PosAuthService}from'../pos/pos-auth.service';import type{PosActor}from'../pos/pos.schema';
import { BadRequestException, Body, ConflictException, Controller, Get, HttpException, HttpCode, Injectable, Module, NotFoundException, Param, Post, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { z } from 'zod';
import { AdminGuard, AuthModule } from '../admin/auth.module';
import { DatabaseService } from '../database/database.module';
import { MailModule, MailService } from '../mail/mail.module';
import { OrdersModule } from './orders.module';
import { OrdersService } from './orders.service';
import { lookupInput } from './orders.schema';
import { PartnersModule } from '../partners/partners.module';
import { PartnerAuthService } from '../partners/partner-auth.service';
import type { PoolClient } from 'pg';

const fields = 'id,ticket_id,name,mime,bytes,created_at,revoked_at';
type Upload = { buffer: Buffer; size: number; originalname: string };
function privateHeaders(res: Response) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
}
function send(res: Response, file: { data: Buffer; id: string; mime: string }) {
  privateHeaders(res);
  res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'");
  res.setHeader('Content-Type', file.mime);
  res.setHeader('Content-Disposition', `attachment; filename="jingo-ticket-${file.id}.${file.mime === 'application/pdf' ? 'pdf' : 'webp'}"`);
  res.send(file.data);
}

@Injectable()
export class TicketFilesService {
  private processing = false;
  constructor(private readonly db: DatabaseService, private readonly orders: OrdersService, private readonly mail: MailService) {}
  private path(id: string) { return join(resolve(process.env.MEDIA_DIR || 'data/media'), '.tickets', id + '.bin'); }
  async list(orderId: string) {
    if (!(await this.db.pool.query('SELECT id FROM jingo_orders WHERE id=$1', [orderId])).rowCount) throw new NotFoundException();
    return { data: (await this.db.pool.query(`SELECT ${fields} FROM jingo_ticket_files WHERE order_id=$1 ORDER BY created_at,id`, [orderId])).rows };
  }
  private async customer(body: unknown) {
    const input = lookupInput.safeParse(body);
    if (!input.success) throw new BadRequestException('Thông tin tra cứu không hợp lệ.');
    const order = await this.orders.lookup(input.data.code, input.data.accessKey, input.data.email);
    if (order.bookingStatus !== 'CONFIRMED' || (await this.db.pool.query('SELECT order_id FROM jingo_order_archives WHERE order_id=$1', [order.id])).rowCount) throw new NotFoundException('File vé không còn khả dụng.');
    return order;
  }
  async customerList(body: unknown) {
    const order = await this.customer(body);
    const all = await this.list(order.id), tickets = new Set(order.tickets.map(t => t.id));
    return { data: all.data.filter(f => !f.revoked_at && tickets.has(f.ticket_id)) };
  }
  async download(id: string, orderId: string, customerBody?: unknown) {
    if (!z.uuid().safeParse(id).success) throw new NotFoundException();
    const file = (await this.db.pool.query('SELECT * FROM jingo_ticket_files WHERE id=$1 AND order_id=$2', [id, orderId])).rows[0];
    if (!file) throw new NotFoundException('Không tìm thấy file vé.');
    if (customerBody !== undefined) {
      const order = await this.customer(customerBody);
      if (order.id !== file.order_id || file.revoked_at || !order.tickets.some(t => t.id === file.ticket_id)) throw new NotFoundException('Không tìm thấy file vé.');
    }
    try { return { id: file.id, mime: file.mime, data: await readFile(this.path(file.id)) }; }
    catch { throw new NotFoundException('Không tìm thấy file vé.'); }
  }
  async publicDownload(id: string, body: unknown) {
    const order = await this.customer(body);
    return this.download(id, order.id, body);
  }
  private async partnerOrder(orderId: string, partnerId: string, client: Pick<PoolClient, 'query'> = this.db.pool, lock = false) {
    const order = (await client.query('SELECT o.* FROM jingo_orders o JOIN jingo_partner_orders p ON p.order_id=o.id WHERE o.id=$1 AND p.partner_id=$2' + (lock ? ' FOR UPDATE' : ''), [orderId, partnerId])).rows[0];
    if (!order || order.booking_status !== 'CONFIRMED' || !['PAID', 'CREDIT'].includes(order.payment_status) || (await client.query('SELECT order_id FROM jingo_order_archives WHERE order_id=$1', [orderId])).rowCount) throw new NotFoundException('Không tìm thấy file của đơn CTV.');
    return order;
  }
  async partnerList(orderId: string, partnerId: string) {
    await this.partnerOrder(orderId, partnerId);
    return { data: (await this.db.pool.query(`SELECT ${fields},partner_shared,sharing_version FROM jingo_ticket_files WHERE order_id=$1 AND revoked_at IS NULL ORDER BY created_at,id`, [orderId])).rows };
  }
  async partnerDownload(id: string, orderId: string, partnerId: string) {
    await this.partnerOrder(orderId, partnerId);
    if (!(await this.db.pool.query('SELECT id FROM jingo_ticket_files WHERE id=$1 AND order_id=$2 AND revoked_at IS NULL', [id, orderId])).rowCount) throw new NotFoundException();
    return this.download(id, orderId);
  }
  async sharing(orderId: string, id: string, partnerId: string, body: unknown) {
    const parsed = z.object({ version: z.number().int().positive(), shared: z.boolean() }).strict().safeParse(body);
    if (!parsed.success) throw new BadRequestException('Kiểm tra quyền chia sẻ file.');
    const client = await this.db.pool.connect();
    try {
      await client.query('BEGIN'); await this.partnerOrder(orderId, partnerId, client, true);
      const row = (await client.query('SELECT sharing_version FROM jingo_ticket_files WHERE id=$1 AND order_id=$2 AND revoked_at IS NULL FOR UPDATE', [id, orderId])).rows[0];
      if (!row) throw new NotFoundException();
      if (row.sharing_version !== parsed.data.version) throw new ConflictException('Quyền tải đã thay đổi. Cập nhật danh sách file.');
      await client.query('UPDATE jingo_ticket_files SET partner_shared=$2,sharing_version=sharing_version+1 WHERE id=$1', [id, parsed.data.shared]);
      await client.query('INSERT INTO jingo_audit(id,admin_id,action,entity_id)VALUES($1,$2,$3,$4)', [randomUUID(), 'partner:' + partnerId, parsed.data.shared ? 'ticket-file.share' : 'ticket-file.unshare', id]);
      await client.query('COMMIT'); return { ok: true };
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  }
  private async sharedOrder(body: unknown) {
    const input = z.object({ code: z.string().regex(/^JG[A-F0-9]{10}$/), accessKey: z.string().regex(/^[a-f0-9]{64}$/) }).strict().safeParse(body);
    if (!input.success) throw new BadRequestException('Thông tin nhận vé không hợp lệ.');
    const order = await this.orders.shareOrder(input.data.code, input.data.accessKey);
    if (!['PAID', 'CREDIT'].includes(order.payment_status)) throw new NotFoundException();
    return order;
  }
  async sharedList(body: unknown) {
    const order = await this.sharedOrder(body);
    const rows = (await this.db.pool.query('SELECT id,ticket_id,mime,bytes,created_at FROM jingo_ticket_files WHERE order_id=$1 AND revoked_at IS NULL AND partner_shared=true ORDER BY created_at,id', [order.id])).rows;
    return { data: rows.map((row, i) => ({ ...row, name: `File vé ${i + 1}.${row.mime === 'application/pdf' ? 'pdf' : 'webp'}`, revoked_at: null })) };
  }
  async sharedDownload(id: string, body: unknown) {
    const order = await this.sharedOrder(body);
    if (!(await this.db.pool.query('SELECT id FROM jingo_ticket_files WHERE id=$1 AND order_id=$2 AND revoked_at IS NULL AND partner_shared=true', [id, order.id])).rowCount) throw new NotFoundException();
    return this.download(id, order.id);
  }
  async upload(orderId: string, body: unknown, file: Upload, actor: string, branded=false) {
    const input = z.object({ ticketId: z.uuid(), version: z.coerce.number().int().positive() }).strict().safeParse(body);
    if (!input.success || !file?.buffer || file.buffer.length > 10 * 1024 * 1024 || !file.buffer.length) throw new BadRequestException('Chọn mã vé và file PDF/JPG/PNG/WebP tối đa 10 MB.');
    if (this.processing) throw new HttpException('Đang xử lý file khác. Vui lòng thử lại.', 429);
    this.processing = true;
    const client = await this.db.pool.connect().catch(error => { this.processing = false; throw error; });
    let saved: string | undefined;
    try {
      let data: Buffer, mime: string;
      if (file.buffer.subarray(0, 5).toString() === '%PDF-') { data = file.buffer; mime = 'application/pdf'; }
      else {
        try {
          const image = sharp(file.buffer, { animated: false, limitInputPixels: 25_000_000 });
          if (!['jpeg', 'png', 'webp'].includes((await image.metadata()).format || '')) throw new Error();
          data = await image.rotate().webp({ lossless: true }).toBuffer(); mime = 'image/webp';
        } catch { throw new BadRequestException('Nội dung file không phải PDF/JPG/PNG/WebP hợp lệ.'); }
      }
      if (data.length > 10 * 1024 * 1024) throw new BadRequestException('File sau xử lý vượt quá 10 MB.');
      const hash = createHash('sha256').update(data).digest('hex');
      await client.query('BEGIN');
      const order = (await client.query('SELECT * FROM jingo_orders WHERE id=$1 FOR UPDATE', [orderId])).rows[0];
      if (!order) throw new NotFoundException();
      const partner = (await client.query('SELECT order_id FROM jingo_partner_orders WHERE order_id=$1', [orderId])).rowCount;
      if (order.booking_status !== 'CONFIRMED' || !(order.payment_status === 'PAID' || partner && order.payment_status === 'CREDIT') || (await client.query('SELECT order_id FROM jingo_order_archives WHERE order_id=$1', [orderId])).rowCount) throw new ConflictException('Chỉ gắn file cho đơn đã thanh toán hoặc công nợ CTV, đang hoạt động.');
      if (!(await client.query('SELECT id FROM jingo_order_tickets WHERE id=$1 AND order_id=$2', [input.data.ticketId, orderId])).rowCount) throw new NotFoundException('Mã vé không thuộc đơn.');
      const prior = (await client.query('SELECT id FROM jingo_ticket_files WHERE order_id=$1 AND ticket_id=$2 AND hash=$3 AND revoked_at IS NULL', [orderId, input.data.ticketId, hash])).rows[0];
      if (prior) { await client.query('COMMIT'); return { id: prior.id, duplicate: true }; }
      if (order.version !== input.data.version) throw new ConflictException('Đơn đã thay đổi. Tải lại trước khi đính kèm.');
      if (Number((await client.query('SELECT COUNT(*) AS total FROM jingo_ticket_files WHERE order_id=$1', [orderId])).rows[0].total) >= 50) throw new BadRequestException('Mỗi đơn tối đa 50 file kể cả file đã thu hồi.');
      const id = randomUUID();
      await mkdir(join(resolve(process.env.MEDIA_DIR || 'data/media'), '.tickets'), { recursive: true, mode: 0o700 });
      await writeFile(this.path(id), data, { flag: 'wx', mode: 0o600 }); saved = id;
      const name = file.originalname.replace(/[\\/\x00-\x1f\x7f]/g, '_').slice(0, 150) || 'Vé đính kèm';
      await client.query('INSERT INTO jingo_ticket_files(id,order_id,ticket_id,name,mime,bytes,hash)VALUES($1,$2,$3,$4,$5,$6,$7)', [id, orderId, input.data.ticketId, name, mime, data.length, hash]);
      await client.query('UPDATE jingo_orders SET version=version+1 WHERE id=$1', [orderId]);
      await client.query('INSERT INTO jingo_audit(id,admin_id,action,entity_id)VALUES($1,$2,$3,$4)', [randomUUID(), actor, 'ticket-file.attach', id]);
      await client.query('INSERT INTO jingo_order_actions(id,order_id,request_hash,admin_id,action,note)VALUES($1,$2,$3,$4,$5,$6)', [randomUUID(),orderId,hash,actor,'ATTACH_FILE','Đính kèm file: '+name]);
      if(branded)await client.query('UPDATE jingo_ticket_files SET partner_shared=true WHERE id=$1',[id]);
      await this.mail.enqueue(client, orderId, partner&&!branded?'DELIVER':'TICKET_READY', order.version + 1);
      await client.query('COMMIT'); saved = undefined;
      return { id, duplicate: false };
    } catch (error) {
      await client.query('ROLLBACK');
      if (saved) await unlink(this.path(saved)).catch(() => {});
      throw error;
    } finally { client.release(); this.processing = false; }
  }
  async branded(orderId:string,body:unknown,file:Upload|undefined,actor:string){
    const parsed=z.object({ticketId:z.uuid(),version:z.coerce.number().int().positive(),payload:z.string().max(2000).optional(),confirmed:z.literal('true'),page:z.coerce.number().int().min(1).max(50).default(1),qrNumber:z.coerce.number().int().min(1).max(10).default(1),preview:z.literal('true').optional()}).strict().safeParse(body);if(!parsed.success)throw new BadRequestException('Chọn mã vé và xác nhận QR gốc.');const input=parsed.data;
    if((!!input.payload)===(!!file?.buffer))throw new BadRequestException('Chỉ dùng một nguồn: nội dung QR gốc hoặc ảnh QR đã cắt.');if(file&&file.buffer.length>5*1024*1024)throw new BadRequestException('Ảnh QR tối đa 5 MB.');
    const order=await this.orders.get(orderId),ticket=order.tickets.find(t=>t.id===input.ticketId);if(!ticket)throw new NotFoundException('Mã vé không thuộc đơn.');if(order.version!==input.version)throw new ConflictException('Đơn đã thay đổi. Tải lại.');
    let data:Buffer;try{data=await brandedTicketPdf({code:ticket.code,product:order.snapshot.productName,variant:order.snapshot.variantName,date:order.snapshot.date,time:order.snapshot.timeSlot?order.snapshot.timeSlot.start+(order.snapshot.timeSlot.end?' - '+order.snapshot.timeSlot.end:''):undefined,covers:ticket.covers,note:ticket.note,payload:input.payload,image:file?.buffer?await supplierQrImage(file.buffer,input.page,input.qrNumber):undefined});}catch(e){throw new BadRequestException((e as Error).message);}
    if(input.preview)return{preview:data.toString('base64')};
    return this.upload(orderId,{ticketId:input.ticketId,version:input.version},{buffer:data,size:data.length,originalname:'JinGo-'+ticket.id+'.pdf'},actor,true);
  }
  private async posOrder(orderId:string,actor:PosActor){const pos=(await this.db.pool.query('SELECT counter_id FROM jingo_pos_orders WHERE order_id=$1',[orderId])).rows[0];if(!actor.permissions.includes('PRINT')||!pos||actor.role!=='ADMIN'&&!actor.counterIds.includes(pos.counter_id))throw new NotFoundException('Không tìm thấy vé được phép in.');const order=await this.orders.get(orderId);if(order.bookingStatus!=='CONFIRMED'||!['PAID','CREDIT'].includes(order.paymentStatus)||(await this.db.pool.query('SELECT order_id FROM jingo_order_archives WHERE order_id=$1',[orderId])).rowCount)throw new NotFoundException('Vé không còn khả dụng.');}
  async posList(orderId:string,actor:PosActor){await this.posOrder(orderId,actor);const all=await this.list(orderId);return{data:all.data.filter(f=>!f.revoked_at)};}
  async posDownload(orderId:string,id:string,actor:PosActor){await this.posOrder(orderId,actor);if(!(await this.db.pool.query('SELECT id FROM jingo_ticket_files WHERE order_id=$1 AND id=$2 AND revoked_at IS NULL',[orderId,id])).rowCount)throw new NotFoundException();return this.download(id,orderId);}
  async revoke(orderId: string, id: string, body: unknown, actor: string) {
    const input = z.object({ version: z.number().int().positive(), reason: z.string().trim().min(3).max(500) }).strict().safeParse(body);
    if (!input.success) throw new BadRequestException('Nhập lý do thu hồi file.');
    const client = await this.db.pool.connect();
    try {
      await client.query('BEGIN');
      const order = (await client.query('SELECT version FROM jingo_orders WHERE id=$1 FOR UPDATE', [orderId])).rows[0];
      const file = (await client.query('SELECT id,revoked_at FROM jingo_ticket_files WHERE id=$1 AND order_id=$2', [id, orderId])).rows[0];
      if (!order || !file) throw new NotFoundException();
      if (file.revoked_at) { await client.query('COMMIT'); return { ok: true }; }
      if (order.version !== input.data.version) throw new ConflictException('Đơn đã thay đổi. Tải lại trước khi thu hồi.');
      await client.query('UPDATE jingo_ticket_files SET revoked_at=now(),revoke_reason=$2 WHERE id=$1', [id, input.data.reason]);
      await client.query('UPDATE jingo_orders SET version=version+1 WHERE id=$1', [orderId]);
      await client.query('INSERT INTO jingo_audit(id,admin_id,action,entity_id)VALUES($1,$2,$3,$4)', [randomUUID(), actor, 'ticket-file.revoke', id]);
      await client.query('INSERT INTO jingo_order_actions(id,order_id,request_hash,admin_id,action,note)VALUES($1,$2,$3,$4,$5,$6)', [randomUUID(),orderId,id,actor,'REVOKE_FILE',input.data.reason]);
      await client.query('COMMIT'); return { ok: true };
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }
}

@Controller('admin/orders/:orderId/files') @UseGuards(AdminGuard)
class AdminTicketFilesController {
  constructor(private readonly files: TicketFilesService) {}
  @Get() list(@Param('orderId') orderId: string, @Res({ passthrough: true }) res: Response) { privateHeaders(res); return this.files.list(orderId); }
  @Post() @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 2 } }))
  upload(@Param('orderId') orderId: string, @Body() body: unknown, @UploadedFile() file: Upload, @Req() req: Request & { admin: { id: string } }) { return this.files.upload(orderId, body, file, req.admin.id); }
  @Post('branded') @UseInterceptors(FileInterceptor('file',{limits:{fileSize:5*1024*1024,files:1,fields:7}}))
  branded(@Param('orderId')orderId:string,@Body()body:unknown,@UploadedFile()file:Upload,@Req()req:Request&{admin:{id:string}}){return this.files.branded(orderId,body,file,req.admin.id);}
  @Get(':id/download') async download(@Param('orderId') orderId: string, @Param('id') id: string, @Res() res: Response) { send(res, await this.files.download(id, orderId)); }
  @Post(':id/revoke') revoke(@Param('orderId') orderId: string, @Param('id') id: string, @Body() body: unknown, @Req() req: Request & { admin: { id: string } }) { return this.files.revoke(orderId, id, body, req.admin.id); }
}
@Controller('orders/files')
class CustomerTicketFilesController {
  private requests = new Map<string, { count: number; until: number }>();
  constructor(private readonly files: TicketFilesService) {}
  private check(req: Request) {
    const now = Date.now(); for (const [k, v] of this.requests) if (v.until < now) this.requests.delete(k);
    const key = req.socket.remoteAddress || 'unknown', value = this.requests.get(key) || { count: 0, until: now + 60000 };
    value.count++; this.requests.set(key, value);
    if (value.count > 100 || this.requests.size > 10000) throw new HttpException('Quá nhiều yêu cầu. Thử lại sau một phút.', 429);
  }
  @Post() @HttpCode(200) list(@Body() body: unknown, @Req() req: Request, @Res({ passthrough: true }) res: Response) { this.check(req); privateHeaders(res); return this.files.customerList(body); }
  @Post(':id/download') @HttpCode(200) async download(@Param('id') id: string, @Body() body: unknown, @Req() req: Request, @Res() res: Response) { this.check(req); send(res, await this.files.publicDownload(id, body)); }
}
@Controller('partner/orders/:orderId/files')
class PartnerTicketFilesController {
  constructor(private readonly files: TicketFilesService, private readonly auth: PartnerAuthService) {}
  @Get() async list(@Param('orderId') orderId: string, @Req() req: Request, @Res({ passthrough: true }) res: Response) { privateHeaders(res); return this.files.partnerList(orderId, (await this.auth.requirePartner(req)).id); }
  @Get(':id/download') async download(@Param('orderId') orderId: string, @Param('id') id: string, @Req() req: Request, @Res() res: Response) { send(res, await this.files.partnerDownload(id, orderId, (await this.auth.requirePartner(req)).id)); }
  @Post(':id/sharing') async sharing(@Param('orderId') orderId: string, @Param('id') id: string, @Body() body: unknown, @Req() req: Request) { this.auth.checkMutation(req); return this.files.sharing(orderId, id, (await this.auth.requirePartner(req)).id, body); }
}
@Controller('deliveries/files')
class SharedTicketFilesController {
  private requests = new Map<string, { count: number; until: number }>();
  constructor(private readonly files: TicketFilesService) {}
  private check(req: Request) { const now = Date.now(); for (const [key, value] of this.requests) if (value.until < now) this.requests.delete(key); const key = req.socket.remoteAddress || 'unknown', value = this.requests.get(key) || { count: 0, until: now + 60000 }; value.count++; this.requests.set(key, value); if (value.count > 100 || this.requests.size > 10000) throw new HttpException('Quá nhiều yêu cầu. Thử lại sau một phút.', 429); }
  @Post() @HttpCode(200) list(@Body() body: unknown, @Req() req: Request, @Res({ passthrough: true }) res: Response) { this.check(req); privateHeaders(res); return this.files.sharedList(body); }
  @Post(':id/download') @HttpCode(200) async download(@Param('id') id: string, @Body() body: unknown, @Req() req: Request, @Res() res: Response) { this.check(req); send(res, await this.files.sharedDownload(id, body)); }
}
@Controller('pos/orders/:orderId/files')class PosTicketFilesController{
 constructor(private readonly files:TicketFilesService,private readonly auth:PosAuthService){}
 @Get()async list(@Param('orderId')id:string,@Req()req:Request,@Res({passthrough:true})res:Response){privateHeaders(res);return this.files.posList(id,await this.auth.require(req));}
 @Get(':id/download')async download(@Param('orderId')orderId:string,@Param('id')id:string,@Req()req:Request,@Res()res:Response){send(res,await this.files.posDownload(orderId,id,await this.auth.require(req)));}
}
@Module({ imports: [AuthModule, OrdersModule, MailModule, PartnersModule,PosModule], controllers: [AdminTicketFilesController, CustomerTicketFilesController, PartnerTicketFilesController, SharedTicketFilesController,PosTicketFilesController], providers: [TicketFilesService] })
export class TicketFilesModule {}
