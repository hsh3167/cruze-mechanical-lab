import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseGLB} from './glb-loader.js';
import {upgradeInternalsR9,R9_SCOPE} from './internals-r9.js';
const load=n=>{const b=readFileSync(new URL(n,import.meta.url));return parseGLB(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)).parts.map(p=>({...p,system:p.meta.system,name:p.meta.label}));};
const base=load('cruze-full-r7.glb'),r9=upgradeInternalsR9(base),map=new Map(r9.parts.map(p=>[p.id,p]));
test('R9 covers the audited major assemblies without duplicate IDs',()=>{
 assert.equal(map.size,r9.parts.length);assert.ok(r9.added>=100);
 for(const id of ['r9_starter','r9_throttle','r9_chain_tensioner','r9_blend_door','r9_condensate_drain','r9_srs_ecu','r9_valvebody','r9_trans_filter','r9_door_guide_front_driver'])assert.ok(map.has(id),id);
 assert.equal(Object.keys(r9.groups).length,7);
});
test('new and refined surfaces have finite normals and nondegenerate indexed triangles',()=>{
 for(const p of r9.parts.filter(p=>p.meta.source==='r9-internals'||p.meta.r9Refined)){
 for(const a of [p.positions,p.normals])for(const v of a)assert.ok(Number.isFinite(v),p.id);
 for(const i of p.indices)assert.ok(i<p.positions.length/3,p.id);
 for(let k=0;k<p.indices.length;k+=3){const [a,b,c]=Array.from(p.indices.slice(k,k+3),i=>i*3),u=[0,1,2].map(j=>p.positions[b+j]-p.positions[a+j]),v=[0,1,2].map(j=>p.positions[c+j]-p.positions[a+j]);assert.ok(Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])>1e-12,p.id);}
 }
});
test('animation geometry and all previously dimensioned wheel meshes remain untouched',()=>{
 for(const p of base.filter(p=>/^(piston|rod\d|crank$|cam_|valve_|tire_|spring_|damper_|rim_)/.test(p.id)))assert.deepEqual(map.get(p.id).positions,p.positions,p.id);
 for(const p of r9.parts.filter(p=>p.id.startsWith('r9_rear_back_insert_')))assert.ok(p.meta.rearFoldAttached);
});
test('rounded replacements keep original packaging envelopes within mesh precision',()=>{
 for(const id of r9.refined.filter(id=>!['hvac_case','blower'].includes(id))){const before=base.find(p=>p.id===id),after=map.get(id);for(let j=0;j<2;j++)for(let k=0;k<3;k++)assert.ok(Math.abs(before.bounds[j][k]-after.bounds[j][k])<1e-5,id);}
});
test('R9 metric download contains all new assemblies and retains wheelbase',()=>{
 const exp=load('cruze-full-r9.glb'),e=new Map(exp.map(p=>[p.id,p]));for(const p of r9.parts.filter(p=>p.meta.source==='r9-internals'))assert.ok(e.has(p.id),p.id);
 const c=id=>(e.get(id).bounds[0][2]+e.get(id).bounds[1][2])/2;assert.ok(Math.abs(c('tire_FR')-c('tire_RR')-2.685)<.00001);
 assert.equal(exp.length,JSON.parse(readFileSync(new URL('r9-report.json',import.meta.url))).exportMeshes);
});
test('internal inspection views, current downloads and scope notes are present',()=>{
 const html=readFileSync(new URL('index.html',import.meta.url),'utf8'),app=readFileSync(new URL('app.js',import.meta.url),'utf8');for(const id of ['cabinDetailBtn','hvacDetailBtn']){assert.ok(html.includes(id));assert.ok(app.includes(id));}
 assert.ok(html.includes('cruze-full-r9.glb'));assert.ok(R9_SCOPE.limits.includes('No claim of complete OEM BOM'));
});
