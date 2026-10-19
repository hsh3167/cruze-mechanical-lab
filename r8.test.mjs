import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseGLB} from './glb-loader.js';
import {upgradeChassisR8,SCALE} from './chassis-r8.js';
const load=n=>{const b=readFileSync(new URL(n,import.meta.url));return parseGLB(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)).parts;};
const base=load('cruze-full-r7.glb').map(p=>({...p,system:p.meta.system,name:p.meta.label})),parts=upgradeChassisR8(base),map=new Map(parts.map(p=>[p.id,p])),mm=SCALE.mmPerUnit;
const cen=p=>p.bounds[0].map((v,i)=>(v+p.bounds[1][i])/2);
test('published wheelbase, front/rear tracks and 205/60R16 tyre envelope within 0.1mm',()=>{
 const centers={};
 for(const tag of ['FL','FR','RL','RR']){const p=map.get('tire_'+tag),d=p.bounds[1].map((v,i)=>(v-p.bounds[0][i])*mm);centers[tag]=cen(p);
 assert.ok(Math.abs(d[0]-205)<.1);assert.ok(Math.abs(d[1]-652.4)<.1);assert.ok(Math.abs(d[2]-652.4)<.1);}
 assert.ok(Math.abs((centers.FR[0]-centers.FL[0])*mm-1545)<.1);
 assert.ok(Math.abs((centers.RR[0]-centers.RL[0])*mm-1560)<.1);
 assert.ok(Math.abs((centers.FR[2]-centers.RR[2])*mm-2685)<.1);
});
test('R8 geometry is finite, uniquely identified, indexed and nondegenerate',()=>{
 assert.equal(map.size,parts.length);
 for(const p of parts.filter(p=>p.meta.source==='r8-chassis')){
 for(const a of [p.positions,p.normals])for(const v of a)assert.ok(Number.isFinite(v),p.id);
 for(const i of p.indices)assert.ok(i<p.positions.length/3,p.id);
 for(let k=0;k<p.indices.length;k+=3){const [a,b,c]=Array.from(p.indices.slice(k,k+3),i=>i*3),u=[0,1,2].map(j=>p.positions[b+j]-p.positions[a+j]),v=[0,1,2].map(j=>p.positions[c+j]-p.positions[a+j]);assert.ok(Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])>1e-12,p.id);}
 }
});
test('cabin, engine and cooling geometry preserved; driver remains on vehicle left',()=>{
 for(const p of base.filter(p=>['engine','cooling','interior'].includes(p.meta.system)))assert.deepEqual(map.get(p.id).positions,p.positions,p.id);
 assert.ok(cen(map.get('steering_wheel'))[0]>0);
});
test('R8 GLB is in metres and matches runtime geometry within 0.01mm',()=>{
 const exp=load('cruze-full-r8.glb'),ex=new Map(exp.map(p=>[p.id,p]));assert.equal(exp.length,parts.length);
 for(const p of parts){const q=ex.get(p.id);assert.ok(q,p.id);for(let i=0;i<p.positions.length;i++)assert.ok(Math.abs(q.positions[i]-p.positions[i]*mm/1000)<.00001,p.id);}
});
test('dimension source, assumptions and suspension view shipped',()=>{
 const html=readFileSync(new URL('index.html',import.meta.url),'utf8'),report=JSON.parse(readFileSync(new URL('r8-report.json',import.meta.url)));
 assert.ok(html.includes('suspensionViewBtn'));assert.ok(html.includes('cruze-full-r8.glb'));assert.equal(report.scale.frontTrackMM,1545);assert.ok(report.scope.includes('unconfirmed'));
});
