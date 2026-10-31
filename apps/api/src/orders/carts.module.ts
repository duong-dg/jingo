import{RequestLimit,requestBudgets}from'../http/request-limit';
import { Body, Controller, Get, ForbiddenException, Module, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { CartsService } from './carts.service';
import { OrdersModule } from './orders.module';
import { AuthModule, AdminGuard } from '../admin/auth.module';
import { MailModule } from '../mail/mail.module';
import { InventoryModule } from '../inventory/inventory.module';
import { VouchersModule } from '../vouchers/vouchers.module';
import { PartnersModule } from '../partners/partners.module';
import { PartnerAuthService } from '../partners/partner-auth.service';
import { PosModule } from '../pos/pos.module';
import { PosAuthService } from '../pos/pos-auth.service';
import { permissions, type PosActor } from '../pos/pos.schema';
function noStore(res: Response) { res.setHeader('Cache-Control', 'private, no-store'); }
@Controller('carts') class CustomerCartsController {
  private readonly limit=new RequestLimit();
  constructor(private readonly carts: CartsService) {}
  @Post() create(@Body() body: unknown, @Req() req: Request, @Res({ passthrough: true }) res: Response) { this.limit.check(req,res,'create',requestBudgets.create); noStore(res); if (req.headers['x-jingo-request'] !== '1' || req.headers.origin && req.headers.origin !== new URL(process.env.PUBLIC_BASE_URL || 'http://localhost:3000').origin) throw new ForbiddenException(); return this.carts.create(body); }
  @Post('lookup') lookup(@Body() body: unknown, @Req() req: Request, @Res({ passthrough: true }) res: Response) { this.limit.check(req,res,'lookup',requestBudgets.lookup); noStore(res); return this.carts.lookup(body); }
}
@Controller('partner/carts') class PartnerCartsController {
  constructor(private readonly carts: CartsService, private readonly auth: PartnerAuthService) {}
  @Post() async create(@Body() body: unknown, @Req() req: Request, @Res({ passthrough: true }) res: Response) { this.auth.checkMutation(req); noStore(res); const account = await this.auth.requirePartner(req); return this.carts.create(body, { channel: 'CTV', partnerId: account.id }); }
  @Get(':code') async view(@Param('code') code: string, @Req() req: Request, @Res({ passthrough: true }) res: Response) { noStore(res); return this.carts.view(code, { channel: 'CTV', partnerId: (await this.auth.requirePartner(req)).id }); }
  @Post(':code/actions') async act(@Param('code') code: string, @Body() body: unknown, @Req() req: Request, @Res({ passthrough: true }) res: Response) { this.auth.checkMutation(req); noStore(res); return this.carts.act(code, body, { channel: 'CTV', partnerId: (await this.auth.requirePartner(req)).id }); }
}
@Controller('pos/carts') class PosCartsController {
  constructor(private readonly carts: CartsService, private readonly auth: PosAuthService) {}
  private actor(req: Request) { if (req.method !== 'GET') this.auth.checkMutation(req); return this.auth.require(req); }
  @Post() async create(@Body() body: unknown, @Req() req: Request, @Res({ passthrough: true }) res: Response) { noStore(res); return this.carts.create(body, { channel: 'POS', actor: await this.actor(req) }); }
  @Get(':code') async view(@Param('code') code: string, @Req() req: Request, @Res({ passthrough: true }) res: Response) { noStore(res); return this.carts.view(code, { channel: 'POS', actor: await this.actor(req) }); }
  @Post(':code/actions') async act(@Param('code') code: string, @Body() body: unknown, @Req() req: Request, @Res({ passthrough: true }) res: Response) { noStore(res); return this.carts.act(code, body, { channel: 'POS', actor: await this.actor(req) }); }
}
@Controller('admin/carts') @UseGuards(AdminGuard) class AdminCartsController {
  constructor(private readonly carts: CartsService) {}
  private actor(req: Request & { admin: { id: string; email: string } }): PosActor { return { ...req.admin, name: req.admin.email, role: 'ADMIN', counterIds: [], permissions: [...permissions] }; }
  @Post('pos') create(@Body() body: unknown, @Req() req: Request & { admin: { id: string; email: string } }, @Res({ passthrough: true }) res: Response) { noStore(res); return this.carts.create(body, { channel: 'POS', actor: this.actor(req) }); }
  @Get(':code') view(@Param('code') code: string, @Res({ passthrough: true }) res: Response) { noStore(res); return this.carts.view(code, { channel: 'ADMIN' }); }
  @Post(':code/actions') act(@Param('code') code: string, @Body() body: unknown, @Req() req: Request & { admin: { id: string; email: string } }, @Res({ passthrough: true }) res: Response) { noStore(res); return this.carts.act(code, body, { channel: 'ADMIN', actor: this.actor(req) }); }
}
@Module({ imports: [OrdersModule, AuthModule, MailModule, InventoryModule, VouchersModule, PartnersModule, PosModule], providers: [CartsService], controllers: [CustomerCartsController, PartnerCartsController, PosCartsController, AdminCartsController] }) export class CartsModule {}
