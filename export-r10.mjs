import {upgradeR10,materialFor} from './refinement-r10.js';
import {upgradeInternalsR9,R9_SCOPE} from './internals-r9.js';
import {upgradeChassisR8,SCALE} from './chassis-r8.js';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parseGLB} from './glb-loader.js';
import {buildEngineBay,hoodPoint} from './engine-bay.js';
import {buildRecoveryDetails} from './recovery-details.js';
import {buildCabinR7,correctVehicleFrame,VEHICLE_FRAME,MIRRORED_IDS} from './cabin-r7.js';
const bytes=readFileSync(new URL('./cruze-full-r4.glb',import.meta.url));
const info=JSON.parse(readFileSync(new URL('./learning.json',import.meta.url)));
const raw=parseGLB(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)).parts;
for(const p of raw){const d=info.descriptions[p.id]||{};p.name=p.meta.label||d.name||p.id;p.description=d.description||'';p.system=p.meta.system;p.category=info.systemLabels[p.system];}
const detail=upgradeInternalsR9(upgradeChassisR8(correctVehicleFrame([...raw,...buildEngineBay(),...buildRecoveryDetails()]).concat(buildCabinR7())));const refinement=upgradeR10(detail.parts);const parts=refinement.parts;
const doc={asset:{version:'2.0',generator:'Cruze Mechanical Lab R10',extras:{revision:'R10',vehicleFrame:VEHICLE_FRAME}},scene:0,scenes:[{nodes:[]}],nodes:[],meshes:[],materials:[],accessors:[],bufferViews:[],buffers:[{byteLength:0}]};
const chunks=[];let offset=0;
function accessor(arr,type,target,min,max){const data=Buffer.from(arr.buffer,arr.byteOffset,arr.byteLength),pad=Buffer.alloc((4-data.length%4)%4),view=doc.bufferViews.length;doc.bufferViews.push({buffer:0,byteOffset:offset,byteLength:data.length,target});chunks.push(data,pad);offset+=data.length+pad.length;const id=doc.accessors.length;doc.accessors.push({bufferView:view,componentType:type==='SCALAR'?5125:5126,count:arr.length/(type==='VEC3'?3:1),type,...(min?{min,max}:{})});return id;}
for(const part of parts){let p=part;
 if(p.id==='hood'||p.meta.hoodAttached){const positions=p.positions.slice(),normals=p.normals.slice(),lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity],a=-65*Math.PI/180;
  for(let i=0;i<positions.length;i+=3){const q=hoodPoint(Array.from(positions.slice(i,i+3)));for(let j=0;j<3;j++){positions[i+j]=q[j];lo[j]=Math.min(lo[j],positions[i+j]);hi[j]=Math.max(hi[j],positions[i+j]);}const y=normals[i+1],z=normals[i+2];normals[i+1]=Math.cos(a)*y-Math.sin(a)*z;normals[i+2]=Math.sin(a)*y+Math.cos(a)*z;}
  p={...p,positions,normals,bounds:[lo,hi]};
 }
 const material=doc.materials.length;doc.materials.push({name:p.name,doubleSided:true,alphaMode:(p.opacity??1)<1?'BLEND':'OPAQUE',pbrMetallicRoughness:{baseColorFactor:[1,3,5].map(i=>parseInt(p.color.slice(i,i+2),16)/255).concat(p.opacity??1),metallicFactor:materialFor(p).metallic,roughnessFactor:materialFor(p).roughness}});
 const position=accessor(p.positions,'VEC3',34962,...p.bounds),normal=accessor(p.normals,'VEC3',34962),indices=accessor(p.indices,'SCALAR',34963),mesh=doc.meshes.length,node=doc.nodes.length;
 doc.meshes.push({name:p.name,primitives:[{attributes:{POSITION:position,NORMAL:normal},indices,material}]});
 doc.nodes.push({name:p.id,mesh,extras:{...p.meta,label:p.name,system:p.system,description:p.description}});doc.scenes[0].nodes.push(node);
}
const children=doc.scenes[0].nodes.slice();doc.scenes[0].nodes=[doc.nodes.length];doc.nodes.push({name:'metric_root',scale:[SCALE.mmPerUnit/1000,SCALE.mmPerUnit/1000,SCALE.mmPerUnit/1000],children});doc.asset.extras={...doc.asset.extras,scaleBasis:SCALE,units:'metres'};
doc.buffers[0].byteLength=offset;const json=Buffer.from(JSON.stringify(doc)),jp=Buffer.alloc((4-json.length%4)%4,32),bin=Buffer.concat(chunks),head=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);
head.writeUInt32LE(0x46546c67);head.writeUInt32LE(2,4);head.writeUInt32LE(28+json.length+jp.length+bin.length,8);jh.writeUInt32LE(json.length+jp.length);jh.writeUInt32LE(0x4e4f534a,4);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);
const output=Buffer.concat([head,jh,json,jp,bh,bin]);writeFileSync(new URL('./cruze-full-r10.glb',import.meta.url),output);
writeFileSync(new URL('./r10-report.json',import.meta.url),JSON.stringify({revision:'R10',created:'2026-10-19',originalCloudR10Recovered:false,dimensions:refinement.dimensions,bodyWarp:refinement.bodyWarp,connections:refinement.connections,repaired:refinement.repaired,newParts:refinement.added,limits:refinement.limits,scale:SCALE,internalCoverage:R9_SCOPE,added:detail.added,groups:detail.groups,refined:detail.refined,exportUnits:'metres',webObjects:parts.length+4,exportMeshes:parts.length,systems:17,exportSha256:createHash('sha256').update(output).digest('hex'),scope:R9_SCOPE.limits},null,2)+'\n');console.log(JSON.stringify({revision:'R10',webObjects:parts.length+4,exportMeshes:parts.length,bytes:output.length}));
