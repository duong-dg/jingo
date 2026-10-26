import { Injectable, OnModuleInit, UnauthorizedException, ForbiddenException, HttpException } from '@nestjs/common';
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
  private attempts = new Map<string, { count: number; until: number }>();
  constructor(private readonly db: DatabaseService) {}
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
    res.cookie('jingo_admin', token, { httpOnly: true, sameSite: 'strict', secure: (process.env.PUBLIC_BASE_URL || '').startsWith('https://'), path: '/api/v1/admin', maxAge });
    res.setHeader('Cache-Control', 'no-store');
  }
  async login(email: string, password: string, req: Request, res: Response) {
    this.checkMutation(req);
    const now = Date.now();
    for (const [key, attempt] of this.attempts) if (attempt.until < now) this.attempts.delete(key);
    // Per-account throttling works behind the shared reverse proxy without trusting spoofed IP headers.
    const key = email.toLowerCase();
    const attempt = this.attempts.get(key) || { count: 0, until: now + 15 * 60_000 };
    if (attempt.count >= 5 || this.attempts.size > 10000) throw new HttpException('Thử lại sau 15 phút.', 429);
    attempt.count++; this.attempts.set(key, attempt);
    const result = await this.db.pool.query('SELECT * FROM jingo_admins WHERE email=$1', [key]);
    const admin = result.rows[0];
    const [salt, encoded] = (admin?.password_hash || 'unused:' + '0'.repeat(128)).split(':');
    const actual = await scrypt(password, salt, 64) as Buffer;
    if (!admin || !timingSafeEqual(actual, Buffer.from(encoded, 'hex'))) throw new UnauthorizedException('Email hoặc mật khẩu không đúng.');
    this.attempts.delete(key);
    const token = randomBytes(32).toString('hex');
    await this.db.pool.query('DELETE FROM jingo_sessions WHERE expires_at < $1', [new Date()]);
    await this.db.pool.query('INSERT INTO jingo_sessions(token_hash,admin_id,expires_at) VALUES ($1,$2,$3)', [digest(token), admin.id, new Date(now + 8 * 3600_000)]);
    this.setCookie(res, token, 8 * 3600_000);
    return { email: admin.email };
  }
  private token(req: Request) { return req.headers.cookie?.split(';').map(s => s.trim()).find(s => s.startsWith('jingo_admin='))?.slice(12); }
  async requireAdmin(req: Request) {
    const token = this.token(req);
    if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new UnauthorizedException('Vui lòng đăng nhập.');
    const result = await this.db.pool.query('SELECT a.id,a.email FROM jingo_sessions s JOIN jingo_admins a ON a.id=s.admin_id WHERE s.token_hash=$1 AND s.expires_at>$2', [digest(token), new Date()]);
    if (!result.rowCount) throw new UnauthorizedException('Phiên đăng nhập đã hết hạn.');
    return result.rows[0] as { id: string; email: string };
  }
  async logout(req: Request, res: Response) {
    this.checkMutation(req);
    const token = this.token(req);
    if (token) await this.db.pool.query('DELETE FROM jingo_sessions WHERE token_hash=$1', [digest(token)]);
    this.setCookie(res, '', 0);
    return { ok: true };
  }
}
