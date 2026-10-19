import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditMotion,loadMotionParts} from './motion-audit.mjs';
import {motionMatrix,operationMatrix,point} from './motion-matrix.js';
import {motionDescriptor,doorPivot,rotateYPoint} from './refinement-r10.js';

test('R10.1 sampled renderer poses preserve anchors and finite non-inverted geometry',()=>{const r=auditMotion(loadMotionParts());assert.equal(r.passed,true,JSON.stringify(r.failures));assert.deepEqual(r.groups.map(g=>g.states),[117,121,68]);assert.ok(r.partPoses>10000);assert.ok(r.maxAnchorErrorMM<.01);});
test('Door glass lowers in local coordinates before rotating about either side hinge',()=>{for(const assembly of ['front:1','front:-1','rear:1','rear:-1']){const pivot=doorPivot(assembly),p={meta:{doorAssembly:assembly,windowMoving:true}},q=[pivot[0],4,pivot[2]-5],m=motionMatrix(motionDescriptor(p,{doorOpen:1,windowOpen:1})),expected=rotateYPoint([q[0],q[1]-3.45,q[2]],pivot,-Number(assembly.split(':')[1])*Math.PI/3);assert.ok(Math.hypot(...point(m,q).map((v,i)=>v-expected[i]))<1e-5);}});
test('Collapsed links fail explicitly and renderer uses the verified shared transform',()=>{assert.throws(()=>operationMatrix({kind:'link',from:[0,0,0],to:[0,0,0],target:[1,0,0]}),/coincident/);const app=readFileSync(new URL('app.js',import.meta.url),'utf8');assert.ok(app.includes('pose=motionMatrix(motionDescriptor(part,state),pose)'));});
