import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseGLB} from './glb-loader.js';
import {buildCabinR7,correctVehicleFrame,MIRRORED_IDS} from './cabin-r7.js';
import {buildEngineBay,hoodPoint} from './engine-bay.js';
import {buildRecoveryDetails,rearFoldPoint} from './recovery-details.js';
const load=name=>{const b=readFileSync(new URL(name,import.meta.url));return parseGLB(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)).parts;};
const original=load('cruze-full-r4.glb'),base=[...original,...buildEngineBay(),...buildRecoveryDetails()],corrected=correctVehicleFrame(base),extra=buildCabinR7(),all=corrected.concat(extra),byId=new Map(all.map(p=>[p.id,p]));
const cx=id=>{const b=byId.get(id).bounds;return (b[0][0]+b[1][0])/2;};
test('vehicle left is up cross forward: wheel, pedals, instruments, booster share driver side',()=>{
 for(const id of ['steering_wheel','steering_center','steering_column','instrument_cluster','pedal_brake','pedal_accelerator','brake_booster','master_cylinder','brake_reservoir','bay_brake_cap'])assert.ok(cx(id)>0,id);
 assert.ok(cx('plus_glovebox')<0);assert.ok(cx('blower')<0);assert.ok(cx('pedal_accelerator')<cx('pedal_brake'));
 assert.ok(cx('r7_dead_pedal')>cx('pedal_brake'));assert.ok(Math.abs(cx('steering_wheel')-cx('instrument_cluster'))<1e-5,'steering wheel and instrument cluster align within mesh precision');
});
test('reflection preserves topology and reverses triangle winding; unrelated R4 assemblies intact',()=>{
 for(const p of original){const q=byId.get(p.id);if(MIRRORED_IDS.has(p.id)){
  for(let i=0;i<p.positions.length;i++)assert.equal(q.positions[i],i%3===0?-p.positions[i]:p.positions[i],p.id);
  for(let i=0;i<p.indices.length;i+=3)assert.deepEqual(Array.from(q.indices.slice(i,i+3)),[p.indices[i],p.indices[i+2],p.indices[i+1]]);
 }else{assert.deepEqual(q.positions,p.positions,p.id);assert.deepEqual(q.indices,p.indices,p.id);}}
});
test('all cabin groups are represented by unique finite nondegenerate meshes',()=>{
 assert.equal(byId.size,all.length);assert.ok(extra.length>=150);
 for(const id of ['shifter','handbrake','driver','rear_mirror','headliner','obd','cabin_filter','spare_wheel'])assert.ok(extra.some(p=>p.id.includes(id)),id);
 for(const p of extra){assert.equal(p.positions.length,p.normals.length);for(const arr of [p.positions,p.normals])for(const n of arr)assert.ok(Number.isFinite(n),p.id);
  for(const i of p.indices)assert.ok(i<p.positions.length/3,p.id);
  for(let k=0;k<p.indices.length;k+=3){const [a,b,c]=Array.from(p.indices.slice(k,k+3),v=>v*3),u=[0,1,2].map(j=>p.positions[b+j]-p.positions[a+j]),v=[0,1,2].map(j=>p.positions[c+j]-p.positions[a+j]);assert.ok(Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])>1e-10,p.id);}
 }
});
test('R7 downloadable GLB matches the complete corrected web assembly',()=>{
 const exported=load('cruze-full-r7.glb'),map=new Map(exported.map(p=>[p.id,p]));assert.equal(exported.length,all.length);
 for(const p of all){const q=map.get(p.id);assert.ok(q,p.id);assert.deepEqual(q.indices,p.indices,p.id);
  if(p.id==='hood'||p.meta.hoodAttached){for(let i=0;i<p.positions.length;i+=3){const expected=hoodPoint(Array.from(p.positions.slice(i,i+3)));for(let j=0;j<3;j++)assert.ok(Math.abs(q.positions[i+j]-expected[j])<1e-5,p.id);}}
  else assert.deepEqual(q.positions,p.positions,p.id);
 }
});
test('new headrest supports fold with the rear seat; UI has all three cabin controls',()=>{
 for(const p of extra.filter(p=>p.meta.rearFoldAttached)){const c=p.bounds[0].map((v,i)=>(v+p.bounds[1][i])/2),q=rearFoldPoint(c,1);assert.ok(q[2]>c[2],p.id);}
 const html=readFileSync(new URL('index.html',import.meta.url),'utf8'),app=readFileSync(new URL('app.js',import.meta.url),'utf8');
 for(const id of ['driverViewBtn','cabinTopBtn','cabinShellBtn']){assert.ok(html.includes('id="'+id+'"'),id);assert.ok(app.includes("$('#"+id+"').onclick"),id);}
 assert.ok(app.includes('part.meta?.rearFoldAttached'));assert.ok(/cruze-full-r[78]\.glb/.test(html));
});
