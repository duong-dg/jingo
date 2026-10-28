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
  async upload(orderId: string, body: unknown, file: Upload, actor: string) {
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
      if (order.booking_status !== 'CONFIRMED' || order.payment_status !== 'PAID' || (await client.query('SELECT order_id FROM jingo_order_archives WHERE order_id=$1', [orderId])).rowCount) throw new ConflictException('Chỉ gắn file cho đơn đã thanh toán, đang hoạt động.');
      if ((await client.query('SELECT order_id FROM jingo_partner_orders WHERE order_id=$1', [orderId])).rowCount) throw new BadRequestException('File vé CTV sẽ được hỗ trợ trong luồng tài khoản CTV riêng.');
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
      await this.mail.enqueue(client, orderId, 'DELIVER', order.version + 1);
      await client.query('COMMIT'); saved = undefined;
      return { id, duplicate: false };
    } catch (error) {
      await client.query('ROLLBACK');
      if (saved) await unlink(this.path(saved)).catch(() => {});
      throw error;
    } finally { client.release(); this.processing = false; }
  }
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
@Module({ imports: [AuthModule, OrdersModule, MailModule], controllers: [AdminTicketFilesController, CustomerTicketFilesController], providers: [TicketFilesService] })
export class TicketFilesModule {}
