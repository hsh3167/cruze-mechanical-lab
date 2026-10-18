import {buildEngineBay} from './engine-bay.js';
// Minimal GLB 2.0 triangle reader for this project's uncompressed R4 asset.
// No network dependencies. Original GLB remains the canonical geometry.
export function parseGLB(buffer) {
  const view=new DataView(buffer);
  if(view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2)throw Error('GLB 2.0 파일이 아닙니다.');
  if(view.getUint32(8,true)!==buffer.byteLength)throw Error('GLB 파일 길이가 일치하지 않습니다.');
  let doc,binOffset=0,offset=12;
  while(offset<buffer.byteLength){const size=view.getUint32(offset,true),kind=view.getUint32(offset+4,true);offset+=8;if(kind===0x4e4f534a)doc=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,offset,size)));if(kind===0x004e4942)binOffset=offset;offset+=size}
  if(!doc||!binOffset)throw Error('GLB 데이터가 누락됐습니다.');
  const widths={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
  const formats={5120:[1,'getInt8',127],5121:[1,'getUint8',255],5122:[2,'getInt16',32767],5123:[2,'getUint16',65535],5125:[4,'getUint32',4294967295],5126:[4,'getFloat32',1]};
  function read(index){const a=doc.accessors[index],b=doc.bufferViews[a.bufferView],width=widths[a.type],[bytes,get,max]=formats[a.componentType];if(a.sparse)throw Error('Sparse GLB는 지원하지 않습니다.');const result=new Float64Array(a.count*width),stride=b.byteStride||width*bytes,start=binOffset+(b.byteOffset||0)+(a.byteOffset||0);for(let i=0;i<a.count;i++)for(let j=0;j<width;j++){let x=view[get](start+i*stride+j*bytes,true);if(a.normalized)x=Math.max(-1,x/max);result[i*width+j]=x}return result}
  const identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
  const mul=(a,b)=>Array.from({length:16},(_,i)=>{const row=i%4,col=Math.floor(i/4);return [0,1,2,3].reduce((v,k)=>v+a[row+4*k]*b[k+4*col],0)});
  function transform(n){if(n.matrix)return n.matrix;const [x,y,z,w]=n.rotation||[0,0,0,1],s=n.scale||[1,1,1],t=n.translation||[0,0,0];return [(1-2*y*y-2*z*z)*s[0],(2*x*y+2*z*w)*s[0],(2*x*z-2*y*w)*s[0],0,(2*x*y-2*z*w)*s[1],(1-2*x*x-2*z*z)*s[1],(2*y*z+2*x*w)*s[1],0,(2*x*z+2*y*w)*s[2],(2*y*z-2*x*w)*s[2],(1-2*x*x-2*y*y)*s[2],0,...t,1]}
  const parts=[];
  function walk(index,parent){const node=doc.nodes[index],matrix=mul(parent,transform(node));if(node.mesh!==undefined){for(const [pi,p] of doc.meshes[node.mesh].primitives.entries()){if(p.mode!==undefined&&p.mode!==4)throw Error('삼각형 메시만 지원합니다.');const source=read(p.attributes.POSITION),positions=new Float32Array(source.length),indices=p.indices!==undefined?Uint32Array.from(read(p.indices)):Uint32Array.from({length:source.length/3},(_,i)=>i),normals=new Float32Array(source.length),lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
      for(let i=0;i<source.length;i+=3){const x=source[i],y=source[i+1],z=source[i+2];for(let j=0;j<3;j++){const v=matrix[j]*x+matrix[j+4]*y+matrix[j+8]*z+matrix[j+12];positions[i+j]=v;lo[j]=Math.min(lo[j],v);hi[j]=Math.max(hi[j],v)}}
      for(let i=0;i<indices.length;i+=3){const a=indices[i]*3,b=indices[i+1]*3,c=indices[i+2]*3;if(c>=positions.length||b>=positions.length||a>=positions.length)throw Error('메시 인덱스 오류');const ux=positions[b]-positions[a],uy=positions[b+1]-positions[a+1],uz=positions[b+2]-positions[a+2],vx=positions[c]-positions[a],vy=positions[c+1]-positions[a+1],vz=positions[c+2]-positions[a+2],n=[uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx];for(const k of [a,b,c])for(let j=0;j<3;j++)normals[k+j]+=n[j]}
      for(let i=0;i<normals.length;i+=3){const n=Math.hypot(normals[i],normals[i+1],normals[i+2])||1;for(let j=0;j<3;j++)normals[i+j]/=n}
      let rgba=doc.materials?.[p.material]?.pbrMetallicRoughness?.baseColorFactor||[.55,.62,.70,1];if(p.attributes.COLOR_0!==undefined){const color=read(p.attributes.COLOR_0);rgba=Array.from(color.slice(0,widths[doc.accessors[p.attributes.COLOR_0].type]));if(rgba.length===3)rgba.push(1)}
      parts.push({id:node.name+(pi?`_${pi}`:''),positions,normals,indices,bounds:[lo,hi],color:'#'+rgba.slice(0,3).map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join(''),opacity:rgba[3],meta:node.extras||{}});
    }}for(const child of node.children||[])walk(child,matrix)}
  for(const root of doc.scenes[doc.scene||0].nodes)walk(root,identity);
  return {parts,asset:doc.asset};
}

export async function loadR4(){const [modelResponse,infoResponse]=await Promise.all([fetch('./cruze-full-r4.glb'),fetch('./learning.json')]);if(!modelResponse.ok||!infoResponse.ok)throw Error('R4 모델 또는 학습 자료를 불러오지 못했습니다.');const model=parseGLB(await modelResponse.arrayBuffer()),info=await infoResponse.json();
  for(const part of model.parts){const details=info.descriptions[part.id]||{},u=part.meta;part.name=u.label||details.name||part.id;part.system=u.system||'engine';part.category=info.systemLabels[part.system]||part.system;part.description=details.description||`${part.name}. R4의 ${part.category} 개념 형상입니다. 실차 치수·장착점은 검증되지 않았습니다.`;part.explode=info.explode[part.system]||[0,0,0];part.ghost=['block','head','valvecover','oilpan','gearbox','liners'].includes(part.id)||!!u.coolingShell;part.opacity=part.ghost?.18:part.opacity;part.anim={kind:'world',...u};}
  for(const extra of info.combustion){extra.system='ignition';extra.meta={source:'v2-learning'};model.parts.push(extra)}
  model.parts.push(...buildEngineBay());
  return {...info,...model,version:'R6-engine-bay',systems:Object.keys(info.systemLabels)};
}
