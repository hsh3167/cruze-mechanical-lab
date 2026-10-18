import {buildRecoveryDetails} from './recovery-details.js';
// Append the additive meshes to R4 for a single Blender/CAD-exchange download.
// Existing nodes, transforms, accessors and original binary payload stay intact.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {buildEngineBay,BAY_REFERENCE,HOOD_PIVOT} from './engine-bay.js';
const source=readFileSync(new URL('./cruze-full-r4.glb',import.meta.url));
let doc,originalBin;
for(let o=12;o<source.length;){const n=source.readUInt32LE(o),t=source.readUInt32LE(o+4);o+=8;if(t===0x4e4f534a)doc=JSON.parse(source.subarray(o,o+n));if(t===0x004e4942)originalBin=source.subarray(o,o+n);o+=n;}
const chunks=[originalBin];let length=originalBin.length;
function accessor(data,type,componentType,target,min,max){const b=Buffer.from(data.buffer,data.byteOffset,data.byteLength),pad=(4-b.length%4)%4,view=doc.bufferViews.length;doc.bufferViews.push({buffer:0,byteOffset:length,byteLength:b.length,target});chunks.push(b,Buffer.alloc(pad));length+=b.length+pad;const index=doc.accessors.length;doc.accessors.push({bufferView:view,componentType,count:data.length/(type==='VEC3'?3:1),type,...(min?{min,max}:{})});return index;}
const additions=[...buildEngineBay(),...buildRecoveryDetails()];
const a=-65*Math.PI/180,c=Math.cos(a),s=Math.sin(a),[,py,pz]=HOOD_PIVOT;
const openHood=[1,0,0,0,0,c,s,0,0,-s,c,0,0,py-c*py+s*pz,pz-s*py-c*pz,1];
doc.nodes.find(n=>n.name==='hood').matrix=openHood;
for(const p of additions){const material=doc.materials.length;doc.materials.push({name:p.name,pbrMetallicRoughness:{baseColorFactor:[1,3,5].map(i=>parseInt(p.color.slice(i,i+2),16)/255).concat(1),metallicFactor:0,roughnessFactor:.65},doubleSided:true});
 const pos=accessor(p.positions,'VEC3',5126,34962,p.bounds[0],p.bounds[1]),normal=accessor(p.normals,'VEC3',5126,34962),indices=accessor(p.indices,'SCALAR',5125,34963),mesh=doc.meshes.length,node=doc.nodes.length;
 doc.meshes.push({name:p.name,primitives:[{attributes:{POSITION:pos,NORMAL:normal},indices,material}]});doc.nodes.push({name:p.id,mesh,...(p.meta.hoodAttached?{matrix:openHood}:{}),extras:{...p.meta,system:p.system,label:p.name,description:p.description}});doc.scenes[doc.scene||0].nodes.push(node);
}
doc.asset.extras={...doc.asset.extras,revision:'R6-plus',sourceRevision:'R4',additiveMeshes:additions.length,reference:BAY_REFERENCE};doc.buffers[0].byteLength=length;
const json=Buffer.from(JSON.stringify(doc)),jp=Buffer.alloc((4-json.length%4)%4,0x20),binary=Buffer.concat(chunks),header=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+jp.length+binary.length,8);jh.writeUInt32LE(json.length+jp.length);jh.writeUInt32LE(0x4e4f534a,4);bh.writeUInt32LE(binary.length);bh.writeUInt32LE(0x004e4942,4);
writeFileSync(new URL('./cruze-full-r6-plus.glb',import.meta.url),Buffer.concat([header,jh,json,jp,bh,binary]));
writeFileSync(new URL('./recovery-report.json',import.meta.url),JSON.stringify({revision:'R6-plus',r4_meshes:465,v2_effects:4,r6_additions:additions.length,total_display_objects:469+additions.length,export_meshes:465+additions.length,systems:17,cooling_paths:19,original_r4_sha256:createHash('sha256').update(source).digest('hex'),reference:BAY_REFERENCE,accuracy:'Educational geometry; dimensions, equipment variants and routing are not OEM-validated.'},null,2)+'\n');
console.log(`R6+ GLB exported: ${465+additions.length} meshes; web display ${469+additions.length} objects.`);
