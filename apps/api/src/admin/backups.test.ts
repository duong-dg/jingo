import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Test} from '@nestjs/testing';
import {newDb} from 'pg-mem';
import {AppModule} from '../app.module';
import {DatabaseService} from '../database/database.module';

test('backup admin lists only complete metadata, streams authenticated ciphertext and audits downloads',async()=>{
 process.env.NODE_ENV='test';process.env.ADMIN_EMAIL='backup@example.test';process.env.ADMIN_PASSWORD='backup-test-password-123';process.env.PUBLIC_BASE_URL='http://localhost:3000';
 const dir=await mkdtemp(join(tmpdir(),'jingo-backups-'));process.env.BACKUP_DIR=dir;
 const pg=newDb({noAstCoverageCheck:true}).adapters.createPg(),module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider('DB_POOL').useValue(new pg.Pool()).compile(),app=module.createNestApplication();app.setGlobalPrefix('api/v1');await app.listen(0,'127.0.0.1');
 const base=await app.getUrl()+'/api/v1/admin/backups',id='jingo-backup-20261101T031500Z-1234abcd',bytes=Buffer.from('encrypted fixture only');
 const metadata={id,createdAt:new Date().toISOString(),verifiedAt:new Date().toISOString(),bytes:bytes.length,sha256:'a'.repeat(64),revision:'b'.repeat(40),snapshot:{orders:5,carts:2,products:10,payments:3,ticketFiles:7},keyFile:'must-not-expose',environment:'never expose'};
 try{
  await writeFile(join(dir,id+'.tar.gpg'),bytes);await writeFile(join(dir,id+'.json'),JSON.stringify(metadata));
  await writeFile(join(dir,'setup.json'),JSON.stringify({schedule:'03:15 Asia/Ho_Chi_Minh',keep:7,installedAt:new Date().toISOString(),key:'must-not-expose'}));
  await writeFile(join(dir,'last-run.json'),JSON.stringify({state:'SUCCESS',updatedAt:new Date().toISOString(),reason:'must-not-expose'}));
  const invalid=id.replace('1234abcd','ffffffff');await writeFile(join(dir,invalid+'.json'),JSON.stringify({...metadata,id:invalid}));
  await writeFile(join(dir,'key'),'secret');await writeFile(join(dir,id+'.tar.gpg.partial'),'incomplete');
  assert.equal((await fetch(base)).status,401);assert.equal((await fetch(base+'/'+id+'/download')).status,401);assert.equal((await fetch(base,{headers:{'X-Jingo-POS':'1'}})).status,401);
  const login=await fetch(await app.getUrl()+'/api/v1/admin/login',{method:'POST',headers:{'Content-Type':'application/json','X-Jingo-Admin':'1',Origin:'http://localhost:3000'},body:JSON.stringify({email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD})});assert.equal(login.status,201);const headers={Cookie:login.headers.get('set-cookie')!.split(';')[0]};
  const response=await fetch(base,{headers}),list=await response.json();assert.equal(list.data.length,1);assert.equal(list.configured,true);assert.equal(list.lastRun.state,'SUCCESS');assert.doesNotMatch(JSON.stringify(list),/must-not-expose|environment|keyFile/);assert.match(response.headers.get('cache-control')||'',/private.*no-store/);
  const download=await fetch(base+'/'+id+'/download',{headers});assert.equal(download.status,200);assert.deepEqual(Buffer.from(await download.arrayBuffer()),bytes);assert.match(download.headers.get('content-disposition')||'',/attachment.*tar.gpg/);assert.match(download.headers.get('cache-control')||'',/no-store/);
  assert.equal((await app.get(DatabaseService).pool.query("SELECT action FROM jingo_audit WHERE action='backup.download'")).rowCount,1);
  for(const name of ['key','setup.json',id+'.tar.gpg.partial',invalid])assert.equal((await fetch(base+'/'+name+'/download',{headers})).status,404);
  await writeFile(join(dir,id+'.restore-test.json'),JSON.stringify({id,sha256:'0'.repeat(64),testedAt:new Date().toISOString()}));assert.equal((await(await fetch(base,{headers})).json()).data[0].restoreTestedAt,undefined);
  await writeFile(join(dir,id+'.restore-test.json'),JSON.stringify({id,sha256:metadata.sha256,testedAt:new Date().toISOString()}));assert.ok((await(await fetch(base,{headers})).json()).data[0].restoreTestedAt);
  await writeFile(join(dir,id+'.tar.gpg'),Buffer.from('truncated'));assert.equal((await(await fetch(base,{headers})).json()).data.length,0);assert.equal((await fetch(base+'/'+id+'/download',{headers})).status,404);
  // Symlinks cannot become download targets (Windows may require elevation to create one).
  await rm(join(dir,id+'.tar.gpg'));try{await symlink(join(dir,'key'),join(dir,id+'.tar.gpg'));assert.equal((await(await fetch(base,{headers})).json()).data.length,0);}catch(e){if((e as NodeJS.ErrnoException).code!=='EPERM')throw e;}
 }finally{await app.close();await rm(dir,{recursive:true,force:true});delete process.env.BACKUP_DIR;}
});
