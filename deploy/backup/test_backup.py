import contextlib
import copy
import io
import json
from pathlib import Path
import shutil
import subprocess
import os
import tarfile
import tempfile
import unittest
from unittest.mock import patch
import jingo_backup as b

GPG = shutil.which('gpg') or 'C:/Program Files/Git/usr/bin/gpg.exe'


class BackupTests(unittest.TestCase):
    def setUp(self):
        # Git's MSYS GnuPG expects POSIX paths even when launched by Windows Python.
        if os.name == 'nt' and '/Git/' in GPG.replace('\\','/'):
            original = subprocess.Popen
            def popen(args, **kwargs):
                def path(value):
                    value=str(value).replace('\\','/')
                    return '/'+value[0].lower()+value[2:] if len(value)>2 and value[1:3]==':/' else value
                return original([args[0],*[path(x) for x in args[1:]]],**kwargs)
            mocked=patch.object(b.subprocess,'Popen',side_effect=popen)
            mocked.start();self.addCleanup(mocked.stop)
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.payload = self.root / 'payload'
        self.payload.mkdir()
        self.key = self.root / 'key'
        self.key.write_text('a' * 64 + '\n')
        self.key.chmod(0o600)
        for name in b.CONTENTS - {'media.tar.gz'}:
            (self.payload / name).write_bytes(b'private-data')
        with tarfile.open(self.payload / 'media.tar.gz', 'w:gz') as archive:
            item = tarfile.TarInfo('.smtp-key')
            item.size = 32
            archive.addfile(item, io.BytesIO(b'x' * 32))
        self.manifest = {'format':1,'id':'jingo-backup-20261101T031500Z-1234abcd','createdAt':b.utc(),'snapshotAt':b.utc(),'revision':'b'*40,
            'appImage':'sha256:'+'c'*64,'postgresImage':'sha256:'+'d'*64,
            'snapshot':dict(orders=5,carts=2,products=3,payments=4,ticketFiles=8,databaseBytes=100,postgresVersion=170006,keyRequired=True),
            'files':{name:{'bytes':(self.payload/name).stat().st_size,'sha256':b.fingerprint(self.payload/name)} for name in b.CONTENTS}}

    def tearDown(self):
        self.temp.cleanup()

    def crypto(self):
        return b.Crypto(self.key, self.root, GPG)

    def test_real_gpg_roundtrip_and_wrong_key(self):
        target = self.root / 'backup.gpg'
        self.crypto().encrypt(self.payload, self.manifest, target)
        self.assertNotIn(b'private-data', target.read_bytes())
        output = self.root/'restored';output.mkdir()
        self.assertEqual(self.crypto().unpack(target, output),self.manifest)
        for name in b.CONTENTS:
            self.assertEqual((output/name).read_bytes(),(self.payload/name).read_bytes())
        self.assertFalse((output/'key').exists())
        self.key.write_text('e'*64+'\n')
        bad=self.root/'bad';bad.mkdir()
        with self.assertRaises((b.BackupError,tarfile.TarError)):
            self.crypto().unpack(target,bad)

    def test_gpg_rejects_corruption_and_checksum_mismatch(self):
        target=self.root/'backup.gpg'
        self.crypto().encrypt(self.payload,self.manifest,target)
        data=bytearray(target.read_bytes());data[-15]^=1;target.write_bytes(data)
        out=self.root/'bad';out.mkdir()
        with self.assertRaises((b.BackupError,tarfile.TarError)):
            self.crypto().unpack(target,out)
        self.manifest['files']['database.dump']['sha256']='0'*64
        self.crypto().encrypt(self.payload,self.manifest,target)
        out=self.root/'bad-hash';out.mkdir()
        with self.assertRaisesRegex(b.BackupError,'checksum'):
            self.crypto().unpack(target,out)

    def test_media_rejects_traversal_links_and_missing_key(self):
        for name,kind in [('../escape',tarfile.REGTYPE),('/absolute',tarfile.REGTYPE),('link',tarfile.SYMTYPE)]:
            target=self.root/'unsafe.tar.gz'
            with tarfile.open(target,'w:gz') as archive:
                item=tarfile.TarInfo(name);item.type=kind;item.linkname='../escape';archive.addfile(item)
            with self.assertRaises(b.BackupError):b.validate_media(target,False)
        with tarfile.open(target,'w:gz'):pass
        with self.assertRaisesRegex(b.BackupError,'key is missing'):b.validate_media(target,True)

    def test_manifest_requires_every_payload_and_image_id(self):
        for field in ('database.dump','environment.env'):
            invalid=copy.deepcopy(self.manifest);del invalid['files'][field]
            with self.assertRaises(b.BackupError):b.validate_manifest(invalid)
        invalid=copy.deepcopy(self.manifest);invalid['appImage']='jingo:latest'
        with self.assertRaises(b.BackupError):b.validate_manifest(invalid)

    def manager(self):
        project=self.root/'project';project.mkdir();(project/'.env').write_text('secret')
        return b.Manager(dict(projectDir=str(project),backupDir=str(self.root/'backups'),stateDir=str(self.root/'state'),keyFile=str(self.key),keep=7))

    def test_retention_preserves_unknown_and_newest_seven(self):
        manager=self.manager()
        for day in range(1,10):
            identifier=f'jingo-backup-202611{day:02}T031500Z-1234abcd'
            (manager.out/(identifier+'.tar.gpg')).write_bytes(b'ciphertext')
            b.safe_json(manager.out/(identifier+'.json'),{'id':identifier,'verifiedAt':b.utc()})
        (manager.out/'keep-me.tar.gpg').write_text('unknown')
        (manager.out/'jingo-backup-20261101T031500Z-ffffffff.tar.gpg.partial').write_text('partial')
        manager.prune()
        self.assertEqual(len(list(manager.out.glob('*.json'))),7)
        self.assertTrue((manager.out/'keep-me.tar.gpg').exists())
        self.assertEqual(len(list(manager.out.glob('*.partial'))),1)

    def test_failed_snapshot_always_resumes_originally_running_apps(self):
        manager=self.manager();media=self.root/'media';media.mkdir()
        found={name:{'Id':str(index)*64,'Image':'sha256:'+'a'*64,'State':{'Running':name!='worker'},'Config':{'Labels':{'com.docker.compose.project':'jingo','com.docker.compose.service':name}}} for index,name in enumerate(('postgres','api','worker','web'),1)}
        calls=[]
        def run(args,**kwargs):
            calls.append([str(x) for x in args])
            if kwargs.get('label')=='Final media copy':raise b.BackupError('Simulated disk failure')
            return b''
        manager.runner.run=run
        def resume():
            journal=manager.state/'resume.json'
            if journal.exists():
                record=json.loads(journal.read_text());self.assertEqual([x['service'] for x in record['containers']],['api','web']);calls.append(['RESUME']);journal.unlink()
        with patch.object(b,'FileLock',lambda _:contextlib.nullcontext()),patch.object(manager,'discover',return_value=(found,media)),patch.object(manager,'psql',return_value=json.dumps(self.manifest['snapshot']).encode()),patch.object(manager,'resume',side_effect=resume),patch.object(b.shutil,'disk_usage',return_value=shutil._ntuple_diskusage(10**12,0,10**12)):
            with self.assertRaisesRegex(b.BackupError,'Simulated'):manager.backup()
        self.assertIn(['RESUME'],calls)
        self.assertEqual(json.loads((manager.out/'last-run.json').read_text())['state'],'FAILED')
        self.assertFalse(list(manager.out.glob('*.tar.gpg')))

    def test_recovery_compose_isolated_volumes_network_and_literal_dollars(self):
        source={'services':{name:{'image':'old','build':'.','environment':{'SECRET':'a$b'},'networks':['default']} for name in ('api','web','worker','postgres','redis')},'networks':{'default':{'external':True,'name':'production'}}}
        source['services']['api']['volumes']=[{'type':'volume','source':'media_data','target':'/app/data/media'}]
        result=b.recovery_compose(source,'isolated','new-pg','new-media','password','app-id','pg-id')
        self.assertEqual(result['volumes']['postgres_data'],{'external':True,'name':'new-pg'})
        self.assertEqual(result['networks']['default']['name'],'isolated-default')
        self.assertEqual(result['services']['api']['environment']['SECRET'],'a$$b')
        self.assertNotIn('build',result['services']['api'])
        self.assertIn('password@postgres',result['services']['api']['environment']['DATABASE_URL'])
        source['services']['web']['volumes']=[{'type':'bind','source':'/','target':'/host'}]
        with self.assertRaises(b.BackupError):b.recovery_compose(source,'isolated','pg','media','pw','app','pg')

    def test_restore_test_uses_new_resources_and_cleans_up_on_count_mismatch(self):
        manager=self.manager()
        archive=self.root/'archive.gpg';archive.write_bytes(b'fixture')
        calls=[];token='123456abcdef'
        def unpack(_,work):
            for name in b.CONTENTS:shutil.copyfile(self.payload/name,Path(work)/name)
            return self.manifest
        def run(args,**kwargs):
            args=[str(x) for x in args];calls.append(args)
            label=kwargs.get('label')
            if label=='Verify recovery volume':return json.dumps([{'Labels':{'jingo.recovery':token}}]).encode()
            if label=='Inspect recovery container':return json.dumps([{'Config':{'Labels':{'jingo.recovery':token}}}]).encode()
            if label=='Recovery database readiness':return b'170006'
            if label=='Restored row counts':return json.dumps({**self.manifest['snapshot'],'orders':999}).encode()
            return b''
        manager.runner.run=run
        with patch.object(b,'FileLock',lambda _:contextlib.nullcontext()),patch.object(manager.crypto,'unpack',side_effect=unpack),patch.object(b.secrets,'token_hex',side_effect=lambda n:token if n==6 else 'f'*64):
            with self.assertRaisesRegex(b.BackupError,'row count mismatch'):manager.restore(archive)
        runs=[c for c in calls if c[:2]==['docker','run']]
        self.assertEqual(len(runs),1)
        self.assertIn('none',runs[0]);self.assertNotIn('-p',runs[0])
        self.assertTrue(any(c[:3]==['docker','rm','--force'] for c in calls))
        self.assertEqual(len([c for c in calls if c[:3]==['docker','volume','rm']]),2)
        self.assertFalse(any('production' in str(c) for c in calls))

    def test_prepare_restore_keeps_only_new_volumes_and_does_not_start_website(self):
        manager=self.manager();calls=[];token='123456abcdef'
        source={'services':{n:{'image':'old','environment':{},'volumes':[]} for n in ('api','web','worker','postgres','redis')}}
        def unpack(_,work):
            for name in b.CONTENTS:shutil.copyfile(self.payload/name,Path(work)/name)
            (Path(work)/'compose.json').write_text(json.dumps(source))
            return self.manifest
        def run(args,**kwargs):
            args=[str(x) for x in args];calls.append(args);label=kwargs.get('label')
            if label=='Verify recovery volume':return json.dumps([{'Labels':{'jingo.recovery':token}}]).encode()
            if label=='Inspect recovery container':return json.dumps([{'Config':{'Labels':{'jingo.recovery':token}}}]).encode()
            if label=='Recovery database readiness':return b'170006'
            if label=='Restored row counts':return json.dumps(self.manifest['snapshot']).encode()
            if label=='Restore isolated media':self.assertIn('-i',args);self.assertIsNotNone(kwargs['source']);self.assertIn('none',args)
            return b''
        manager.runner.run=run;output=self.root/'recovered'
        with patch.object(b,'FileLock',lambda _:contextlib.nullcontext()),patch.object(manager.crypto,'unpack',side_effect=unpack),patch.object(b.secrets,'token_hex',side_effect=lambda n:token if n==6 else 'f'*64):
            manager.restore(self.root/'backup.gpg',output)
        compose=json.loads((output/'compose.yaml').read_text())
        self.assertEqual(compose['name'],'jingo-recovery-'+token)
        self.assertFalse(any(c[:3]==['docker','volume','rm'] for c in calls))
        self.assertTrue(any(c[:3]==['docker','rm','--force'] for c in calls))
        self.assertFalse(any(c[:2]==['docker','compose'] for c in calls))
        self.assertTrue(any(b.RECOVERY_SQL in c for c in calls))
        self.assertEqual((output/'environment.original.env').read_bytes(),b'private-data')


if __name__=='__main__':unittest.main()
