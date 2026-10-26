import{ForbiddenException,HttpException,Injectable,UnauthorizedException}from'@nestjs/common';
import{createHash,randomBytes,scrypt as scryptCallback,timingSafeEqual}from'node:crypto';import{promisify}from'node:util';
import type{Request,Response}from'express';import{DatabaseService}from'../database/database.module';import{PartnerAccount}from'./partners.schema';
const scrypt=promisify(scryptCallback);const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
@Injectable()export class PartnerAuthService{
  private attempts=new Map<string,{count:number;until:number}>();
  constructor(private readonly db:DatabaseService){}
  checkMutation(req:Request){if(req.headers['x-jingo-partner']!=='1')throw new ForbiddenException('Thiếu xác minh yêu cầu.');const origin=new URL(process.env.PUBLIC_BASE_URL||'http://localhost:3000').origin;if(req.headers.origin&&req.headers.origin!==origin)throw new ForbiddenException('Nguồn yêu cầu không hợp lệ.');}
  private cookie(res:Response,token:string,maxAge:number){res.cookie('jingo_partner',token,{httpOnly:true,sameSite:'strict',secure:(process.env.PUBLIC_BASE_URL||'').startsWith('https://'),path:'/api/v1/partner',maxAge});res.setHeader('Cache-Control','no-store');}
  private token(req:Request){return req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('jingo_partner='))?.slice(14);}
  async login(email:string,password:string,req:Request,res:Response){this.checkMutation(req);const now=Date.now();for(const[key,value]of this.attempts)if(value.until<now)this.attempts.delete(key);const attempt=this.attempts.get(email)||{count:0,until:now+15*60_000};if(attempt.count>=5||this.attempts.size>10000)throw new HttpException('Thử lại sau 15 phút.',429);attempt.count++;this.attempts.set(email,attempt);
    const result=await this.db.pool.query('SELECT * FROM jingo_partners WHERE email=$1',[email]);const account=result.rows[0];const[salt,encoded]=(account?.password_hash||'unused:'+'0'.repeat(128)).split(':');const actual=await scrypt(password,salt,64)as Buffer;
    if(!account||!timingSafeEqual(actual,Buffer.from(encoded,'hex'))||account.data.status==='DISABLED')throw new UnauthorizedException('Email hoặc mật khẩu không đúng, hoặc tài khoản đã khóa.');
    this.attempts.delete(email);const token=randomBytes(32).toString('hex');await this.db.pool.query('DELETE FROM jingo_partner_sessions WHERE expires_at<$1',[new Date()]);await this.db.pool.query('INSERT INTO jingo_partner_sessions(token_hash,partner_id,expires_at)VALUES($1,$2,$3)',[digest(token),account.id,new Date(now+8*3600_000)]);this.cookie(res,token,8*3600_000);return{name:account.data.name,email:account.email};
  }
  async requirePartner(req:Request):Promise<PartnerAccount>{const token=this.token(req);if(!token||!/^[a-f0-9]{64}$/.test(token))throw new UnauthorizedException('Vui lòng đăng nhập CTV.');const result=await this.db.pool.query('SELECT p.data,p.version FROM jingo_partner_sessions s JOIN jingo_partners p ON p.id=s.partner_id WHERE s.token_hash=$1 AND s.expires_at>$2',[digest(token),new Date()]);if(!result.rowCount||result.rows[0].data.status==='DISABLED')throw new UnauthorizedException('Phiên CTV đã hết hạn hoặc tài khoản đã khóa.');return{...result.rows[0].data,version:result.rows[0].version};}
  async logout(req:Request,res:Response){this.checkMutation(req);const token=this.token(req);if(token)await this.db.pool.query('DELETE FROM jingo_partner_sessions WHERE token_hash=$1',[digest(token)]);this.cookie(res,'',0);return{ok:true};}
}
