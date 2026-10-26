import{ConflictException}from'@nestjs/common';
import type{PoolClient}from'pg';
export async function reserveSlug(client:PoolClient,kind:string,id:string,slug:string,oldSlug?:string){
  const alias=await client.query('SELECT entity_id FROM jingo_slug_aliases WHERE kind=$1 AND slug=$2',[kind,slug]);
  if(alias.rowCount&&alias.rows[0].entity_id!==id)throw new ConflictException('Đường dẫn này đang chuyển hướng tới nội dung khác. Chọn đường dẫn mới.');
  await client.query('DELETE FROM jingo_slug_aliases WHERE kind=$1 AND slug=$2 AND entity_id=$3',[kind,slug,id]);
  if(oldSlug&&oldSlug!==slug)await client.query('INSERT INTO jingo_slug_aliases(kind,slug,entity_id)VALUES($1,$2,$3) ON CONFLICT(kind,slug) DO UPDATE SET entity_id=EXCLUDED.entity_id',[kind,oldSlug,id]);
}
