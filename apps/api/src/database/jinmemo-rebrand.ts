import type {Pool} from 'pg';

const migration='jinmemo_brand_v1';
const copyFields=['title','description','contentHtml','seoTitle','seoDescription','menuLabel'] as const;
function brand(value:unknown){return typeof value==='string'?value.replace(/JinGo/g,'JinMemo'):value;}

/** Only brand-owned settings/contact copy. Never rewrite products, posts, orders or secrets. */
export async function migrateJinMemoBrand(pool:Pool){
 await pool.query('INSERT INTO jingo_migrations(id)VALUES($1) ON CONFLICT(id) DO NOTHING',[migration+'_lock']);
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  await client.query('SELECT id FROM jingo_migrations WHERE id=$1 FOR UPDATE',[migration+'_lock']);
  if((await client.query('SELECT id FROM jingo_migrations WHERE id=$1',[migration])).rowCount){await client.query('COMMIT');return;}
  for(const id of ['site-seo','smtp']){
   const row=(await client.query('SELECT data FROM jingo_settings WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!row)continue;
   const data=structuredClone(row.data);
   if(id==='smtp'){if(data.fromName==='JinGo')data.fromName='JinMemo';}
   else for(const locale of ['vi','en'])if(data[locale])for(const key of ['title','description'])data[locale][key]=brand(data[locale][key]);
   if(JSON.stringify(data)!==JSON.stringify(row.data))await client.query('UPDATE jingo_settings SET data=$1,version=version+1 WHERE id=$2',[JSON.stringify(data),id]);
  }
  const id='00000000-0000-4000-8000-000000000001';
  const row=(await client.query('SELECT data FROM jingo_pages WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(row){const data=structuredClone(row.data);for(const key of copyFields){data[key]=brand(data[key]);if(data.english)data.english[key]=brand(data.english[key]);}
   if(JSON.stringify(data)!==JSON.stringify(row.data))await client.query('UPDATE jingo_pages SET data=$1,version=version+1,updated_at=now() WHERE id=$2',[JSON.stringify(data),id]);
  }
  await client.query('INSERT INTO jingo_migrations(id)VALUES($1)',[migration]);await client.query('COMMIT');
 }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
