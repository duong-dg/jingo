import{markTranslation}from'../content/translations';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.module';
import { ManagedProduct, productSchema } from '../admin/product.schema';
import{MediaService}from'../content/media.module';
import{cleanContent,contentImageIds}from'../content/content.schema';
import{reserveSlug}from'../content/slug-alias';

@Injectable()
export class CatalogService {
  constructor(private readonly db: DatabaseService,private readonly media:MediaService) {}
  private unpack(row: { data: object; version: number }): ManagedProduct { return { ...row.data, version: row.version } as ManagedProduct; }
  async list(admin = false) {
    const result = await this.db.pool.query('SELECT data,version FROM jingo_products ORDER BY updated_at DESC');
    return result.rows.map(row => this.unpack(row)).filter(p => admin || p.status === 'PUBLISHED');
  }
  async find(value: string, bySlug = false, admin = false) {
    let result = await this.db.pool.query(`SELECT data,version FROM jingo_products WHERE ${bySlug ? 'slug' : 'id'}=$1`, [value]);
    if(!result.rowCount&&bySlug)result=await this.db.pool.query('SELECT p.data,p.version FROM jingo_slug_aliases a JOIN jingo_products p ON p.id=a.entity_id WHERE a.kind=$1 AND a.slug=$2',['PRODUCT',value]);
    const product: ManagedProduct | undefined = result.rowCount ? this.unpack(result.rows[0]) : undefined;
    if (!product || (!admin && product.status !== 'PUBLISHED')) throw new NotFoundException('Không tìm thấy sản phẩm.');
    return product;
  }
  async save(body: unknown, adminId: string) {
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('\n'));
    const product = parsed.data;
    product.detailHtml=cleanContent(product.detailHtml);if(product.english)product.english.detailHtml=cleanContent(product.english.detailHtml);markTranslation('PRODUCT',product);
    await this.media.validateIds([...(product.cover?[product.cover.id]:[]),...product.gallery.map(image=>image.id),...contentImageIds(product.detailHtml),...contentImageIds(product.english?.detailHtml||'') ]);
    const client = await this.db.pool.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
      await client.query("SELECT id FROM jingo_migrations WHERE id='016_supplier_catalog_lock' FOR UPDATE");
      if(product.supplierId){const supplier=await client.query('SELECT data FROM jingo_suppliers WHERE id=$1',[product.supplierId]);if(!supplier.rowCount||supplier.rows[0].data.status!=='ACTIVE')throw new BadRequestException('Chọn nhà cung cấp đang hoạt động.');}
      await client.query("SELECT id FROM jingo_migrations WHERE id='009_destination_lock' FOR UPDATE");
      if(product.destinationId){const destinations=await client.query('SELECT id,data FROM jingo_destinations');const map=new Map(destinations.rows.map(row=>[row.id,row.data]));let node=map.get(product.destinationId);const seen=new Set<string>();if(!node)throw new BadRequestException('Điểm đến không tồn tại.');product.destination=node.name;while(node){if(node.status!=='ACTIVE'||seen.has(node.id))throw new BadRequestException('Chọn điểm đến đang hoạt động.');seen.add(node.id);if(!node.parentId)break;node=map.get(node.parentId);if(!node)throw new BadRequestException('Điểm đến thiếu cấp cha.');}}

      markTranslation('PRODUCT',product);
      const type=await client.query('SELECT data FROM jingo_product_types WHERE id=$1 FOR SHARE',[product.type]);
      if(!type.rowCount||type.rows[0].data.status!=='ACTIVE')throw new BadRequestException('Chọn loại sản phẩm đang hoạt động.');
      const current=product.version?await client.query('SELECT slug FROM jingo_products WHERE id=$1 FOR UPDATE',[product.id]):null;
      await reserveSlug(client,'PRODUCT',product.id,product.slug,current?.rows[0]?.slug);
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
