// Read-only report. Run inside the API container; never dumps customers or credentials.
const {Pool}=require('pg');
const {rebrandContent,rebrandPublicCopy}=require('../apps/api/dist/database/jinmemo-content');
async function audit(pool){
 const counts={},remaining=[];
 for(const [kind,table] of Object.entries({PRODUCT:'jingo_products',POST:'jingo_posts',PAGE:'jingo_pages',TYPE:'jingo_product_types',DESTINATION:'jingo_destinations'})){
  const rows=(await pool.query('SELECT id,slug,data FROM '+table+' ORDER BY id')).rows;
  counts[kind]={total:rows.length,published:rows.filter(r=>['PUBLISHED','ACTIVE'].includes(r.data.status)).length};
  for(const row of rows)if(JSON.stringify(row.data)!==JSON.stringify(rebrandContent(kind,row.data)))remaining.push({kind,id:row.id,slug:row.slug});
 }
 const applied=(await pool.query('SELECT id FROM jingo_migrations WHERE id=$1',['jinmemo_content_v2'])).rowCount>0;
 const history=Number((await pool.query('SELECT count(*) AS count FROM jingo_rebrand_history WHERE migration_id=$1',['jinmemo_content_v2'])).rows[0].count);
 const smtp=(await pool.query('SELECT data FROM jingo_settings WHERE id=$1',['smtp'])).rows[0]?.data;
 return{publicBaseUrl:process.env.PUBLIC_BASE_URL||'',contentMigrationApplied:applied,counts,originalCopiesSaved:history,remaining,senderNameNeedsUpdate:!!smtp&&typeof smtp.fromName==='string'&&rebrandPublicCopy(smtp.fromName)!==smtp.fromName,contactEmailNeedsManualReview:(await pool.query('SELECT data FROM jingo_pages')).rows.some(r=>/@(?:www\.)?jingo\.io\.vn$/i.test(r.data.contact?.email||''))};
}
module.exports={audit};
if(require.main===module){const pool=new Pool({connectionString:process.env.DATABASE_URL});audit(pool).then(report=>{console.log(JSON.stringify(report,null,2));if(report.remaining.length||!report.contentMigrationApplied)process.exitCode=2;}).catch(()=>{console.error('Cannot complete audit. Check API migration, database connectivity and build. Credentials were not printed.');process.exitCode=1;}).finally(()=>pool.end());}
