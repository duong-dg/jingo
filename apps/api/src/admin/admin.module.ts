import{AdminSecurityService,deviceSchema}from'./security.service';
import { Body, Controller, Get, Module, Post, Req, Res, Param, BadRequestException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { CatalogModule } from '../catalog/catalog.module';
import { CatalogService } from '../catalog/catalog.service';
import { AuthService } from './auth.service';
import { AuthModule } from './auth.module';

@Controller('admin')
class AdminController {
  constructor(private readonly auth: AuthService, private readonly catalog: CatalogService,private readonly security:AdminSecurityService) {}
  @Post('login') async login(@Body() body: unknown, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const parsed = z.object({ email: z.email().max(200), password: z.string().min(1).max(200),device:deviceSchema.optional() }).strict().safeParse(body);
    if (!parsed.success) throw new BadRequestException('Nhập email và mật khẩu hợp lệ.');
    return this.auth.login(parsed.data.email, parsed.data.password, req, res,parsed.data.device);
  }
  @Get('login-policy') async policy(@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','no-store');return this.security.publicPolicy();}
  @Get('login-entry/:slug') async entry(@Param('slug')slug:string,@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','no-store');return this.security.checkEntry(slug);}
  @Post('login/otp')async otp(@Body()body:unknown,@Req()req:Request,@Res({passthrough:true})res:Response){const input=z.object({challengeId:z.uuid(),code:z.string().regex(/^\d{6}$/)}).strict().safeParse(body);if(!input.success)throw new BadRequestException('Nhập mã OTP gồm 6 chữ số.');return this.auth.verifyOtp(input.data.challengeId,input.data.code,req,res);}
  @Get('security')async settings(@Req()req:Request,@Res({passthrough:true})res:Response){await this.auth.requireAdmin(req);res.setHeader('Cache-Control','private, no-store');return this.security.policy(true);}
  @Get('security/logs')async logs(@Req()req:Request,@Res({passthrough:true})res:Response){await this.auth.requireAdmin(req);res.setHeader('Cache-Control','private, no-store');return this.security.journal(req.query);}
  @Post('security/challenge')async setupChallenge(@Req()req:Request){this.auth.checkMutation(req);const admin=await this.auth.requireAdmin(req);return this.security.challenge(admin,'SETUP',this.auth.sessionBinding(req),req);}
  @Post('security')async saveSecurity(@Body()body:unknown,@Req()req:Request,@Res({passthrough:true})res:Response){this.auth.checkMutation(req);const admin=await this.auth.requireAdmin(req),value=await this.security.save(body,admin,this.auth.sessionBinding(req),req);this.auth.promoteCookie(res,value.token);return value.policy;}
  @Get('me') async me(@Req() req: Request, @Res({ passthrough: true }) res: Response) { res.setHeader('Cache-Control', 'no-store'); return this.auth.requireAdmin(req); }
  @Post('logout') logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.auth.logout(req, res); }
  @Get('products') async products(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.requireAdmin(req); res.setHeader('Cache-Control', 'no-store'); return { data: await this.catalog.list(true) };
  }
  @Post('products/:id/archive') async archive(@Param('id')id:string,@Body()body:unknown,@Req()req:Request){this.auth.checkMutation(req);const admin=await this.auth.requireAdmin(req);return{data:await this.catalog.archive(id,body,admin.id)};}
  @Post('products') async save(@Body() body: unknown, @Req() req: Request) {
    this.auth.checkMutation(req); const admin = await this.auth.requireAdmin(req);
    return { data: await this.catalog.save(body, admin.id) };
  }
}
@Module({ imports: [CatalogModule,AuthModule], controllers: [AdminController], exports: [AuthModule] })
export class AdminModule {}
