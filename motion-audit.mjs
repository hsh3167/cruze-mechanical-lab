import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {parseGLB} from './glb-loader.js';
import {motionDescriptor,serviceOffset,SERVICES,doorPivot} from './refinement-r10.js';
import {motionMatrix,operationMatrix,point,translation,multiply} from './motion-matrix.js';
import {SCALE} from './chassis-r8.js';

// Export metadata is in model units; exported positions are in metres.
export function loadMotionParts(){const b=readFileSync(new URL('cruze-full-r10.glb',import.meta.url));return parseGLB(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)).parts.map(p=>({...p,positions:Float32Array.from(p.positions,v=>v*1000/SCALE.mmPerUnit),bounds:p.bounds.map(v=>v.map(x=>x*1000/SCALE.mmPerUnit))}));}
export function auditMotion(parts){let poses=0,vertices=0,maxAnchorErrorMM=0;const failures=[],groups=[];
 const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]))*SCALE.mmPerUnit;
 function check(condition,message){if(!condition&&failures.length<50)failures.push(message);}
 function anchor(a,b,label){const error=distance(a,b);maxAnchorErrorMM=Math.max(maxAnchorErrorMM,error);check(error<.01,label+' anchor drift '+error+'mm');}
 const road=[];for(let steer=-30;steer<=30;steer+=5)for(let travel=-40;travel<=40;travel+=10)road.push({steer,travel});
 const doors=[];for(let d=0;d<=10;d++)for(let w=0;w<=10;w++)doors.push({doorOpen:d/10,windowOpen:w/10});
 const services=[];for(const service of Object.keys(SERVICES))for(let step=0;step<=16;step++)services.push({service,serviceProgress:step/16});
 for(const [name,states,filter] of [['steering-suspension',road,p=>p.meta.wheelTag||p.meta.link||/^steering_(wheel|center)$/.test(p.id)],['doors-windows',doors,p=>p.meta.doorAssembly],['service-stages',services,p=>p.meta.service]]){
  let groupPoses=0;for(const state of states)for(const p of parts.filter(filter)){
   if(state.service&&state.service!==p.meta.service)continue;
   const ops=motionDescriptor(p,state),matrix=multiply(translation(serviceOffset(p,state.service,state.serviceProgress||0)),motionMatrix(ops));
   check(Array.from(matrix).every(Number.isFinite),name+' '+p.id+' matrix');
   // Affine determinant: a singular pose breaks inverse-transpose normals in WebGL.
   const m=matrix,det=m[0]*(m[5]*m[10]-m[9]*m[6])-m[4]*(m[1]*m[10]-m[9]*m[2])+m[8]*(m[1]*m[6]-m[5]*m[2]);
   check(det>1e-6,name+' '+p.id+' inverted/singular pose');
   for(let i=0;i<p.positions.length;i+=3){const q=point(matrix,p.positions.subarray(i,i+3));check(q.every(Number.isFinite),name+' '+p.id+' vertex');vertices++;}
   for(const op of ops){const transform=operationMatrix(op);if(op.kind==='link'){anchor(point(transform,op.from),op.from,p.id+' inboard');anchor(point(transform,op.to),op.target,p.id+' outboard');}if(op.kind==='scaleY')anchor(point(transform,op.pivot),op.pivot,p.id+' top');}
   if(p.meta.doorAssembly){const pivot=doorPivot(p.meta.doorAssembly);anchor(point(motionMatrix(ops.filter(op=>op.kind==='rotateY')),pivot),pivot,p.id+' hinge');}
   poses++;groupPoses++;
  }groups.push({name,states:states.length,partPoses:groupPoses});
 }
 return {revision:'R10.1',baseline:'R10',method:'Sampled rendered Float32 affine transforms and every vertex; not a collision test',groups,partPoses:poses,transformedVertices:vertices,maxAnchorErrorMM,toleranceMM:.01,passed:failures.length===0,failures,remaining:['Continuous swept-volume and triangle collision detection','Real vehicle mounting coordinates, steering geometry and loads','Korean VIN/RPO fitment, complete BOM and service certification']};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const report=auditMotion(loadMotionParts());writeFileSync(new URL('motion-audit-r10.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;}
