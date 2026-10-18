import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildRecoveryDetails,rearFoldPoint,REAR_PIVOT} from './recovery-details.js';
import {parseGLB} from './glb-loader.js';
const load=n=>{const b=readFileSync(new URL(n,import.meta.url));return parseGLB(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));};
test('R6+ export preserves each R6 mesh and adds the identical web geometry',()=>{
 const r6=load('cruze-full-r6.glb'),plus=load('cruze-full-r6-plus.glb'),extra=buildRecoveryDetails(),byId=new Map(plus.parts.map(p=>[p.id,p]));
 assert.equal(plus.parts.length,r6.parts.length+extra.length);assert.equal(byId.size,plus.parts.length);
 for(const p of r6.parts){assert.deepEqual(byId.get(p.id).positions,p.positions,p.id);assert.deepEqual(byId.get(p.id).indices,p.indices,p.id);}
 for(const p of extra){assert.deepEqual(byId.get(p.id).positions,p.positions,p.id);for(const arr of [p.positions,p.normals])for(const v of arr)assert.ok(Number.isFinite(v));for(const i of p.indices)assert.ok(i<p.positions.length/3);}
});
test('rear folding preserves hinge and radius, and moves headrests forward',()=>{
 for(let a=0;a<=1;a+=.1){assert.deepEqual(rearFoldPoint(REAR_PIVOT,a),REAR_PIVOT);const p=[4,4,-23.3],q=rearFoldPoint(p,a);assert.ok(Math.abs(Math.hypot(p[1]+.15,p[2]+23)-Math.hypot(q[1]+.15,q[2]+23))<1e-12);}
 const q=rearFoldPoint([4,4,-23.3],1);assert.ok(q[1]<1);assert.ok(q[2]>-20);
});
