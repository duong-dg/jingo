import { Global, Inject, Injectable, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';
import{createHash,randomUUID}from'node:crypto';
import { products } from '../catalog/catalog.data';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject('DB_POOL') public readonly pool: Pool) {}
  async onModuleInit() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS jingo_settings(id text PRIMARY KEY,data jsonb NOT NULL,version integer NOT NULL DEFAULT 1);
      CREATE TABLE IF NOT EXISTS jingo_migrations (id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS jingo_vouchers(id text PRIMARY KEY,code text NOT NULL UNIQUE,data jsonb NOT NULL,version integer NOT NULL DEFAULT 1);
      CREATE TABLE IF NOT EXISTS jingo_suppliers(id text PRIMARY KEY,data jsonb NOT NULL,version integer NOT NULL DEFAULT 1);
      CREATE TABLE IF NOT EXISTS jingo_destinations(id text PRIMARY KEY,slug text NOT NULL UNIQUE,data jsonb NOT NULL,version integer NOT NULL DEFAULT 1);
      CREATE TABLE IF NOT EXISTS jingo_products (id text PRIMARY KEY, slug text NOT NULL UNIQUE, data jsonb NOT NULL, version integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS jingo_admins (id text PRIMARY KEY, email text NOT NULL UNIQUE, password_hash text NOT NULL);
      CREATE TABLE IF NOT EXISTS jingo_sessions (token_hash text PRIMARY KEY, admin_id text NOT NULL REFERENCES jingo_admins(id), expires_at timestamptz NOT NULL);
      CREATE INDEX IF NOT EXISTS jingo_sessions_expiry ON jingo_sessions(expires_at);
      CREATE TABLE IF NOT EXISTS jingo_pos_users(id text PRIMARY KEY,email text NOT NULL UNIQUE,password_hash text NOT NULL,data jsonb NOT NULL,version integer NOT NULL DEFAULT 1);
      CREATE TABLE IF NOT EXISTS jingo_pos_sessions(token_hash text PRIMARY KEY,user_id text NOT NULL,role text NOT NULL,expires_at timestamptz NOT NULL);
      CREATE INDEX IF NOT EXISTS jingo_pos_sessions_expiry ON jingo_pos_sessions(expires_at);
      CREATE TABLE IF NOT EXISTS jingo_audit (id text PRIMARY KEY, admin_id text NOT NULL, action text NOT NULL, entity_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS jingo_orders (
        id text PRIMARY KEY, code text NOT NULL UNIQUE, request_id text NOT NULL UNIQUE, request_hash text NOT NULL,
        access_hash text NOT NULL, snapshot jsonb NOT NULL, contact jsonb NOT NULL,
        booking_status text NOT NULL DEFAULT 'REQUESTED', payment_status text NOT NULL DEFAULT 'UNPAID', instructions text NOT NULL DEFAULT '',
        version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS jingo_orders_created ON jingo_orders(created_at);
      CREATE INDEX IF NOT EXISTS jingo_orders_created_page ON jingo_orders(created_at DESC,id DESC);
      CREATE TABLE IF NOT EXISTS jingo_inventory_configs(product_id text PRIMARY KEY REFERENCES jingo_products(id),enabled boolean NOT NULL DEFAULT false,version integer NOT NULL DEFAULT 1);
      CREATE TABLE IF NOT EXISTS jingo_inventory_buckets(product_id text NOT NULL REFERENCES jingo_products(id),variant_id text NOT NULL,visit_date text NOT NULL,slot_id text NOT NULL DEFAULT '',capacity integer NOT NULL,low_stock_threshold integer NOT NULL DEFAULT 5,PRIMARY KEY(product_id,variant_id,visit_date,slot_id));
      CREATE TABLE IF NOT EXISTS jingo_inventory_allocations(order_id text PRIMARY KEY REFERENCES jingo_orders(id),product_id text NOT NULL REFERENCES jingo_products(id),variant_id text NOT NULL,visit_date text NOT NULL,slot_id text NOT NULL DEFAULT '',quantity integer NOT NULL,released boolean NOT NULL DEFAULT false,version integer NOT NULL DEFAULT 1);
      CREATE INDEX IF NOT EXISTS jingo_inventory_allocations_scope ON jingo_inventory_allocations(product_id,visit_date);
      CREATE TABLE IF NOT EXISTS jingo_order_archives(order_id text PRIMARY KEY REFERENCES jingo_orders(id),archived_by text NOT NULL,reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS jingo_order_payments (
        id text PRIMARY KEY, order_id text NOT NULL UNIQUE REFERENCES jingo_orders(id), amount bigint NOT NULL,
        reference text NOT NULL UNIQUE, admin_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS jingo_order_payments_created ON jingo_order_payments(created_at);
      CREATE TABLE IF NOT EXISTS jingo_counters(id text PRIMARY KEY,data jsonb NOT NULL,version integer NOT NULL DEFAULT 1);
      CREATE TABLE IF NOT EXISTS jingo_pos_orders(order_id text PRIMARY KEY REFERENCES jingo_orders(id),counter_id text NOT NULL REFERENCES jingo_counters(id),admin_id text NOT NULL);
      CREATE TABLE IF NOT EXISTS jingo_payment_methods(payment_id text PRIMARY KEY REFERENCES jingo_order_payments(id),method text NOT NULL);
      CREATE TABLE IF NOT EXISTS jingo_order_tickets (
        id text PRIMARY KEY, order_id text NOT NULL REFERENCES jingo_orders(id), code text NOT NULL, code_hash text NOT NULL UNIQUE,
        kind text NOT NULL, covers integer NOT NULL, note text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS jingo_order_actions (
        id text PRIMARY KEY, order_id text NOT NULL REFERENCES jingo_orders(id), request_hash text NOT NULL,
        admin_id text NOT NULL, action text NOT NULL, note text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS jingo_media (
        id text PRIMARY KEY, filename text NOT NULL, alt text NOT NULL, width integer NOT NULL, height integer NOT NULL,
        bytes integer NOT NULL, created_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS jingo_product_types (
        id text PRIMARY KEY, slug text NOT NULL UNIQUE, data jsonb NOT NULL, version integer NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS jingo_post_categories (name text PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS jingo_posts (
        id text PRIMARY KEY, slug text NOT NULL UNIQUE, data jsonb NOT NULL, version integer NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS jingo_slug_aliases (kind text NOT NULL, slug text NOT NULL, entity_id text NOT NULL, PRIMARY KEY(kind,slug));
      CREATE TABLE IF NOT EXISTS jingo_price_groups (id text PRIMARY KEY, data jsonb NOT NULL, version integer NOT NULL DEFAULT 1);
      CREATE TABLE IF NOT EXISTS jingo_partners (id text PRIMARY KEY, email text NOT NULL UNIQUE, password_hash text NOT NULL, data jsonb NOT NULL, version integer NOT NULL DEFAULT 1);
      CREATE TABLE IF NOT EXISTS jingo_partner_sessions (token_hash text PRIMARY KEY, partner_id text NOT NULL REFERENCES jingo_partners(id), expires_at timestamptz NOT NULL);
      CREATE TABLE IF NOT EXISTS jingo_partner_orders (order_id text PRIMARY KEY REFERENCES jingo_orders(id), partner_id text NOT NULL REFERENCES jingo_partners(id));
      CREATE TABLE IF NOT EXISTS jingo_partner_shares (id text PRIMARY KEY,order_id text NOT NULL REFERENCES jingo_orders(id),access_hash text NOT NULL UNIQUE,created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS jingo_payment_references (reference text PRIMARY KEY, kind text NOT NULL, entity_id text NOT NULL, amount bigint NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS jingo_partner_ledger (
        id text PRIMARY KEY, partner_id text NOT NULL REFERENCES jingo_partners(id), order_id text REFERENCES jingo_orders(id),
        kind text NOT NULL, amount bigint NOT NULL, reference text NOT NULL, note text NOT NULL, actor_id text NOT NULL,
        request_hash text NOT NULL, due_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS jingo_order_mail_keys(order_id text PRIMARY KEY REFERENCES jingo_orders(id),secret text NOT NULL);
      CREATE TABLE IF NOT EXISTS jingo_mail_outbox(id text PRIMARY KEY,order_id text NOT NULL REFERENCES jingo_orders(id),event text NOT NULL,status text NOT NULL DEFAULT 'PENDING',attempts integer NOT NULL DEFAULT 0,next_at timestamptz NOT NULL DEFAULT now(),last_error text NOT NULL DEFAULT '',created_at timestamptz NOT NULL DEFAULT now(),sent_at timestamptz);
      CREATE INDEX IF NOT EXISTS jingo_mail_order_history ON jingo_mail_outbox(order_id,created_at DESC,id DESC);
      CREATE INDEX IF NOT EXISTS jingo_partner_ledger_owner ON jingo_partner_ledger(partner_id);
    `);
    const registered=await this.pool.query("SELECT id FROM jingo_migrations WHERE id='005_payment_references'");
    if(!registered.rowCount){const client=await this.pool.connect();try{await client.query('BEGIN');const payments=await client.query('SELECT reference,order_id,amount FROM jingo_order_payments');for(const payment of payments.rows)await client.query('INSERT INTO jingo_payment_references(reference,kind,entity_id,amount)VALUES($1,$2,$3,$4) ON CONFLICT(reference) DO NOTHING',[payment.reference,'ORDER_PAYMENT',payment.order_id,payment.amount]);await client.query("INSERT INTO jingo_migrations(id)VALUES('005_payment_references') ON CONFLICT(id) DO NOTHING");await client.query('COMMIT');}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}}
    for (const type of [
      {id:'TICKET',name:'Vé tham quan / show',slug:'ve-tham-quan',bookingKind:'TICKET',status:'ACTIVE'},
      {id:'TOUR',name:'Tour địa phương',slug:'tour-dia-phuong',bookingKind:'TOUR',status:'ACTIVE'}
    ]) await this.pool.query('INSERT INTO jingo_product_types(id,slug,data) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING',[type.id,type.slug,JSON.stringify(type)]);
    // One-time sample import. Existing edits and drafts are never overwritten on restart.
    const seeded = await this.pool.query("SELECT id FROM jingo_migrations WHERE id = '001_catalog_seed'");
    if (!seeded.rowCount) {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        for (const product of products) await client.query('INSERT INTO jingo_products(id, slug, data) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING',
          [product.id, product.slug, JSON.stringify({ ...product, status: 'PUBLISHED', demo: true, rules: [], closures: [], seoTitle: '', seoDescription: '' })]);
        await client.query("INSERT INTO jingo_migrations(id) VALUES ('001_catalog_seed') ON CONFLICT (id) DO NOTHING");
        await client.query('COMMIT');
      } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
    }
    await this.pool.query("INSERT INTO jingo_migrations(id)VALUES('016_supplier_catalog_lock') ON CONFLICT(id) DO NOTHING");
    await this.pool.query("INSERT INTO jingo_migrations(id)VALUES('009_destination_lock') ON CONFLICT(id) DO NOTHING");
    await this.pool.query('INSERT INTO jingo_counters(id,data)VALUES($1,$2) ON CONFLICT(id) DO NOTHING',['main',JSON.stringify({id:'main',name:'Quầy chính',status:'ACTIVE',version:1})]);
    const destinationClient=await this.pool.connect();try{await destinationClient.query('BEGIN');await destinationClient.query("SELECT id FROM jingo_migrations WHERE id='009_destination_lock' FOR UPDATE");const migrated=await destinationClient.query("SELECT id FROM jingo_migrations WHERE id='009_destinations'");if(!migrated.rowCount){const rows=await destinationClient.query('SELECT id,data FROM jingo_products');const names=new Map<string,string>();for(const row of rows.rows){const name=String(row.data.destination||'').trim();if(!name||row.data.destinationId)continue;const key=name.toLocaleLowerCase('vi');let id=names.get(key);if(!id){id=randomUUID();names.set(key,id);const base=name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,130)||'diem-den';let slug=base;const taken=await destinationClient.query('SELECT id FROM jingo_destinations WHERE slug=$1',[slug]);if(taken.rowCount)slug=base+'-'+createHash('sha256').update(key).digest('hex').slice(0,8);await destinationClient.query('INSERT INTO jingo_destinations(id,slug,data)VALUES($1,$2,$3)',[id,slug,JSON.stringify({id,slug,name,parentId:null,status:'ACTIVE',sortOrder:0,description:'',englishName:'',version:1})]);}await destinationClient.query('UPDATE jingo_products SET data=$1,version=version+1 WHERE id=$2',[JSON.stringify({...row.data,destinationId:id}),row.id]);}await destinationClient.query("INSERT INTO jingo_migrations(id)VALUES('009_destinations')");}await destinationClient.query('COMMIT');}catch(e){await destinationClient.query('ROLLBACK');throw e;}finally{destinationClient.release();}
    await this.pool.query("INSERT INTO jingo_migrations(id)VALUES('011_inventory_lock') ON CONFLICT(id) DO NOTHING");
    const stockClient=await this.pool.connect();try{await stockClient.query('BEGIN');await stockClient.query("SELECT id FROM jingo_migrations WHERE id='011_inventory_lock' FOR UPDATE");if(!(await stockClient.query("SELECT id FROM jingo_migrations WHERE id='011_inventory_backfill'")).rowCount){const products=await stockClient.query('SELECT id,data FROM jingo_products');const rows=await stockClient.query('SELECT id,snapshot,booking_status FROM jingo_orders');for(const row of rows.rows){const snapshot=row.snapshot,product=products.rows.find(p=>p.id===snapshot.productId)?.data;if(!product||!snapshot.date)continue;const matches=product.variants.filter((v:{id:string;name:string})=>snapshot.variantId?v.id===snapshot.variantId:v.name===snapshot.variantName);const variantId=matches.length===1?matches[0].id:'';const quantity=(snapshot.lines||[]).reduce((sum:number,line:{quantity:number})=>sum+Number(line.quantity),0);if(!Number.isInteger(quantity)||quantity<1)continue;await stockClient.query('INSERT INTO jingo_inventory_allocations(order_id,product_id,variant_id,visit_date,slot_id,quantity,released)VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(order_id) DO NOTHING',[row.id,product.id,variantId,snapshot.date,snapshot.timeSlot?.id||'',quantity,row.booking_status==='CANCELLED']);}await stockClient.query("INSERT INTO jingo_migrations(id)VALUES('011_inventory_backfill')");}await stockClient.query('COMMIT');}catch(e){await stockClient.query('ROLLBACK');throw e;}finally{stockClient.release();}
  }
  async onModuleDestroy() { await this.pool.end(); }
}
@Global()
@Module({ providers: [{ provide: 'DB_POOL', useFactory: () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required. Configure PostgreSQL before starting the API.');
  return new Pool({ connectionString: process.env.DATABASE_URL, max: 10, connectionTimeoutMillis: 5000 });
} }, DatabaseService], exports: [DatabaseService] })
export class DatabaseModule {}
