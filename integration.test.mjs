import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parseGLB} from './glb-loader.js';
import {pistonPose,valveLift} from './mechanics.js';
import {buildEngineBay,hoodPoint,HOOD_PIVOT} from './engine-bay.js';
const bytes=readFileSync(new URL('./cruze-full-r4.glb',import.meta.url));
const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
const model=parseGLB(buffer),info=JSON.parse(readFileSync(new URL('./learning.json',import.meta.url)));
test('original R4 geometry is intact, unique, and all 17 systems survive',()=>{
 assert.equal(model.asset.extras.revision,'R4');assert.equal(model.parts.length,465);
 assert.equal(new Set(model.parts.map(p=>p.id)).size,465);
 assert.equal(new Set(model.parts.map(p=>p.meta.system)).size,17);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),info.provenance.r4_sha256);
 for(const p of model.parts){assert.equal(p.positions.length,p.normals.length,p.id);assert.equal(p.indices.length%3,0,p.id);
  for(const x of p.positions)assert.ok(Number.isFinite(x),p.id);
  for(const x of p.normals)assert.ok(Number.isFinite(x),p.id);
  for(const i of p.indices)assert.ok(i>=0&&i<p.positions.length/3,p.id);
 }
});
test('V2 adds only missing combustion effects, without duplicate assemblies',()=>{
 const ids=new Set(model.parts.map(p=>p.id));assert.equal(info.combustion.length,4);
 for(const p of info.combustion){assert.ok(!ids.has(p.id));ids.add(p.id);assert.equal(p.anim.kind,'combustion')}
 assert.equal(ids.size,469);
 for(const id of ['piston1','rod1','waterpump','wp_shaft','th_valve','oilpump','coilmodule'])assert.ok(ids.has(id),id);
});
test('all 19 cooling paths match the original tube cross-section centres',()=>{
 assert.equal(Object.keys(info.coolingPaths).length,19);
 for(const [name,path] of Object.entries(info.coolingPaths)){
  const p=model.parts.find(p=>p.meta.flowEdge===name);assert.ok(p,name);assert.equal(p.positions.length/27,path.length,name);
  for(let ring=0;ring<path.length;ring++)for(let axis=0;axis<3;axis++){
   let centre=0;for(let i=0;i<8;i++)centre+=p.positions[ring*27+i*3+axis]/8;
   assert.ok(Math.abs(centre-path[ring][axis])<1e-6,`${name} ring ${ring}`);
  }
 }
});
test('slider-crank maintains rod length and exact stroke throughout two revolutions',()=>{
 const k=info.kinematics;
 for(let i=0;i<4;i++)for(let deg=0;deg<=720;deg+=2){const p=pistonPose(k,i,deg*Math.PI/180);assert.ok(Math.abs(Math.hypot(p.py-p.cy,p.cz)-k.conrod)<1e-12)}
 assert.ok(Math.abs(pistonPose(k,0,0).py-pistonPose(k,0,Math.PI).py-2*k.crankRadius)<1e-12);
 for(let i=0;i<4;i++)for(let deg=0;deg<=720;deg+=2)for(const side of ['intake','exhaust']){const h=valveLift(k,i,deg*Math.PI/180,side);assert.ok(h>=0&&h<=.130001)}
});
test('R6 additions remain finite, nondegenerate and unique across the combined model',()=>{
 const additions=buildEngineBay(),ids=new Set([...model.parts,...info.combustion].map(p=>p.id));
 assert.ok(additions.length>=60);
 for(const p of additions){assert.ok(!ids.has(p.id),p.id);ids.add(p.id);
  assert.ok(info.systemLabels[p.system],p.id);assert.ok(p.meta.engineBay);
  assert.equal(p.positions.length,p.normals.length);assert.equal(p.indices.length%3,0);
  for(const a of [p.positions,p.normals])for(const n of a)assert.ok(Number.isFinite(n),p.id);
  for(const i of p.indices)assert.ok(i>=0&&i<p.positions.length/3,p.id);
  for(let k=0;k<p.indices.length;k+=3){const [a,b,c]=Array.from(p.indices.slice(k,k+3),x=>x*3),u=[0,1,2].map(j=>p.positions[b+j]-p.positions[a+j]),v=[0,1,2].map(j=>p.positions[c+j]-p.positions[a+j]);assert.ok(Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])>1e-10,p.id)}
 }
 for(const id of ['washer_tank','washer_cap','oil_cap','upper_support','fan_shroud','battery_positive','ground_cable','intake_snorkel','hood_frame'])assert.ok(ids.has('bay_'+id),id);
});
test('hood motion preserves the hinge axis and raises its front edge',()=>{
 assert.deepEqual(hoodPoint(HOOD_PIVOT),HOOD_PIVOT);
 const p=[2,3.1,5],q=hoodPoint(p);assert.ok(q[1]>11);
 assert.ok(Math.abs(Math.hypot(...p.map((v,i)=>v-HOOD_PIVOT[i]))-Math.hypot(...q.map((v,i)=>v-HOOD_PIVOT[i])))<1e-12);
 assert.ok(hoodPoint(p,false).every((v,i)=>Math.abs(v-p[i])<1e-12));
});
test('R6 exchange GLB preserves all original geometry with only the hood posed open',()=>{
 const b=readFileSync(new URL('./cruze-full-r6.glb',import.meta.url)),r6=parseGLB(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
 assert.equal(r6.parts.length,465+buildEngineBay().length);assert.equal(new Set(r6.parts.map(p=>p.id)).size,r6.parts.length);
 const byId=new Map(r6.parts.map(p=>[p.id,p]));
 for(const p of model.parts){const q=byId.get(p.id);assert.ok(q,p.id);assert.deepEqual(q.indices,p.indices,p.id);
  if(p.id!=='hood')assert.deepEqual(q.positions,p.positions,p.id);
  else for(let i=0;i<p.positions.length;i+=3){const posed=hoodPoint([...p.positions.slice(i,i+3)]);for(let j=0;j<3;j++)assert.ok(Math.abs(posed[j]-q.positions[i+j])<1e-5)}
 }
});
test('all local HTML assets exist and runtime has no external dependencies',()=>{
 const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
 for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){const path=match[1];if(path.startsWith('http')||path.startsWith('#'))continue;assert.ok(existsSync(new URL(path.split('?')[0],import.meta.url)),path)}
 for(const filename of ['app.js','glb-loader.js','mechanics.js'])assert.ok(!/https?:\/\//.test(readFileSync(new URL(filename,import.meta.url),'utf8')),filename);
});
