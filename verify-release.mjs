import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {auditMotion,loadMotionParts} from './motion-audit.mjs';
const root=new URL('./',import.meta.url),output=new URL('release-validation.json',root);
const save=value=>writeFileSync(output,JSON.stringify(value,null,2)+'\n');
const hash=name=>{const bytes=readFileSync(new URL(name,root));return createHash('sha256').update(name.endsWith('.glb')?bytes:bytes.toString('utf8').replace(/\r\n/g,'\n')).digest('hex');};
// Invalidate an earlier success before any operation that could fail.
save({revision:'R10.1',passed:false,status:'running'});
try{
 const archives=JSON.parse(readFileSync(new URL('archive-sha256.json',root)));
 for(const [name,expected] of Object.entries(archives.files))if(hash(name)!==expected)throw Error('Preserved archive changed: '+name);
 const tests=readdirSync(root).filter(n=>n.endsWith('.test.mjs')).sort();
 const result=spawnSync(process.execPath,['--test','--test-reporter=tap',...tests],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024});
 process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');
 if(result.error||result.status!==0)throw result.error||Error('Regression tests failed');
 const passed=Number(result.stdout.match(/^# pass (\d+)$/m)?.[1]);
 if(!passed)throw Error('Missing test summary');
 const motion=auditMotion(loadMotionParts());if(!motion.passed)throw Error(JSON.stringify(motion.failures));
 writeFileSync(new URL('motion-audit-r10.json',root),JSON.stringify(motion,null,2)+'\n');
 const inputs=readdirSync(root).filter(n=>/\.(?:js|mjs|html|css|glb)$/.test(n)||['package.json','learning.json','oem-audit-r10.json','r10-report.json','archive-sha256.json'].includes(n)).sort();
 save({revision:'R10.1',baseline:archives.baseline,checkedAt:new Date().toISOString(),passed:true,testsPassed:passed,textHashPolicy:'UTF-8 with LF newlines; GLBs hashed as raw bytes',archivesPreserved:Object.keys(archives.files).length,motion,sha256:Object.fromEntries(inputs.map(n=>[n,hash(n)]))});
 console.log('Release verified: '+passed+' tests; '+motion.partPoses+' sampled part poses; all archives unchanged.');
}catch(error){save({revision:'R10.1',passed:false,status:'failed',error:error.message});throw error;}
