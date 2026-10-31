import{BadGatewayException,BadRequestException,ConflictException,Injectable,NotFoundException,UnauthorizedException}from'@nestjs/common';
import{DatabaseService}from'../database/database.module';
import{MailService}from'../mail/mail.module';
import{PaymentSettings}from'./settings';

export function paypalCents(vnd:number,rate:number){
 if(!Number.isSafeInteger(vnd)||vnd<=0||!Number.isSafeInteger(rate)||rate<100||rate>1000000)throw new BadRequestException('Số tiền hoặc tỷ giá PayPal không hợp lệ.');
 const cents=(BigInt(vnd)*200n+BigInt(rate))/(2n*BigInt(rate));
 if(cents<1n||cents>99999999999n)throw new BadRequestException('Số tiền USD nằm ngoài giới hạn thanh toán.');
 return Number(cents);
}
export const usdValue=(cents:number)=>(Math.trunc(cents/100))+'.'+String(cents%100).padStart(2,'0');
const remoteId=/^[A-Z0-9]{10,40}$/;
type Attempt={id:string;order_id:string;mode:string;amount:string|number;expires_at:string;config:any;status:string};
type CaptureTarget={id:string;amount:number};
type Settlement={attempt:Attempt;external:string;reason:string;usd:string;currency:string;captureId:string;orderId:string};

@Injectable()export class PaypalGateway{
 constructor(private readonly db:DatabaseService,private readonly mail:MailService,private readonly settings:PaymentSettings){}
 private host(mode:string){return mode==='LIVE'?'https://api-m.paypal.com':'https://api-m.sandbox.paypal.com';}
 private async json(url:string,init:RequestInit){
  try{const r=await fetch(url,{...init,redirect:'error',signal:AbortSignal.timeout(15000)});const text=await r.text();if(text.length>1000000)throw new Error('size');let data;try{data=JSON.parse(text);}catch{throw new Error('json');}if(!r.ok)throw new BadGatewayException('PayPal chưa xử lý được yêu cầu. Kiểm tra cấu hình hoặc thử lại; không thanh toán thêm nếu đã trả tiền.');return data;}
  catch(e){if(e instanceof BadGatewayException)throw e;throw new BadGatewayException('Chưa kết nối được PayPal. Vui lòng kiểm tra lại trạng thái trước khi thanh toán lần nữa.');}
 }
 private async token(mode:string,clientId:string,encrypted:string){
  const secret=await this.mail.decrypt(encrypted),d=await this.json(this.host(mode)+'/v1/oauth2/token',{method:'POST',headers:{Authorization:'Basic '+Buffer.from(clientId+':'+secret).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'});
  if(typeof d.access_token!=='string'||d.access_token.length>10000)throw new BadGatewayException('PayPal không trả về access token hợp lệ.');return d.access_token;
 }
 private api(mode:string,token:string,path:string,body?:unknown,requestId?:string){return this.json(this.host(mode)+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',Prefer:'return=representation',...(requestId?{'PayPal-Request-Id':requestId}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});}
 async create(a:Attempt,code:string){
  const c=a.config;let mapping=(await this.db.pool.query('SELECT * FROM jingo_paypal_orders WHERE attempt_id=$1',[a.id])).rows[0];
  if(!mapping){
   const token=await this.token(a.mode,c.paypalClientId,c.paypalEncrypted),base=process.env.PUBLIC_BASE_URL||'http://localhost:3000';
   const result=await this.api(a.mode,token,'/v2/checkout/orders',{intent:'CAPTURE',purchase_units:[{reference_id:a.id,custom_id:a.id,invoice_id:a.id,description:'JinGo '+code,amount:{currency_code:'USD',value:usdValue(c.usdCents)}}],payment_source:{paypal:{experience_context:{brand_name:'JinGo',shipping_preference:'NO_SHIPPING',user_action:'PAY_NOW',return_url:new URL('/thanh-toan/paypal',base).toString(),cancel_url:new URL('/thanh-toan/paypal?cancelled=1',base).toString()}}}},a.id+'-create');
   const approval=result.links?.find((l:any)=>l.rel==='payer-action'||l.rel==='approve')?.href;
   let url:URL;try{url=new URL(approval);}catch{throw new BadGatewayException('PayPal thiếu đường dẫn xác nhận.');}
   if(!remoteId.test(result.id)||url.protocol!=='https:'||url.hostname!==(a.mode==='LIVE'?'www.paypal.com':'www.sandbox.paypal.com')||url.username||url.password||url.port)throw new BadGatewayException('Phản hồi PayPal không hợp lệ.');
   await this.db.pool.query('INSERT INTO jingo_paypal_orders(id,attempt_id,approval_url)VALUES($1,$2,$3) ON CONFLICT(attempt_id) DO NOTHING',[result.id,a.id,url.toString()]);
   mapping=(await this.db.pool.query('SELECT * FROM jingo_paypal_orders WHERE attempt_id=$1',[a.id])).rows[0];
  }
  return{id:a.id,provider:'PAYPAL',mode:a.mode,amount:Number(a.amount),currency:'USD',usdAmount:usdValue(c.usdCents),exchangeRate:c.paypalRate,expiresAt:a.expires_at,url:mapping.approval_url};
 }
 private async attempt(orderId:string){
  if(!remoteId.test(orderId))throw new BadRequestException('Mã thanh toán PayPal không hợp lệ.');
  const mapping=(await this.db.pool.query('SELECT attempt_id FROM jingo_paypal_orders WHERE id=$1',[orderId])).rows[0];
  const a=mapping?(await this.db.pool.query("SELECT * FROM jingo_gateway_attempts WHERE id=$1 AND provider='PAYPAL'",[mapping.attempt_id])).rows[0]:null;
  if(!a)throw new NotFoundException('Không tìm thấy thanh toán PayPal.');return a as Attempt;
 }
 async complete(orderId:string,allowCapture:boolean,expectedCapture?:string):Promise<Settlement|null>{
  const a=await this.attempt(orderId),c=a.config,token=await this.token(a.mode,c.paypalClientId,c.paypalEncrypted);
  let order=await this.api(a.mode,token,'/v2/checkout/orders/'+orderId);
  const validOrder=()=>order.id===orderId&&order.intent==='CAPTURE'&&order.purchase_units?.length===1&&order.purchase_units[0].reference_id===a.id&&order.purchase_units[0].custom_id===a.id&&order.purchase_units[0].invoice_id===a.id&&order.purchase_units[0].amount?.currency_code==='USD'&&order.purchase_units[0].amount?.value===usdValue(c.usdCents);
  if(!validOrder()&&order.status!=='COMPLETED')throw new ConflictException('Đơn PayPal không khớp số tiền hoặc mã JinGo.');
  if(allowCapture&&order.status==='APPROVED'){
   const current=await this.settings.config();if(!current.paypalEnabled||current.mode!==a.mode||current.paypalClientId!==c.paypalClientId||current.paypalEncrypted!==c.paypalEncrypted||new Date(a.expires_at).getTime()<=Date.now())throw new ConflictException('Yêu cầu PayPal đã hết hạn hoặc cấu hình thay đổi. Chưa thu thêm tiền.');
   const targets:CaptureTarget[]=c.cartOrders||[{id:a.order_id,amount:Number(a.amount)}];
   for(const target of targets){const row=(await this.db.pool.query('SELECT booking_status,payment_status,snapshot FROM jingo_orders WHERE id=$1',[target.id])).rows[0];if(!row||row.booking_status!=='CONFIRMED'||row.payment_status!=='UNPAID'||row.snapshot.total!==target.amount||(await this.db.pool.query('SELECT order_id FROM jingo_order_archives WHERE order_id=$1',[target.id])).rowCount)throw new ConflictException('Đơn không còn đủ điều kiện thu tiền PayPal.');}
   // Stable request ID and a fresh GET after uncertain responses make retries safe.
   try{await this.api(a.mode,token,'/v2/checkout/orders/'+orderId+'/capture',{},a.id+'-capture');}catch(e){order=await this.api(a.mode,token,'/v2/checkout/orders/'+orderId);if(order.status!=='COMPLETED')throw e;}
   order=await this.api(a.mode,token,'/v2/checkout/orders/'+orderId);
   if(!validOrder()&&order.status!=='COMPLETED')throw new ConflictException('Đơn PayPal sau thu tiền không khớp.');
  }
  if(order.status!=='COMPLETED')return null;
  const captures=order.purchase_units?.[0]?.payments?.captures||[],cap=expectedCapture?captures.find((x:any)=>x.id===expectedCapture):captures[0];
  if(!cap||!remoteId.test(cap.id))throw new ConflictException('Không tìm thấy giao dịch thu PayPal.');
  if(cap.status!=='COMPLETED')return null;
  let reason=validOrder()?'':'Đơn PayPal không khớp số tiền hoặc mã JinGo; cần kiểm tra trên PayPal';if(captures.length!==1||cap.amount?.currency_code!=='USD'||cap.amount?.value!==usdValue(c.usdCents)||cap.final_capture!==true)reason='Số tiền USD, tiền tệ hoặc lần thu PayPal không khớp; cần kiểm tra trên PayPal';
  return{attempt:a,external:cap.id,reason,usd:String(cap.amount?.value||''),currency:String(cap.amount?.currency_code||''),captureId:cap.id,orderId};
 }
 async webhook(body:unknown,headers:Record<string,unknown>){
  if(!body||typeof body!=='object'||Array.isArray(body))throw new BadRequestException('Webhook PayPal không hợp lệ.');
  const event=body as any,c=await this.settings.config();if(!c.paypalEncrypted||!c.paypalWebhookId)throw new UnauthorizedException('PayPal chưa cấu hình webhook.');
  const names=['paypal-auth-algo','paypal-cert-url','paypal-transmission-id','paypal-transmission-sig','paypal-transmission-time'];
  for(const name of names)if(typeof headers[name]!=='string'||!(headers[name] as string).length||(headers[name] as string).length>4000)throw new UnauthorizedException('Thiếu chữ ký webhook PayPal.');
  // Pass certificate URL only to PayPal verification API; never fetch an inbound URL locally.
  const token=await this.token(c.mode,c.paypalClientId,c.paypalEncrypted),verified=await this.api(c.mode,token,'/v1/notifications/verify-webhook-signature',{auth_algo:headers[names[0]],cert_url:headers[names[1]],transmission_id:headers[names[2]],transmission_sig:headers[names[3]],transmission_time:headers[names[4]],webhook_id:c.paypalWebhookId,webhook_event:body});
  if(verified.verification_status!=='SUCCESS')throw new UnauthorizedException('Chữ ký webhook PayPal không hợp lệ.');
  if(event.event_type!=='PAYMENT.CAPTURE.COMPLETED'&&event.event_type!=='CHECKOUT.ORDER.APPROVED')return null;
  const orderId=event.event_type==='CHECKOUT.ORDER.APPROVED'?event.resource?.id:event.resource?.supplementary_data?.related_ids?.order_id;
  if(typeof orderId!=='string'||!remoteId.test(orderId))throw new BadRequestException('Webhook thiếu mã đơn PayPal.');
  // Ignore unrelated orders belonging to another integration on the same PayPal app.
  const mapping=(await this.db.pool.query('SELECT attempt_id FROM jingo_paypal_orders WHERE id=$1',[orderId])).rows[0];if(!mapping)return null;
  const a=await this.attempt(orderId);if(a.mode!==c.mode||a.config.paypalClientId!==c.paypalClientId)throw new ConflictException('Môi trường hoặc tài khoản PayPal không khớp.');
  return this.complete(orderId,event.event_type==='CHECKOUT.ORDER.APPROVED',event.event_type==='PAYMENT.CAPTURE.COMPLETED'?event.resource?.id:undefined);
 }
}
