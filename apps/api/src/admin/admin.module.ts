import { Body, Controller, Get, Module, Post, Req, Res, BadRequestException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { CatalogModule } from '../catalog/catalog.module';
import { CatalogService } from '../catalog/catalog.service';
import { AuthService } from './auth.service';
import { AuthModule } from './auth.module';

@Controller('admin')
class AdminController {
  constructor(private readonly auth: AuthService, private readonly catalog: CatalogService) {}
  @Post('login') async login(@Body() body: unknown, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const parsed = z.object({ email: z.email().max(200), password: z.string().min(1).max(200) }).strict().safeParse(body);
    if (!parsed.success) throw new BadRequestException('Nhập email và mật khẩu hợp lệ.');
    return this.auth.login(parsed.data.email, parsed.data.password, req, res);
  }
  @Get('me') async me(@Req() req: Request, @Res({ passthrough: true }) res: Response) { res.setHeader('Cache-Control', 'no-store'); return this.auth.requireAdmin(req); }
  @Post('logout') logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.auth.logout(req, res); }
  @Get('products') async products(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.requireAdmin(req); res.setHeader('Cache-Control', 'no-store'); return { data: await this.catalog.list(true) };
  }
  @Post('products') async save(@Body() body: unknown, @Req() req: Request) {
    this.auth.checkMutation(req); const admin = await this.auth.requireAdmin(req);
    return { data: await this.catalog.save(body, admin.id) };
  }
}
@Module({ imports: [CatalogModule,AuthModule], controllers: [AdminController], exports: [AuthModule] })
export class AdminModule {}
