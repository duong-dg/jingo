import type {Pool} from 'pg';
import {sourceHash, type TranslationKind} from '../content/translations';

const migration='jinmemo_content_v2';
const tables={PRODUCT:'jingo_products',POST:'jingo_posts',PAGE:'jingo_pages',TYPE:'jingo_product_types',DESTINATION:'jingo_destinations'} as const;
type Kind=keyof typeof tables;
const fields=['name','title','description','excerpt','detailHtml','contentHtml','seoTitle','seoDescription','author','menuLabel','englishName'] as const;

/** Rebrand public copy only. Email addresses, identifiers, slugs and price fields are untouched. */
export function rebrandPublicCopy(text:string){
 // Keep complete mailboxes intact, including plus-addressing and display-like local parts.
 return text.split(/([a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,})/gi).map((part,index)=>index%2?part:part
  .replace(/(?:https?:\/\/|\/\/)(?:www\.)?jingo\.io\.vn(?::(?:80|443))?(?=[/?#\s"'<>]|$)/gi,'https://jinmemo.com')
  .replace(/(?<![@\w.\/-])(?:www\.)?jingo\.io\.vn(?![\w.:-])/gi,'jinmemo.com')
  .replace(/(?<![\w@.\/-])jingo(?![\w@\/-]|\.[\w-])/gi,'JinMemo')).join('');
}
export function rebrandContent(kind:Kind,input:any){
 const data=structuredClone(input);
 const copy=(object:any)=>{if(!object||typeof object!=='object')return;for(const key of fields)if(typeof object[key]==='string')object[key]=rebrandPublicCopy(object[key]);};
 copy(data);copy(data.english);
 const image=(value:any)=>{if(value&&typeof value.alt==='string')value.alt=rebrandPublicCopy(value.alt);};
 image(data.cover);for(const item of data.gallery||[])image(item);
 if(kind==='PRODUCT')for(const variant of data.variants||[]){copy(variant);for(const key of Object.keys(variant.conditions||{}))if(typeof variant.conditions[key]==='string')variant.conditions[key]=rebrandPublicCopy(variant.conditions[key]);}
 if(kind==='PRODUCT')for(const variant of data.english?.variants||[]){copy(variant);for(const key of Object.keys(variant.conditions||{}))if(typeof variant.conditions[key]==='string')variant.conditions[key]=rebrandPublicCopy(variant.conditions[key]);}
 if(['PRODUCT','POST','TYPE'].includes(kind)&&input.english?.sourceHash===sourceHash(kind as TranslationKind,input))data.english.sourceHash=sourceHash(kind as TranslationKind,data);
 return data;
}

export async function migrateJinMemoContent(pool:Pool){
 await pool.query(`CREATE TABLE IF NOT EXISTS jingo_rebrand_history(migration_id text NOT NULL,entity_kind text NOT NULL,entity_id text NOT NULL,data jsonb NOT NULL,version integer NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(migration_id,entity_kind,entity_id))`);
 await pool.query('INSERT INTO jingo_migrations(id)VALUES($1) ON CONFLICT(id) DO NOTHING',[migration+'_lock']);
 const client=await pool.connect();
 try{
  await client.query('BEGIN');await client.query('SELECT id FROM jingo_migrations WHERE id=$1 FOR UPDATE',[migration+'_lock']);
  if((await client.query('SELECT id FROM jingo_migrations WHERE id=$1',[migration])).rowCount){await client.query('COMMIT');return;}
  for(const [kind,table] of Object.entries(tables)){
   const rows=(await client.query('SELECT id,data,version FROM '+table+' ORDER BY id FOR UPDATE')).rows;
   for(const row of rows){const data=rebrandContent(kind as Kind,row.data);if(JSON.stringify(data)===JSON.stringify(row.data))continue;
    await client.query('INSERT INTO jingo_rebrand_history(migration_id,entity_kind,entity_id,data,version)VALUES($1,$2,$3,$4,$5)',[migration,kind,row.id,JSON.stringify(row.data),row.version]);
    await client.query('UPDATE '+table+' SET data=$1,version=version+1 WHERE id=$2',[JSON.stringify(data),row.id]);
   }
  }
  // Existing sender addresses and encrypted credentials remain valid with Google SMTP.
  for(const id of ['site-seo','smtp']){
   const row=(await client.query('SELECT data,version FROM jingo_settings WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!row)continue;
   const data=structuredClone(row.data);
   if(id==='smtp'){if(typeof data.fromName==='string')data.fromName=rebrandPublicCopy(data.fromName);}
   else for(const locale of ['vi','en'])if(data[locale])for(const field of ['title','description'])if(typeof data[locale][field]==='string')data[locale][field]=rebrandPublicCopy(data[locale][field]);
   if(JSON.stringify(data)===JSON.stringify(row.data))continue;
   await client.query('INSERT INTO jingo_rebrand_history(migration_id,entity_kind,entity_id,data,version)VALUES($1,$2,$3,$4,$5)',[migration,'SETTING',id,JSON.stringify(row.data),row.version]);
   await client.query('UPDATE jingo_settings SET data=$1,version=version+1 WHERE id=$2',[JSON.stringify(data),id]);
  }
  await client.query('INSERT INTO jingo_migrations(id)VALUES($1)',[migration]);await client.query('COMMIT');
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
