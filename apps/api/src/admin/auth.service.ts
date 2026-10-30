import{AdminSecurityService,deviceSchema}from'./security.service';
import { Injectable, OnModuleInit, UnauthorizedException, ForbiddenException, HttpException,ConflictException } from '@nestjs/common';
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import type { Request, Response } from 'express';
import { DatabaseService } from '../database/database.module';

const scrypt = promisify(scryptCallback);
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${(await scrypt(password, salt, 64) as Buffer).toString('hex')}`;
}
@Injectable()
export class AuthService implements OnModuleInit {

  constructor(private readonly db: DatabaseService,private readonly security:AdminSecurityService) {}
  async onModuleInit() {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) return;
    if (password.length < 12) throw new Error('ADMIN_PASSWORD must contain at least 12 characters.');
    await this.db.pool.query('INSERT INTO jingo_admins(id,email,password_hash) VALUES ($1,$2,$3) ON CONFLICT (email) DO NOTHING', [randomUUID(), email, await hashPassword(password)]);
  }
  checkMutation(req: Request) {
    if (req.headers['x-jingo-admin'] !== '1') throw new ForbiddenException('Thiếu xác minh yêu cầu.');
    const expected = new URL(process.env.PUBLIC_BASE_URL || 'http://localhost:3000').origin;
    if (req.headers.origin && req.headers.origin !== expected) throw new ForbiddenException('Nguồn yêu cầu không hợp lệ. Kiểm tra PUBLIC_BASE_URL.');
  }
  private setCookie(res: Response, token: string, maxAge: number) {
    res.cookie('jingo_admin', token, { httpOnly: true, sameSite: 'strict', secure: (process.env.PUBLIC_BASE_URL || '').startsWith('https://'), path: '/', maxAge });
    res.clearCookie('jingo_admin',{path:'/api/v1/admin',httpOnly:true,sameSite:'strict',secure:(process.env.PUBLIC_BASE_URL||'').startsWith('https://')});
    res.setHeader('Cache-Control', 'no-store');
  }
  async login(email: string, password: string, req: Request, res: Response,device?:ReturnType<typeof deviceSchema.parse>) {
    this.checkMutation(req);
    const policy=await this.security.entryAllowed(req),key=email.toLowerCase();
    try{await this.security.throttle('peer:'+this.security.meta(req).ip,100);await this.security.throttle('account:'+key,5);}catch(error){await this.security.log('THROTTLED',key,req,undefined,device);throw error;}
    const result = await this.db.pool.query('SELECT * FROM jingo_admins WHERE email=$1', [key]);
    const admin = result.rows[0];
    const [salt, encoded] = (admin?.password_hash || 'unused:' + '0'.repeat(128)).split(':');
    const actual = await scrypt(password, salt, 64) as Buffer;
    if (!admin || !timingSafeEqual(actual, Buffer.from(encoded, 'hex'))){await this.security.log('PASSWORD_FAILED',key,req,undefined,device);throw new UnauthorizedException('Email hoặc mật khẩu không đúng.');}
    if(policy.otpEnabled){const binding=randomBytes(32).toString('hex'),challenge=await this.security.challenge(admin,'LOGIN',binding,req,device);res.cookie('jingo_admin_challenge',binding,{httpOnly:true,sameSite:'strict',secure:(process.env.PUBLIC_BASE_URL||'').startsWith('https://'),path:'/api/v1/admin',maxAge:5*60000});return challenge;}
    const db=await this.db.pool.connect();try{await db.query('BEGIN');const current=(await db.query("SELECT data FROM jingo_admin_security WHERE id='policy' FOR SHARE")).rows[0]?.data;if(current&&(current.otpEnabled||current.privateEntryEnabled&&req.headers['x-jingo-admin-entry']!==current.entrySlug))throw new ConflictException('Chính sách bảo mật vừa thay đổi. Vui lòng đăng nhập lại.');const result=await this.session(admin,res,db);await this.security.clearLimit('account:'+key,db);await this.security.log('SUCCESS',admin.email,req,admin.id,device,db);await db.query('COMMIT');return result;}catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
  }
  private async session(admin:{id:string;email:string},res:Response,client=this.db.pool as Pick<import('pg').PoolClient,'query'>){const token=randomBytes(32).toString('hex');await client.query('DELETE FROM jingo_sessions WHERE expires_at<$1',[new Date()]);await client.query('INSERT INTO jingo_sessions(token_hash,admin_id,expires_at)VALUES($1,$2,$3)',[digest(token),admin.id,new Date(Date.now()+8*3600000)]);this.setCookie(res,token,8*3600000);return{email:admin.email};}
  async verifyOtp(id:string,code:string,req:Request,res:Response){this.checkMutation(req);await this.security.entryAllowed(req);await this.security.throttle('otp-peer:'+this.security.meta(req).ip,100);const binding=req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('jingo_admin_challenge='))?.slice('jingo_admin_challenge='.length)||'';
   if(!/^[a-f0-9]{64}$/.test(binding))throw new UnauthorizedException('Vui lòng đăng nhập lại để nhận OTP.');
   try{return await this.security.consume(id,code,'LOGIN',binding,async(db,row)=>{const admin=(await db.query('SELECT id,email FROM jingo_admins WHERE id=$1',[row.admin_id])).rows[0];if(!admin)throw new UnauthorizedException();const result=await this.session(admin,res,db);await this.security.clearLimit('account:'+admin.email,db);await this.security.log('SUCCESS',admin.email,req,admin.id,{name:row.data.deviceName,timezone:row.data.timezone,language:row.data.language},db);return result;});}catch(error){const target=(await this.db.pool.query("SELECT a.id,a.email,o.data FROM jingo_admin_otp o JOIN jingo_admins a ON a.id=o.admin_id WHERE o.id=$1 AND o.binding_hash=$2 AND o.purpose='LOGIN'",[id,digest(binding)])).rows[0];await this.security.log(error instanceof UnauthorizedException?'OTP_FAILED':'LOGIN_ERROR',target?.email||'',req,target?.id,target?{name:target.data.deviceName,timezone:target.data.timezone,language:target.data.language}:undefined);throw error;}
  }
  sessionBinding(req:Request){const token=this.token(req);if(!token)throw new UnauthorizedException();return token;}
  promoteCookie(res:Response,token:string){this.setCookie(res,token,8*3600000);}
  private token(req: Request) { return req.headers.cookie?.split(';').map(s => s.trim()).find(s => s.startsWith('jingo_admin='))?.slice(12); }
  async requireAdmin(req: Request,client:Pick<import('pg').PoolClient,'query'>=this.db.pool) {
    const token = this.token(req);
    if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new UnauthorizedException('Vui lòng đăng nhập.');
    const result = await client.query('SELECT a.id,a.email FROM jingo_sessions s JOIN jingo_admins a ON a.id=s.admin_id WHERE s.token_hash=$1 AND s.expires_at>$2', [digest(token), new Date()]);
    if (!result.rowCount) throw new UnauthorizedException('Phiên đăng nhập đã hết hạn.');
    return result.rows[0] as { id: string; email: string };
  }
  async logout(req: Request, res: Response) {this.checkMutation(req);return this.endSession(req,res);}
  async endSession(req:Request,res:Response){
    const token = this.token(req);
    const admin=await this.requireAdmin(req).catch(()=>null);if(admin)await this.security.log('LOGOUT',admin.email,req,admin.id);
    if (token) await this.db.pool.query('DELETE FROM jingo_sessions WHERE token_hash=$1', [digest(token)]);
    this.setCookie(res, '', 0);
    return { ok: true };
  }
}
