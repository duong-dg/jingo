import{Body,Controller,Get,HttpCode,HttpException,ForbiddenException,Module,Post,Query,Req,Res,UseGuards}from'@nestjs/common';import type{Request,Response}from'express';import{AuthModule,AdminGuard}from'../admin/auth.module';import{MailModule}from'../mail/mail.module';import{PaymentSettings}from'./settings';import{PaymentsService}from'./payments.service';
@Controller('payments')class PublicPaymentsController{
 private requests=new Map<string,{count:number;until:number}>();constructor(private readonly service:PaymentsService){}
 private throttle(req:Request){const now=Date.now();for(const[k,v]of this.requests)if(v.until<now)this.requests.delete(k);const k=req.socket.remoteAddress||'unknown',v=this.requests.get(k)||{count:0,until:now+60000};v.count++;this.requests.set(k,v);if(v.count>100||this.requests.size>10000)throw new HttpException('Quá nhiều yêu cầu thanh toán.',429);}
 @Get('options')options(@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','no-store');return this.service.options();}
 @Post('checkout')checkout(@Body()body:unknown,@Req()req:Request,@Res({passthrough:true})res:Response){this.throttle(req);if(req.headers['x-jingo-request']!=='1'||req.headers.origin&&req.headers.origin!==new URL(process.env.PUBLIC_BASE_URL||'http://localhost:3000').origin)throw new ForbiddenException('Invalid payment request origin');res.setHeader('Cache-Control','private, no-store');return this.service.checkout(body,req.socket.remoteAddress||'127.0.0.1');}
 @Get('vnpay/ipn')ipn(@Query()query:unknown,@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','no-store');return this.service.vnpay(query);}
 @Get('vnpay/return')returned(@Res()res:Response){res.setHeader('Cache-Control','no-store');res.redirect(new URL('/tra-cuu?gateway=return',process.env.PUBLIC_BASE_URL||'http://localhost:3000').toString());}
 @Post('sepay/webhook')@HttpCode(200)webhook(@Body()body:unknown,@Req()req:Request){return this.service.sepay(body,req.headers.authorization||'');}
}
@Controller('admin/payments')@UseGuards(AdminGuard)class AdminPaymentsController{
 constructor(private readonly settings:PaymentSettings,private readonly service:PaymentsService){}
 @Get()view(@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','private, no-store');return this.settings.view();}
 @Post()save(@Body()body:unknown,@Req()req:Request&{admin:{id:string}}){return this.settings.save(body,req.admin.id);}
 @Get('events')events(@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','private, no-store');return this.service.events();}
 @Post('test-checkout')test(@Body()body:unknown){return this.service.checkout(body,'127.0.0.1',true);}
}
@Module({imports:[AuthModule,MailModule],controllers:[PublicPaymentsController,AdminPaymentsController],providers:[PaymentSettings,PaymentsService]})export class PaymentsModule{}
