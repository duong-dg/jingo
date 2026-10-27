import{ordersCsv}from'./orders-csv';
import{OrderSearchService}from'./order-search.service';
import{InventoryModule}from'../inventory/inventory.module';
import{MailModule}from'../mail/mail.module';
import { BadRequestException, Body, Controller, Get, Module, Param, Post, Req, Res, Query, HttpException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { AdminModule } from '../admin/admin.module';
import { AuthService } from '../admin/auth.service';
import { OrdersService } from './orders.service';
import { actionInput, lookupInput, orderInput } from './orders.schema';
function parse<T>(schema: z.ZodType<T>, body: unknown): T { const result = schema.safeParse(body); if (!result.success) throw new BadRequestException(result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('\n')); return result.data; }

@Controller('orders')
class OrdersController {
  private requests = new Map<string,{count:number;until:number}>();
  constructor(private readonly orders: OrdersService) {}
  private throttle(req:Request) {
    const now=Date.now();for(const [key,value] of this.requests)if(value.until<now)this.requests.delete(key);
    const key=req.socket.remoteAddress || 'unknown';const value=this.requests.get(key)||{count:0,until:now+60_000};value.count++;this.requests.set(key,value);
    if(value.count>100||this.requests.size>10000)throw new HttpException('Quá nhiều yêu cầu. Vui lòng thử lại sau một phút.',429);
  }
  @Post() create(@Body() body: unknown, @Req() req:Request, @Res({ passthrough: true }) res: Response) { this.throttle(req);res.setHeader('Cache-Control','no-store'); return this.orders.create(parse(orderInput, body)); }
  @Post('lookup') lookup(@Body() body: unknown, @Req() req:Request, @Res({ passthrough: true }) res: Response) { this.throttle(req);res.setHeader('Cache-Control','no-store'); const input = parse(lookupInput,body); return this.orders.lookup(input.code,input.accessKey,input.email); }
}
@Controller('admin/orders')
class AdminOrdersController {
  constructor(private readonly orders: OrdersService, private readonly auth: AuthService,private readonly search:OrderSearchService) {}
  @Get() async list(@Req() req: Request, @Res({ passthrough:true }) res: Response,@Query()query:Record<string,unknown>) { await this.auth.requireAdmin(req); res.setHeader('Cache-Control','no-store'); return this.search.search(query); }
  @Get('export')async export(@Req()req:Request,@Query()query:Record<string,unknown>,@Res()res:Response){await this.auth.requireAdmin(req);const result=await this.search.exportRows(query);res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('Content-Disposition','attachment; filename="jingo-orders.csv"');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Jingo-Export-Count',String(result.data.length));res.send(ordersCsv(result.data,result.archived));}
  @Get(':id') async get(@Param('id') id: string, @Req() req: Request, @Res({ passthrough:true }) res: Response) { await this.auth.requireAdmin(req); res.setHeader('Cache-Control','no-store'); return this.orders.get(id); }
  @Post(':id/actions') async action(@Param('id') id: string, @Body() body: unknown, @Req() req: Request) { this.auth.checkMutation(req); const admin = await this.auth.requireAdmin(req); return this.orders.act(id,parse(actionInput,body),admin.id); }
}
@Module({ imports:[AdminModule,MailModule,InventoryModule], controllers:[OrdersController,AdminOrdersController], providers:[OrdersService,OrderSearchService],exports:[OrdersService] })
export class OrdersModule {}
