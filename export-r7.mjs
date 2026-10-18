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
const parts=correctVehicleFrame([...raw,...buildEngineBay(),...buildRecoveryDetails()]).concat(buildCabinR7());
const doc={asset:{version:'2.0',generator:'Cruze Mechanical Lab R7',extras:{revision:'R7',vehicleFrame:VEHICLE_FRAME}},scene:0,scenes:[{nodes:[]}],nodes:[],meshes:[],materials:[],accessors:[],bufferViews:[],buffers:[{byteLength:0}]};
const chunks=[];let offset=0;
function accessor(arr,type,target,min,max){const data=Buffer.from(arr.buffer,arr.byteOffset,arr.byteLength),pad=Buffer.alloc((4-data.length%4)%4),view=doc.bufferViews.length;doc.bufferViews.push({buffer:0,byteOffset:offset,byteLength:data.length,target});chunks.push(data,pad);offset+=data.length+pad.length;const id=doc.accessors.length;doc.accessors.push({bufferView:view,componentType:type==='SCALAR'?5125:5126,count:arr.length/(type==='VEC3'?3:1),type,...(min?{min,max}:{})});return id;}
for(const part of parts){let p=part;
 if(p.id==='hood'||p.meta.hoodAttached){const positions=p.positions.slice(),normals=p.normals.slice(),lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity],a=-65*Math.PI/180;
  for(let i=0;i<positions.length;i+=3){const q=hoodPoint(Array.from(positions.slice(i,i+3)));for(let j=0;j<3;j++){positions[i+j]=q[j];lo[j]=Math.min(lo[j],positions[i+j]);hi[j]=Math.max(hi[j],positions[i+j]);}const y=normals[i+1],z=normals[i+2];normals[i+1]=Math.cos(a)*y-Math.sin(a)*z;normals[i+2]=Math.sin(a)*y+Math.cos(a)*z;}
  p={...p,positions,normals,bounds:[lo,hi]};
 }
 const material=doc.materials.length;doc.materials.push({name:p.name,doubleSided:true,alphaMode:(p.opacity??1)<1?'BLEND':'OPAQUE',pbrMetallicRoughness:{baseColorFactor:[1,3,5].map(i=>parseInt(p.color.slice(i,i+2),16)/255).concat(p.opacity??1),metallicFactor:0,roughnessFactor:.68}});
 const position=accessor(p.positions,'VEC3',34962,...p.bounds),normal=accessor(p.normals,'VEC3',34962),indices=accessor(p.indices,'SCALAR',34963),mesh=doc.meshes.length,node=doc.nodes.length;
 doc.meshes.push({name:p.name,primitives:[{attributes:{POSITION:position,NORMAL:normal},indices,material}]});
 doc.nodes.push({name:p.id,mesh,extras:{...p.meta,label:p.name,system:p.system,description:p.description}});doc.scenes[0].nodes.push(node);
}
doc.buffers[0].byteLength=offset;const json=Buffer.from(JSON.stringify(doc)),jp=Buffer.alloc((4-json.length%4)%4,32),bin=Buffer.concat(chunks),head=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);
head.writeUInt32LE(0x46546c67);head.writeUInt32LE(2,4);head.writeUInt32LE(28+json.length+jp.length+bin.length,8);jh.writeUInt32LE(json.length+jp.length);jh.writeUInt32LE(0x4e4f534a,4);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);
const output=Buffer.concat([head,jh,json,jp,bh,bin]);writeFileSync(new URL('./cruze-full-r7.glb',import.meta.url),output);
const groups={};for(const p of buildCabinR7())groups[p.category]=(groups[p.category]||0)+1;
writeFileSync(new URL('./r7-report.json',import.meta.url),JSON.stringify({revision:'R7',vehicleFrame:VEHICLE_FRAME,driver:'Left-hand drive; positive X when looking forward along +Z',addedParts:buildCabinR7().length,correctedParts:[...MIRRORED_IDS,'bay_booster_vacuum','bay_latch_cable'],webObjects:parts.length+4,exportMeshes:parts.length,systems:17,groups,originalR4Sha256:createHash('sha256').update(bytes).digest('hex'),exportSha256:createHash('sha256').update(output).digest('hex'),reference:'https://www.chevrolet.co.kr/owner-manuals/cruze',scope:'Major cabin systems, mechanisms and service connections represented. Educational component-level model; not a complete OEM BOM, validated trim specification, fastener inventory or manufacturing CAD. Airbags are stowed. Rear seat upright; hood open in GLB.'},null,2)+'\n');
console.log(JSON.stringify({revision:'R7',added:buildCabinR7().length,webObjects:parts.length+4,exportMeshes:parts.length,bytes:output.length}));
