import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.module';
import { ManagedProduct, productSchema } from '../admin/product.schema';

@Injectable()
export class CatalogService {
  constructor(private readonly db: DatabaseService) {}
  private unpack(row: { data: object; version: number }): ManagedProduct { return { ...row.data, version: row.version } as ManagedProduct; }
  async list(admin = false) {
    const result = await this.db.pool.query('SELECT data,version FROM jingo_products ORDER BY updated_at DESC');
    return result.rows.map(row => this.unpack(row)).filter(p => admin || p.status === 'PUBLISHED');
  }
  async find(value: string, bySlug = false, admin = false) {
    const result = await this.db.pool.query(`SELECT data,version FROM jingo_products WHERE ${bySlug ? 'slug' : 'id'}=$1`, [value]);
    const product: ManagedProduct | undefined = result.rowCount ? this.unpack(result.rows[0]) : undefined;
    if (!product || (!admin && product.status !== 'PUBLISHED')) throw new NotFoundException('Không tìm thấy sản phẩm.');
    return product;
  }
  async save(body: unknown, adminId: string) {
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('\n'));
    const product = parsed.data;
    const client = await this.db.pool.connect();
    try {
      await client.query('BEGIN');
      if (product.version === 0) {
        await client.query('INSERT INTO jingo_products(id,slug,data) VALUES ($1,$2,$3)', [product.id, product.slug, JSON.stringify(product)]);
      } else {
        const result = await client.query('UPDATE jingo_products SET slug=$1,data=$2,version=version+1,updated_at=now() WHERE id=$3 AND version=$4', [product.slug, JSON.stringify(product), product.id, product.version]);
        if (!result.rowCount) throw new ConflictException('Sản phẩm đã được sửa ở nơi khác. Tải lại trước khi lưu.');
      }
      await client.query('INSERT INTO jingo_audit(id,admin_id,action,entity_id) VALUES ($1,$2,$3,$4)', [randomUUID(), adminId, product.version ? 'product.update' : 'product.create', product.id]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      if ((error as { code?: string }).code === '23505') throw new ConflictException('Mã hoặc đường dẫn sản phẩm đã tồn tại.');
      throw error;
    } finally { client.release(); }
    return this.find(product.id, false, true);
  }
}
