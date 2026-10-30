import{PaymentReconciliation}from'./reconciliation';
import{randomUUID}from'node:crypto';
import{ShiftsModule}from'../shifts/shifts.module';import{PartnersModule}from'../partners/partners.module';import{PartnerAuthService}from'../partners/partner-auth.service';import{PosModule}from'../pos/pos.module';import{PosAuthService}from'../pos/pos-auth.service';import{permissions}from'../pos/pos.schema';
import{Body,Controller,Get,HttpCode,HttpException,ForbiddenException,Logger,Module,Post,Query,Req,Res,UseGuards}from'@nestjs/common';import type{Request,Response}from'express';import{AuthModule,AdminGuard}from'../admin/auth.module';import{MailModule}from'../mail/mail.module';import{PaymentSettings}from'./settings';import{PaymentsService}from'./payments.service';
@Controller('payments')class PublicPaymentsController{
 private readonly logger=new Logger('SePayWebhook');
 private async observe<T>(kind:string,res:Response,work:()=>Promise<T>){const requestId=randomUUID(),start=Date.now();res.setHeader('Cache-Control','no-store');res.setHeader('X-Jingo-Webhook-Request',requestId);try{const result=await work();this.logger.log(JSON.stringify({kind,requestId,status:200,durationMs:Date.now()-start}));return result;}catch(error){const status=error instanceof HttpException?error.getStatus():500;this.logger.warn(JSON.stringify({kind,requestId,status,durationMs:Date.now()-start,code:status===401?'AUTH_REJECTED':status===400?'INVALID_PAYLOAD_OR_GRANT':status===409?'TRANSACTION_CONFLICT':status===429?'RATE_LIMIT':'PROCESSING_FAILED'}));throw error;}}
 private requests=new Map<string,{count:number;until:number}>();constructor(private readonly service:PaymentsService){}
 private throttle(req:Request){const now=Date.now();for(const[k,v]of this.requests)if(v.until<now)this.requests.delete(k);const k=req.socket.remoteAddress||'unknown',v=this.requests.get(k)||{count:0,until:now+60000};v.count++;this.requests.set(k,v);if(v.count>100||this.requests.size>10000)throw new HttpException('Quá nhiều yêu cầu thanh toán.',429);}
 @Get('options')options(@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','no-store');return this.service.options();}
 @Post('checkout')checkout(@Body()body:unknown,@Req()req:Request,@Res({passthrough:true})res:Response){this.throttle(req);if(req.headers['x-jingo-request']!=='1'||req.headers.origin&&req.headers.origin!==new URL(process.env.PUBLIC_BASE_URL||'http://localhost:3000').origin)throw new ForbiddenException('Invalid payment request origin');res.setHeader('Cache-Control','private, no-store');return this.service.checkout(body,req.socket.remoteAddress||'127.0.0.1');}
 @Get('vnpay/ipn')ipn(@Query()query:unknown,@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','no-store');return this.service.vnpay(query);}
 @Get('vnpay/return')returned(@Res()res:Response){res.setHeader('Cache-Control','no-store');res.redirect(new URL('/tra-cuu?gateway=return',process.env.PUBLIC_BASE_URL||'http://localhost:3000').toString());}
 @Post('sepay/card-ipn')@HttpCode(200)cardIpn(@Body()body:unknown,@Req()req:Request){return this.service.sepayCard(body,String(req.headers['x-secret-key']||''));}
 @Get('sepay/card-return')cardReturn(@Res()res:Response){res.setHeader('Cache-Control','no-store');res.redirect(new URL('/tra-cuu?gateway=return',process.env.PUBLIC_BASE_URL||'http://localhost:3000').toString());}
 @Post('sepay/oauth/token')@HttpCode(200)token(@Body()body:unknown,@Req()req:Request,@Res({passthrough:true})res:Response){res.setHeader('Pragma','no-cache');return this.observe('token',res,async()=>{this.throttle(req);return this.service.sepayToken(body,req.headers.authorization||'');});}
 @Post('sepay/webhook')@HttpCode(200)webhook(@Body()body:unknown,@Req()req:Request,@Res({passthrough:true})res:Response){return this.observe('bank-webhook',res,()=>this.service.sepay(body,req.headers.authorization||'',{raw:(req as Request&{rawBody?:Buffer}).rawBody,timestamp:String(req.headers['x-sepay-timestamp']||''),signature:String(req.headers['x-sepay-signature']||'')}));}
}
@Controller('admin/payments')@UseGuards(AdminGuard)class AdminPaymentsController{
 constructor(private readonly settings:PaymentSettings,private readonly service:PaymentsService,private readonly reconciliation:PaymentReconciliation){}
 @Get()view(@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','private, no-store');return this.settings.view();}
 @Post()save(@Body()body:unknown,@Req()req:Request&{admin:{id:string}}){return this.settings.save(body,req.admin.id);}
 @Post('reconciliation/preview')preview(@Body()body:unknown,@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','private, no-store');return this.reconciliation.preview(body);}
 @Post('reconciliation/resolve')resolve(@Body()body:unknown,@Req()req:Request&{admin:{id:string}},@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','private, no-store');return this.reconciliation.resolve(body,req.admin.id);}
 @Get('events')events(@Query()query:Record<string,unknown>,@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','private, no-store');return this.service.events(query);}
 @Post('checkout')checkout(@Body()body:unknown,@Req()req:Request&{admin:{id:string;email:string}},@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','private, no-store');return this.service.checkout(body,req.socket.remoteAddress||'127.0.0.1',false,{channel:'ADMIN',actor:{...req.admin,name:req.admin.email,role:'ADMIN',counterIds:[],permissions:[...permissions]}});}
 @Post('test-checkout')test(@Body()body:unknown){return this.service.checkout(body,'127.0.0.1',true);}
}
@Controller('partner/payments')class PartnerPaymentsController{
 constructor(private readonly service:PaymentsService,private readonly auth:PartnerAuthService){}
 @Post('checkout')async checkout(@Body()body:unknown,@Req()req:Request,@Res({passthrough:true})res:Response){this.auth.checkMutation(req);res.setHeader('Cache-Control','private, no-store');const account=await this.auth.requirePartner(req);return this.service.checkout(body,req.socket.remoteAddress||'127.0.0.1',false,{channel:'CTV',partnerId:account.id});}
}
@Controller('pos/payments')class PosPaymentsController{
 constructor(private readonly service:PaymentsService,private readonly auth:PosAuthService){}
 @Post('checkout')async checkout(@Body()body:unknown,@Req()req:Request,@Res({passthrough:true})res:Response){this.auth.checkMutation(req);res.setHeader('Cache-Control','private, no-store');return this.service.checkout(body,req.socket.remoteAddress||'127.0.0.1',false,{channel:'POS',actor:await this.auth.require(req)});}
}
@Module({imports:[AuthModule,MailModule,ShiftsModule,PartnersModule,PosModule],controllers:[PublicPaymentsController,AdminPaymentsController,PartnerPaymentsController,PosPaymentsController],providers:[PaymentSettings,PaymentsService,PaymentReconciliation]})export class PaymentsModule{}
