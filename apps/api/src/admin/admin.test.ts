import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { newDb } from 'pg-mem';
import { AppModule } from '../app.module';
import { DatabaseService } from '../database/database.module';
import { productSchema } from './product.schema';

test('admin authentication, persistent catalog, schedules and public isolation', async () => {
  process.env.ADMIN_EMAIL = 'owner@example.test';
  process.env.ADMIN_PASSWORD = 'integration-only-password-123';
  process.env.PUBLIC_BASE_URL = 'http://localhost:3000';
  const memory = newDb({ noAstCoverageCheck: true });
  const adapter = memory.adapters.createPg();
  const pool = new adapter.Pool();
  const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider('DB_POOL').useValue(pool).compile();
  const app = module.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl() + '/api/v1';
  let cookie = '';
  const call = (path: string, body?: unknown, authenticated = true, extra: Record<string,string> = {}) => fetch(base + path, {
    method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', 'X-Jingo-Admin': '1', Origin: 'http://localhost:3000', ...(authenticated && cookie ? { Cookie: cookie } : {}), ...extra },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  try {
    assert.equal((await call('/admin/products')).status, 401);
    assert.equal((await call('/admin/login', { email: process.env.ADMIN_EMAIL, password: 'wrong' })).status, 401);
    let res = await call('/admin/login', { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
    assert.equal(res.status, 201); assert.match(res.headers.get('set-cookie')!, /HttpOnly/i);
    cookie = res.headers.get('set-cookie')!.split(';')[0];
    assert.equal((await call('/admin/me')).status, 200);
    const product = (await (await call('/admin/products')).json()).data[0];
    const initialVersion=product.version;assert.ok(initialVersion>=1);assert.ok(product.destinationId);
    product.name = 'Edited product';
    product.english = { name: 'Private draft', description: '', seoTitle: '', seoDescription: '', status: 'DRAFT' };
    product.variants[0].prices.ADULT = 123000;
    product.rules = [{ id: 'summer', productId: product.id, variantId: product.variants[0].id, customerType: 'ADULT', startDate: '2027-06-01', endDate: '2027-08-31', priority: 10, amount: 456000 }];
    res = await call('/admin/products', product, false); assert.equal(res.status, 401);
    res = await call('/admin/products', product, true, { Origin: 'https://evil.example' }); assert.equal(res.status, 403);
    res = await call('/admin/products', product); assert.equal(res.status, 201); const saved = (await res.json()).data; assert.equal(saved.version, initialVersion+1);
    assert.equal((await call('/admin/products', product)).status, 409, 'stale edit must not overwrite');
    const publicData = (await (await call(`/products/${product.slug}`)).json()).data;
    assert.equal(publicData.name, 'Edited product'); assert.equal(publicData.english, undefined); assert.equal(publicData.rules, undefined);
    res = await call('/quotes', { productId: product.id, variantId: product.variants[0].id, date: '2027-06-01', quantities: { ADULT: 2 } });
    assert.equal(res.status, 201); assert.equal((await res.json()).total, 912000);
    const overlap = { ...saved, rules: [...saved.rules, { ...saved.rules[0], id: 'conflict' }] };
    assert.equal(productSchema.safeParse(overlap).success, false);
    assert.equal((await call('/admin/products', overlap)).status, 400);
    saved.closures = [{ productId: saved.id, startDate: '2027-06-01', endDate: '2027-06-02' }];
    res = await call('/admin/products', saved); const closed = (await res.json()).data;
    assert.equal((await call(`/products/${product.slug}/prices?date=2027-06-01&variantId=${product.variants[0].id}`)).status, 400);
    assert.equal((await call('/quotes', { productId: product.id, variantId: product.variants[0].id, date: '2027-06-01', quantities: { ADULT: 1 } })).status, 400);
    closed.status = 'DRAFT'; await call('/admin/products', closed);
    assert.equal((await call(`/products/${product.slug}`)).status, 404);
    assert.equal((await (await call('/products')).json()).data.some((p: { id: string }) => p.id === product.id), false);
    await module.get(DatabaseService).onModuleInit();
    assert.equal((await module.get(DatabaseService).pool.query('SELECT version FROM jingo_products WHERE id=$1', [product.id])).rows[0].version, initialVersion+3, 'restart must not overwrite edits');
    const fresh = { ...product, id: 'new-product', slug: 'new-product', version: 0, rules: [], closures: [], status: 'DRAFT' };
    assert.equal((await call('/admin/products', { ...fresh, name: '' })).status, 400);
    res = await call('/admin/products', fresh); assert.equal(res.status, 201); assert.equal((await res.json()).data.version, 1);
    assert.equal((await call('/products/new-product')).status, 404);
    assert.equal((await call('/admin/products', fresh)).status, 409);
    const audit = await pool.query('SELECT * FROM jingo_audit'); assert.equal(audit.rows.length, 4);
    await call('/admin/logout', {}); assert.equal((await call('/admin/me')).status, 401);
    for (let i=0;i<5;i++) await call('/admin/login', { email: 'unknown@example.test', password: 'wrong' });
    assert.equal((await call('/admin/login', { email: 'unknown@example.test', password: 'wrong' })).status, 429);
  } finally { await app.close(); }
});
