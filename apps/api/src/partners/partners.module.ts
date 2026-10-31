import{clientAddress}from'../http/client-address';
import{InventoryModule}from'../inventory/inventory.module';
import{BadRequestException,Body,Controller,Get,HttpException,Module,Param,Post,Req,Res,UseGuards}from'@nestjs/common';import type{Request,Response}from'express';import{z}from'zod';
import{AdminGuard,AuthModule}from'../admin/auth.module';import{CatalogModule}from'../catalog/catalog.module';import{TypesModule}from'../content/types.module';import{OrdersModule}from'../orders/orders.module';import{OrdersService}from'../orders/orders.service';import{orderInput,lookupInput}from'../orders/orders.schema';
import{PartnersService}from'./partners.service';import{PartnerAuthService}from'./partner-auth.service';import{partnerLogin,partnerSelection,repaymentSchema,creditRequest}from'./partners.schema';
function parse<T>(schema:z.ZodType<T>,body:unknown):T{const result=schema.safeParse(body);if(!result.success)throw new BadRequestException(result.error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('\n'));return result.data;}
@Controller('admin/partners')@UseGuards(AdminGuard)class AdminPartnersController{
  constructor(private readonly partners:PartnersService){}
  @Get()async list(@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','no-store');return{data:await this.partners.accounts()};}
  @Post()async save(@Body()body:unknown,@Req()req:Request&{admin:{id:string}}){return{data:await this.partners.saveAccount(body,req.admin.id)};}
  @Get(':id/ledger')async ledger(@Param('id')id:string,@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','no-store');return this.partners.ledger(id);}
  @Post(':id/repayments')async repay(@Param('id')id:string,@Body()body:unknown,@Req()req:Request&{admin:{id:string}}){return this.partners.repay(id,parse(repaymentSchema,body),req.admin.id);}
}
@Controller('admin/price-groups')@UseGuards(AdminGuard)class AdminGroupsController{
  constructor(private readonly partners:PartnersService){}
  @Get()async list(@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','no-store');return{data:await this.partners.groups()};}
  @Post()async save(@Body()body:unknown,@Req()req:Request&{admin:{id:string}}){return{data:await this.partners.saveGroup(body,req.admin.id)};}
}
@Controller('partner')class PartnerController{
  constructor(private readonly partners:PartnersService,private readonly auth:PartnerAuthService,private readonly orders:OrdersService){}
  @Post('login')async login(@Body()body:unknown,@Req()req:Request,@Res({passthrough:true})res:Response){const input=parse(partnerLogin,body);return this.auth.login(input.email,input.password,req,res);}
  @Post('logout')async logout(@Req()req:Request,@Res({passthrough:true})res:Response){return this.auth.logout(req,res);}
  @Get('me')async me(@Req()req:Request,@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','no-store');const account=await this.auth.requirePartner(req);return{account,credit:await this.partners.ledger(account.id)};}
  @Get('products')async products(@Req()req:Request,@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','no-store');return{data:await this.partners.products(await this.auth.requirePartner(req))};}
  @Post('quotes')async quote(@Body()body:unknown,@Req()req:Request,@Res({passthrough:true})res:Response){this.auth.checkMutation(req);res.setHeader('Cache-Control','no-store');return this.partners.quote(await this.auth.requirePartner(req),parse(partnerSelection,body));}
  @Post('orders')async create(@Body()body:unknown,@Req()req:Request,@Res({passthrough:true})res:Response){this.auth.checkMutation(req);res.setHeader('Cache-Control','no-store');const account=await this.auth.requirePartner(req);return this.orders.create(parse(orderInput,body),account.id);}
  @Get('orders')async list(@Req()req:Request,@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','no-store');const account=await this.auth.requirePartner(req);return{data:await this.orders.partnerList(account.id)};}
  @Get('orders/:id')async get(@Param('id')id:string,@Req()req:Request,@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','no-store');const account=await this.auth.requirePartner(req);return this.orders.partnerGet(id,account.id);}
  @Post('orders/:id/credit')async credit(@Param('id')id:string,@Body()body:unknown,@Req()req:Request){this.auth.checkMutation(req);const account=await this.auth.requirePartner(req);const input=parse(creditRequest,body);await this.orders.act(id,{...input,action:'CREDIT'},'partner:'+account.id,account.id);return this.orders.partnerGet(id,account.id);}
  @Post('orders/:id/shares/revoke')async revoke(@Param('id')id:string,@Body()body:unknown,@Req()req:Request){this.auth.checkMutation(req);const account=await this.auth.requirePartner(req),input=parse(z.object({requestId:z.uuid()}).strict(),body);return this.orders.revokeShares(id,account.id,input.requestId);}
  @Post('orders/:id/share')async share(@Param('id')id:string,@Body()body:unknown,@Req()req:Request,@Res({passthrough:true})res:Response){this.auth.checkMutation(req);res.setHeader('Cache-Control','no-store');const account=await this.auth.requirePartner(req);const input=parse(z.object({requestId:z.uuid(),accessKey:z.string().regex(/^[a-f0-9]{64}$/)}).strict(),body);return this.orders.createShare(id,account.id,input.requestId,input.accessKey);}
}
@Controller('deliveries')class DeliveryController{
  private requests=new Map<string,{count:number;until:number}>();
  private throttle(req:Request){const now=Date.now();for(const[k,v]of this.requests)if(v.until<now)this.requests.delete(k);const key=clientAddress(req).ip,v=this.requests.get(key)||{count:0,until:now+60000};v.count++;this.requests.set(key,v);if(v.count>100||this.requests.size>10000)throw new HttpException('Quá nhiều yêu cầu nhận vé.',429);}
  constructor(private readonly orders:OrdersService){}
  @Post('lookup')async lookup(@Body()body:unknown,@Req()req:Request,@Res({passthrough:true})res:Response){this.throttle(req);res.setHeader('Cache-Control','no-store');const input=parse(z.object({code:z.string().regex(/^JG[A-F0-9]{10}$/),accessKey:z.string().regex(/^[a-f0-9]{64}$/)}).strict(),body);return this.orders.deliveryLookup(input.code,input.accessKey);}
}
@Module({imports:[AuthModule,CatalogModule,TypesModule,OrdersModule,InventoryModule],providers:[PartnersService,PartnerAuthService],controllers:[AdminPartnersController,AdminGroupsController,PartnerController,DeliveryController],exports:[PartnerAuthService]})export class PartnersModule{}
