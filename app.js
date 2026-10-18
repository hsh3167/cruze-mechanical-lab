import {REAR_PIVOT} from './recovery-details.js';
import {HOOD_PIVOT} from './engine-bay.js';
import {loadR4} from './glb-loader.js?r7=20261018';
import {pistonPose,valveLift} from './mechanics.js';
'use strict';
/* Portable, standalone WebGL2 renderer. There are no external JS/CDN dependencies.
   Python writes model.json + conceptual_assembly.glb. The viewer loads the JSON
   mesh manifest for reliable offline playback; GLB is included for CAD/Blender exchange.
*/

const $=(s)=>document.querySelector(s);
const sysColors={"engine": "#b7c8d9", "intake": "#e18b71", "ignition": "#ed9d95", "cooling": "#4dcbd3", "lubrication": "#e9a84b", "transmission": "#b39ad9", "structure": "#97aabf", "suspension": "#f3bd65", "steering": "#d7b867", "brakes": "#d78787", "wheels": "#8b9baa", "exhaust": "#b9a38b", "fuel": "#afbd80", "hvac": "#71b6cc", "electrical": "#b49be6", "interior": "#a8aa98", "body": "#738ba3"};
const strokeColors=['#e7ac67','#ac94dc','#63b5d8','#71c8a4'];
const state={cabinCutaway:true,rearFold:0,playing:false,speed:1,angle:0,explode:0,ghost:true,flow:true,tags:true,mode:'overview',visible:new Set(Object.keys(sysColors)),selected:'block',selectedCylinder:0,showBody:false,hoodOpen:true,coolingPlaying:true,opening:0,hidden:new Set(),isolated:null,section:false,cutZ:0,oilFlow:true,az:-.49,el:.35,dist:12,target:[-.3,.22,.2],drag:null,parts:[],fps:0};
let coolingRotorAngle=0;
let model=null,renderer=null,lastTime=0,tagLinks=[],coolParticles=[],oilParticles=[];
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v)),rad=(d)=>d*Math.PI/180;
const vec3={add:(a,b)=>a.map((v,i)=>v+b[i]),sub:(a,b)=>a.map((v,i)=>v-b[i]),dot:(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm:(a)=>{const d=Math.hypot(...a)||1;return a.map(v=>v/d)}};
const mat={
  id:()=>new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]),
  mul:(a,b)=>{const m=new Float32Array(16);for(let col=0;col<4;col++)for(let row=0;row<4;row++){let x=0;for(let k=0;k<4;k++)x+=a[row+4*k]*b[k+4*col];m[row+4*col]=x}return m},
  trans:(x,y,z)=>{const m=mat.id();m[12]=x;m[13]=y;m[14]=z;return m},
  rx:(t)=>{const m=mat.id(),c=Math.cos(t),s=Math.sin(t);m[5]=c;m[6]=s;m[9]=-s;m[10]=c;return m},
  perspective:(fov,aspect,n,f)=>{const t=1/Math.tan(fov/2),m=new Float32Array(16);m[0]=t/aspect;m[5]=t;m[10]=(f+n)/(n-f);m[11]=-1;m[14]=2*f*n/(n-f);return m},
  lookAt:(eye,target)=>{const z=vec3.norm(vec3.sub(eye,target)),x=vec3.norm(vec3.cross([0,1,0],z)),y=vec3.cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-vec3.dot(x,eye),-vec3.dot(y,eye),-vec3.dot(z,eye),1])},
  point:(m,v)=>[m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12],m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13],m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14]]
};
function partVisible(p){if(state.mode==='cabin'&&state.cabinCutaway&&(p.meta?.roofTrim||/^(plus_door_trim_|r7_rear_door_trim_|r7_carpet$)/.test(p.id)))return false;if(state.mode==='cabin'&&p.meta?.engineBay)return false;if(!state.visible.has(p.system)||state.hidden.has(p.id)||(state.isolated&&state.isolated!==p.id))return false;
 if(p.meta?.hoodProp&&(!state.hoodOpen||(!state.showBody&&state.mode!=='bay')))return false;
 if(p.meta?.hoodAttached&&!state.showBody&&!['bay','exterior'].includes(state.mode))return false;
 if(state.mode==='bay'){
   if(p.id==='hood'||p.meta?.hoodAttached)return true;
   if(p.meta?.engineBay)return true;
   if(p.system==='body')return /^(headlight_|front_fascia)/.test(p.id);
   if(p.bounds[0][2]<-4.85||p.bounds[1][2]>7.9||p.bounds[0][0]<-7.5||p.bounds[1][0]>7.5)return false;
 }
 if(p.system==='body'&&!state.showBody&&!['exterior','bay'].includes(state.mode))return false;
 if(state.mode==='pump')return p.meta?.coolingPart==='pump';if(state.mode==='thermostat')return p.meta?.coolingPart==='thermostat';
 if(['internals','oil','ignition','turbo'].includes(state.mode)&&p.meta?.engineBay&&['structure','body'].includes(p.system))return false;
 if(p.id==='coolanthose')return false;
 if(state.mode==='internals'&&p.system==='engine'&&['block','head','valvecover','headbolts','headgasket','oilpan','liners'].includes(p.id))return false;
 return true;}
const pathCache=new WeakMap();
function pathSample(path,t){let d=pathCache.get(path);if(!d){const lengths=path.slice(1).map((p,i)=>Math.hypot(...vec3.sub(p,path[i])));d={lengths,total:lengths.reduce((a,b)=>a+b,0)};pathCache.set(path,d)}let u=((t%1)+1)%1*d.total;for(let i=0;i<d.lengths.length;i++){const len=d.lengths[i];if(u<=len)return {pos:path[i].map((v,j)=>v+(path[i+1][j]-v)*u/(len||1)),length:d.total};u-=len}return {pos:path[0],length:d.total}}
function routeWeight(name){const k=model.coolingRouteMeta[name]?.kind;return k==='main'?state.opening:k==='bypass'?1-state.opening:1}
function hexColor(h){return [1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255)}
const VERT=`#version 300 es
precision highp float;
in vec3 aPosition;in vec3 aNormal;
uniform mat4 uModel;uniform mat4 uViewProj;
out vec3 vNormal;out vec3 vPos;
void main(){vec4 wp=uModel*vec4(aPosition,1.0);vPos=wp.xyz;vNormal=normalize(mat3(uModel)*aNormal);gl_Position=uViewProj*wp;}`;
const FRAG=`#version 300 es
precision highp float;
in vec3 vNormal;in vec3 vPos;
uniform vec3 uColor;uniform vec3 uEye;uniform float uAlpha;uniform float uSelect;uniform float uCase;uniform float uSlice;uniform float uSlicePosition;uniform float uGlow;
out vec4 outColor;
void main(){if(uCase>.5 && uSlice>.5 && vPos.z>uSlicePosition)discard;vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;vec3 light=normalize(vec3(-.56,.86,1.0));
 float diffuse=max(dot(n,light),0.0);float secondary=max(dot(n,normalize(vec3(.7,.25,-.5))),0.0);
 float sky=clamp(.5+.5*n.y,0.0,1.0);
 vec3 color=uColor*(.30+.59*diffuse+.20*secondary+.12*sky);
 vec3 view=normalize(uEye-vPos);vec3 halfv=normalize(view+light);
 float spec=pow(max(dot(n,halfv),0.0),35.0)*.31;
 color+=vec3(spec)+uSelect*vec3(.15,.24,.22)+uGlow*vec3(1.15,.48,.04);
 outColor=vec4(pow(color,vec3(.92)),uAlpha);}`;
const LINEVERT=`#version 300 es
precision highp float;in vec3 aPosition;uniform mat4 uViewProj;uniform mat4 uModel;void main(){gl_Position=uViewProj*uModel*vec4(aPosition,1.0);gl_PointSize=5.0;}`;
const LINEFRAG=`#version 300 es
precision highp float;uniform vec4 uRGBA;out vec4 outColor;void main(){outColor=uRGBA;}`;
class WebGLViewer {
  constructor(canvas){this.canvas=canvas;const gl=canvas.getContext('webgl2',{alpha:true,antialias:true,powerPreference:'high-performance'});if(!gl)throw Error('WebGL 2를 사용할 수 없습니다. Chrome 하드웨어 가속 설정을 확인하세요.');this.gl=gl;
    this.program=this.programFrom(VERT,FRAG);this.lineProgram=this.programFrom(LINEVERT,LINEFRAG);this.parts=[];this.eye=[0,0,0];this.vp=mat.id();
    this.loc={};for(let n of ['uModel','uViewProj','uColor','uEye','uAlpha','uSelect','uCase','uSlice','uSlicePosition','uGlow'])this.loc[n]=gl.getUniformLocation(this.program,n);
    this.lineLoc={};for(let n of ['uViewProj','uModel','uRGBA'])this.lineLoc[n]=gl.getUniformLocation(this.lineProgram,n);
    this.makeGrid();gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  }
  programFrom(v,f){const gl=this.gl;const compile=(t,src)=>{const shader=gl.createShader(t);gl.shaderSource(shader,src);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader};const prog=gl.createProgram();gl.attachShader(prog,compile(gl.VERTEX_SHADER,v));gl.attachShader(prog,compile(gl.FRAGMENT_SHADER,f));gl.linkProgram(prog);if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(prog));return prog;}
  upload(data){const gl=this.gl;this.parts=data.parts.map(part=>{const vao=gl.createVertexArray();gl.bindVertexArray(vao);const positions=new Float32Array(part.positions),normals=new Float32Array(part.normals),indices=new Uint32Array(part.indices);
      for(const [name,arr] of [['aPosition',positions],['aNormal',normals]]){const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,arr,gl.STATIC_DRAW);const loc=gl.getAttribLocation(this.program,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,3,gl.FLOAT,false,0,0)}
      const ibo=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ibo);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);gl.bindVertexArray(null);
      return {...part,vao,count:indices.length,center:part.bounds[0].map((v,i)=>(v+part.bounds[1][i])*.5),model:mat.id(),rgb:hexColor(part.color)};
    });this.partById=new Map(this.parts.map(p=>[p.id,p]));}
  makeGrid(){const gl=this.gl;const vertices=[];for(let x=-50;x<=50;x+=2){vertices.push(x,-5.35,-50,x,-5.35,50)}for(let z=-50;z<=50;z+=2){vertices.push(-50,-5.35,z,50,-5.35,z)}this.gridCount=vertices.length/3;this.grid=gl.createVertexArray();gl.bindVertexArray(this.grid);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);const loc=gl.getAttribLocation(this.lineProgram,'aPosition');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,3,gl.FLOAT,false,0,0);gl.bindVertexArray(null);}
  calcPose(part){let pose=mat.id();const a=part.anim||{},u=part.meta||{},k=model.kinematics,angle=state.angle;
   const pivotRotate=(center,t)=>mat.mul(mat.trans(...center),mat.mul(mat.rx(t),mat.trans(...center.map(v=>-v))));
   const piston=(index,t)=>pistonPose(k,index,t);
   let motion=u.motion,index=u.cylinder??0;const match=part.id.match(/^(piston|valve_intake|valve_exhaust)([1-4])$/);
   if(match){index=Number(match[2])-1;motion=match[1]==='piston'?'piston':'valve'}
   if(part.id==='crank')motion='crank';if(part.id==='cam_in'||part.id==='cam_ex')motion='cam';
   const cycle=((angle*180/Math.PI-k.firingOffset[index])%720+720)%720,side=u.valveKind||(part.id.includes('intake')?'intake':'exhaust'),range=side==='intake'?[355,545]:[175,365];
   const lift=valveLift(k,index,angle,side);
   if(motion==='crank')pose=pivotRotate([0,k.crankY,0],angle);
   else if(motion==='piston'){pose=mat.trans(0,piston(index,angle).py-piston(index,0).py,0)}
   else if(motion==='rod'){const now=piston(index,angle),base=piston(index,0),origin=u.baseBig||[k.positions[index],base.cy,base.cz],rotation=Math.atan2(-now.cz,now.py-now.cy)-Math.atan2(-base.cz,base.py-base.cy);pose=mat.mul(mat.trans(k.positions[index],now.cy,now.cz),mat.mul(mat.rx(rotation),mat.trans(...origin.map(v=>-v))))}
   else if(motion==='cam'){pose=pivotRotate(u.pivot||[0,2.16,part.id==='cam_in'?.42:-.42],angle/2)}
   else if(motion==='valve')pose=mat.trans(0,-lift,0);
   else if(motion==='spring'){const bottom=u.springBottom??1.57,scale=mat.id();scale[5]=Math.max(.1,1-lift/(u.springHeight||.36));pose=mat.mul(mat.trans(0,bottom,0),mat.mul(scale,mat.trans(0,-bottom,0)))}
   else if(part.id==='turbospool')pose=pivotRotate([-.53,.42,-1.98],angle*7.5);
   if(u.coolingMotion==='pumpRotor')pose=pivotRotate(u.pivot||[2.97,-.55,.75],coolingRotorAngle);
   if(u.coolingMotion==='thermostatValve')pose=mat.trans(0,0,state.opening*.14);
   if(u.coolingMotion==='thermostatSpring'){const scale=mat.id();scale[10]=1-state.opening*.25;const top=u.springTop||1.3;pose=mat.mul(mat.trans(0,0,top),mat.mul(scale,mat.trans(0,0,-top)))}
   if(part.id==='hood'||u.hoodAttached)pose=pivotRotate(HOOD_PIVOT,state.hoodOpen?-65*Math.PI/180:0);
   if(part.meta?.rearFoldAttached||part.id==='rear_seat_back'||part.id.startsWith('rear_headrest_'))pose=pivotRotate(REAR_PIVOT,Math.PI*.46*state.rearFold);
   if(a.kind==='combustion'){const deg=((angle*180/Math.PI-k.firingOffset[a.index])%720+720)%720;part.dynamicAlpha=state.mode==='ignition'&&deg<75?.64*Math.pow(Math.sin(Math.PI*deg/75),.75):0}
   const ex=(['pump','thermostat'].includes(state.mode)&&u.explodeOffset?u.explodeOffset:part.explode).map(v=>v*state.explode*.014);part.model=mat.mul(mat.trans(...ex),pose);
  }
  updateView(){const gl=this.gl,canvas=this.canvas;const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight),scale=Math.min(2,window.devicePixelRatio||1);if(canvas.width!==Math.floor(w*scale)||canvas.height!==Math.floor(h*scale)){canvas.width=Math.floor(w*scale);canvas.height=Math.floor(h*scale)}gl.viewport(0,0,canvas.width,canvas.height);
    const e=state.el,a=state.az,d=state.dist;this.eye=[state.target[0]+d*Math.sin(a)*Math.cos(e),state.target[1]+d*Math.sin(e),state.target[2]+d*Math.cos(a)*Math.cos(e)];
    this.vp=mat.mul(mat.perspective(rad(45),canvas.width/canvas.height,.04,500),mat.lookAt(this.eye,state.target));}
  render(){const gl=this.gl;this.updateView();gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);this.drawGrid();gl.useProgram(this.program);gl.uniformMatrix4fv(this.loc.uViewProj,false,this.vp);gl.uniform3fv(this.loc.uEye,this.eye);gl.uniform1f(this.loc.uSlice,state.section?1:0);gl.uniform1f(this.loc.uSlicePosition,state.cutZ);
    const opacityPart=[];
    for(const part of this.parts){this.calcPose(part);if(!partVisible(part))continue;const a=part.anim?.kind==='combustion'?part.dynamicAlpha:(part.ghost?(state.ghost?part.opacity:1):part.opacity);if(a<.025)continue;if(a<.99){opacityPart.push([part,a]);continue}this.drawPart(part,a)}
    gl.depthMask(false);opacityPart.sort((a,b)=>{const pa=mat.point(a[0].model,a[0].center),pb=mat.point(b[0].model,b[0].center);return vec3.dot(vec3.sub(pb,this.eye),vec3.sub(pb,this.eye))-vec3.dot(vec3.sub(pa,this.eye),vec3.sub(pa,this.eye))});for(const [p,a] of opacityPart)this.drawPart(p,a);gl.depthMask(true);this.drawParticles();gl.bindVertexArray(null);}
  drawPart(part,alpha){const gl=this.gl;gl.uniformMatrix4fv(this.loc.uModel,false,part.model);gl.uniform3fv(this.loc.uColor,part.rgb);gl.uniform1f(this.loc.uAlpha,alpha);gl.uniform1f(this.loc.uSelect,state.selected===part.id ? .6 : 0);gl.uniform1f(this.loc.uCase,['block','liners','head','valvecover','oilpan','gearbox'].includes(part.id)?1:0);gl.uniform1f(this.loc.uGlow,part.anim?.kind==='combustion'?1:0);gl.bindVertexArray(part.vao);gl.drawElements(gl.TRIANGLES,part.count,gl.UNSIGNED_INT,0);}
  drawGrid(){const gl=this.gl;gl.useProgram(this.lineProgram);gl.uniformMatrix4fv(this.lineLoc.uViewProj,false,this.vp);gl.uniformMatrix4fv(this.lineLoc.uModel,false,mat.id());gl.uniform4fv(this.lineLoc.uRGBA,[.21,.36,.48,.17]);gl.bindVertexArray(this.grid);gl.drawArrays(gl.LINES,0,this.gridCount);}
  drawParticles(){if(!(state.flow&&state.visible.has('cooling'))&&!(state.oilFlow&&state.visible.has('lubrication')))return;const gl=this.gl;gl.useProgram(this.lineProgram);gl.uniformMatrix4fv(this.lineLoc.uViewProj,false,this.vp);gl.uniformMatrix4fv(this.lineLoc.uModel,false,mat.id());gl.bindVertexArray(this.particleVao);gl.bindBuffer(gl.ARRAY_BUFFER,this.particleBuffer);for(const [enabled,points,color] of [[state.flow&&state.visible.has('cooling'),coolParticles.filter(p=>routeWeight(p.name)>.001),[.18,.94,.98,.94]],[state.oilFlow&&state.visible.has('lubrication'),oilParticles,[1.0,.65,.17,.98]]]){if(!enabled||!points.length)continue;gl.uniform4fv(this.lineLoc.uRGBA,color);const positions=new Float32Array(points.flatMap(p=>p.pos));gl.bufferData(gl.ARRAY_BUFFER,positions,gl.DYNAMIC_DRAW);gl.drawArrays(gl.POINTS,0,points.length)}}
  setupParticles(){const gl=this.gl;this.particleVao=gl.createVertexArray();this.particleBuffer=gl.createBuffer();gl.bindVertexArray(this.particleVao);gl.bindBuffer(gl.ARRAY_BUFFER,this.particleBuffer);gl.bufferData(gl.ARRAY_BUFFER,1024,gl.DYNAMIC_DRAW);const a=gl.getAttribLocation(this.lineProgram,'aPosition');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,3,gl.FLOAT,false,0,0);gl.bindVertexArray(null);coolParticles=[];for(const [name,path] of Object.entries(model.coolingPaths))for(let i=0;i<16;i++)coolParticles.push({path,name,t:i/16,pos:path[0]});oilParticles=[];for(const [name,path] of Object.entries(model.oilPaths||{}))for(let i=0;i<15;i++)oilParticles.push({path,name,t:i/15,pos:path[0]});}
  project(pos){const m=this.vp;const x=pos[0],y=pos[1],z=pos[2];const p=[m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14],m[3]*x+m[7]*y+m[11]*z+m[15]];if(p[3]<=0)return null;const ndc=[p[0]/p[3],p[1]/p[3],p[2]/p[3]];if(Math.abs(ndc[0])>1.3||Math.abs(ndc[1])>1.3)return null;return [(ndc[0]*.5+.5)*this.canvas.clientWidth,(1-ndc[1])*.5*this.canvas.clientHeight,p[3]];}
  pick(clientX,clientY){const rect=this.canvas.getBoundingClientRect(),ndcX=(clientX-rect.left)/rect.width*2-1,ndcY=1-(clientY-rect.top)/rect.height*2;
    const aspect=rect.width/rect.height,depth=Math.tan(rad(45)/2),dirCamera=vec3.norm([ndcX*aspect*depth,ndcY*depth,-1]);const fwd=vec3.norm(vec3.sub(state.target,this.eye)),right=vec3.norm(vec3.cross(fwd,[0,1,0])),up=vec3.cross(right,fwd);
    const dir=vec3.norm([0,1,2].map(j=>right[j]*dirCamera[0]+up[j]*dirCamera[1]-fwd[j]*dirCamera[2]));
    const intersections=[];
    for(const part of this.parts){if(!partVisible(part))continue;const center=mat.point(part.model,part.center);const size=part.bounds[1].map((v,i)=>v-part.bounds[0][i]);const radius=Math.hypot(...size)*.43+.05;const rel=vec3.sub(center,this.eye);const dist=vec3.dot(rel,dir);if(dist<0)continue;const gap=Math.hypot(...vec3.sub(rel,dir.map(v=>v*dist)));if(gap<radius)intersections.push({part,dist:dist-Math.sqrt(radius*radius-gap*gap),miss:gap/radius});}
    intersections.sort((a,b)=>a.dist-b.dist||a.miss-b.miss);return intersections.length?intersections[0].part:null;
  }
}
function createToggles(){const root=$('#systemList');root.innerHTML='';for(const [sys,color] of Object.entries(sysColors)){const b=document.createElement('button');b.className='system-toggle on';b.innerHTML=`<span class="color-dot" style="background:${color}"></span>${model.systemLabels[sys]}`;b.title=model.systemLabels[sys]+' 표시 전환';b.onclick=()=>{if(state.visible.has(sys))state.visible.delete(sys);else state.visible.add(sys);refreshToggles();updatePartList()};b.dataset.sys=sys;root.appendChild(b)}}
function refreshToggles(){document.querySelectorAll('.system-toggle').forEach(b=>{b.classList.toggle('on',state.visible.has(b.dataset.sys))});}
function setSelected(id){const p=renderer.partById.get(id);if(!p)return;state.selected=id;$('#partSystem').textContent=p.category;$('#partTitle').textContent=p.name;$('#partDesc').textContent=p.description;$('#partId').textContent=id.toUpperCase();updatePartList()}
function updatePartList(){if(!renderer)return;const query=$('#searchParts').value.toLowerCase().trim();const valid=renderer.parts.filter(p=>partVisible(p)&&(!query||(p.name+p.description+p.category).toLowerCase().includes(query)));$('#visibleCount').textContent=valid.length+'개';const root=$('#partList');root.innerHTML='';for(const p of valid){const btn=document.createElement('button');btn.className='part-item'+(p.id===state.selected?' selected':'');btn.style.setProperty('--swatch',p.color);btn.innerHTML=`<span>${p.name}</span><small>↗</small>`;btn.onclick=()=>setSelected(p.id);root.appendChild(btn)}}
function setMode(name){const all=Object.keys(sysColors);const modes={
bay:{visible:all,selected:'bay_upper_support',badge:'R7 · 본네트 아래 구조와 정비 포인트',text:'전방 지지대, 탱크 주입구, 흡기 덕트, 배터리 단자와 배선을 관찰합니다. 원본 장치는 유지하고 주변을 보강한 교육용 배치입니다.',title:'본네트 아래 엔진룸',cam:[0,3.4,.4,39,-.22,.82]},
full:{visible:all,selected:'block',badge:'R4 전체 차량 · V2 학습 기능 통합',text:'전체 차량에서 엔진·냉각·구동계로 이동해 동일한 모델의 구조와 작동 원리를 관찰합니다.',title:'차량 전체 구성',cam:[0,0,-15,75,-.60,.35]},
overview:{visible:['engine','intake','ignition','cooling','lubrication','transmission','electrical'],selected:'block',badge:'엔진룸 · 파워트레인 구성',text:'R4의 상세 엔진·냉각 구조와 V2의 부품 설명을 한 모델에서 확인합니다.',title:'엔진룸 배치',cam:[-.3,.22,.2,14,-.49,.35]},
internals:{visible:['engine'],selected:'piston1',badge:'4행정 · 크랭크–로드–피스톤 연결',text:'4행정은 크랭크축 2회전입니다. 피스톤·핀·링·로드는 같은 실린더의 운동을 공유합니다. 밸브 위상은 학습용 단순화입니다.',title:'엔진 기구학',cam:[0,.3,0,8.5,-.37,.26]},
cooling:{visible:['engine','cooling','hvac'],selected:'waterpump',badge:'R4 냉각계 · 원본 형상에서 추출한 19개 경로',text:'서모스탯 개도를 바꾸어 주회로와 바이패스의 표시를 비교합니다. 입자와 개도는 설명용이며 CFD·실제 온도 계산 결과가 아닙니다.',title:'냉각수 순환',cam:[0,.3,1,12,-.29,.34]},
pump:{visible:['cooling'],selected:'wp_shaft',badge:'워터펌프 내부 · 임펠러·씰·베어링',text:'투시와 분해 보기를 함께 사용해 임펠러, 샤프트, 베어링, 메커니컬 씰을 확인합니다.',title:'워터펌프 구조',cam:[3,-.55,.75,3,1.15,.25]},
thermostat:{visible:['cooling'],selected:'th_valve',badge:'서모스탯 내부 · 개도 조절',text:'개도 슬라이더에 따라 밸브와 스프링의 개념 위치가 변합니다. 실차 작동 온도와 스트로크는 검증되지 않았습니다.',title:'서모스탯 구조',cam:[-2.7,1.2,.7,3.8,-.7,.25]},
turbo:{visible:['engine','intake','exhaust'],selected:'turbo',badge:'배기가스 → 터빈 → 압축기 → 흡기',text:'터보의 역할과 인터쿨러, 흡기 매니폴드, 배기 계통을 살펴봅니다.',title:'과급과 흡배기',cam:[-.5,.4,-.1,11,-.72,.40]},
drive:{visible:['engine','transmission','suspension','wheels'],selected:'planetarysun',badge:'엔진 → 변속기 → 구동축',text:'유성기어·클러치·차동기어의 형상을 확인합니다. 실제 6T40 단수별 구동비와 클러치 체결을 재현한 모델은 아닙니다.',title:'동력 전달',cam:[-2,-.6,0,17,-.45,.2]},
oil:{visible:['engine','lubrication'],selected:'oilpump',badge:'오일팬 → 펌프 → 필터 → 베어링',text:'V2의 윤활 학습 경로를 R4의 동일 엔진 좌표에 연결했습니다. 유량·압력은 계산하지 않습니다.',title:'윤활 경로',cam:[.2,-.25,0,10.5,-.37,.25]},
ignition:{visible:['engine','ignition','intake'],selected:'coilmodule',badge:'V2 점화 학습 · 점화순서 1–3–4–2',text:'주황색 표시는 실린더별 연소 시점이며 실제 화염 해석은 아닙니다. 1~4번 실린더를 선택해 행정을 확인하세요.',title:'점화·연료분사',cam:[0,.56,0,10,-.42,.44]},
chassis:{visible:['structure','suspension','steering','brakes','wheels','transmission','exhaust','fuel'],selected:'cvshaft',badge:'차체 하부 · 현가·조향·제동',text:'R4의 차체 골격과 전후 현가, 구동축, 조향·제동 부품의 배치를 살펴봅니다.',title:'차량 하부 구성',cam:[0,-1,-15,65,-.55,.30]},
cabin:{visible:['structure','interior','hvac','steering','electrical'],selected:'steering_wheel',badge:'좌핸들 실내 · 공조 · 전장',text:'실내 공간과 공조·전장 부품의 개념 배치입니다. 국내 트림별 사양과 치수는 검증되지 않았습니다.',title:'실내 패키징',cam:[0,1.9,-16.8,29,Math.PI+.48,.76]},
exterior:{visible:['body','wheels'],selected:'block',badge:'외장·유리 · 전체 패키징',text:'차량 외형의 단순화된 개념 형상입니다. 실제 크루즈 외장 면품질과 정확한 비례를 보증하지 않습니다.',title:'외장 패키징',cam:[0,0,-15,75,-.6,.3]}};
const m=modes[name];if(!m)return;state.mode=name;if(name==='bay'){state.hoodOpen=true;state.ghost=false;$('#ghostToggle').checked=false;}$('#hoodBtn').textContent=state.hoodOpen?'본네트 닫기':'본네트 열기';state.hidden.clear();state.isolated=null;state.explode=0;$('#explodeSlider').value=0;$('#explodeValue').textContent='0%';state.visible=new Set(m.visible);state.target=m.cam.slice(0,3);state.dist=m.cam[3];state.az=m.cam[4];state.el=m.cam[5];document.querySelectorAll('.mode').forEach(b=>b.classList.toggle('active',b.dataset.mode===name));$('#stageBadge').innerHTML='<span class="pulse"></span> '+m.badge;$('#learnCard').innerHTML=`<span class="learn-no">01</span><b>${m.title}</b><p>${m.text}</p>`;refreshToggles();setSelected(m.selected);updatePartList();}
function setupTags(){const labels={block:['실린더 블록',[0,.2,-.45]],turbo:['터보차저',[-.45,.75,-2]],radiator:['라디에이터',[0,.8,3.4]],gearbox:['6단 변속기',[-3.3,.35,0]],waterpump:['워터펌프',[2.9,-.5,.8]],oilpump:['오일펌프',[2.8,-.94,.34]],coilmodule:['점화 모듈',[0,2.95,0]]};const root=$('#tagLayer');for(const [id,[name,pos]] of Object.entries(labels)){let b=document.createElement('button');b.className='model-tag';b.textContent=name;b.onclick=()=>setSelected(id);b.dataset.id=id;b.dataset.pos=JSON.stringify(pos);root.appendChild(b);tagLinks.push(b)}}
function updateTags(){for(const tag of tagLinks){const part=renderer.partById.get(tag.dataset.id);if(!part||!state.tags||['bay','full','chassis','cabin','exterior'].includes(state.mode)||!partVisible(part)){tag.style.display='none';continue}const pos=JSON.parse(tag.dataset.pos);const offset=part.explode.map(v=>v*state.explode*.014);const proj=renderer.project(vec3.add(pos,offset));if(!proj){tag.style.display='none';continue}tag.style.display='block';tag.style.left=proj[0]+'px';tag.style.top=proj[1]+'px';}}
function updateCooling(dt){if(!model)return;if(state.coolingPlaying)coolingRotorAngle+=dt*2*Math.PI;for(const p of coolParticles){if(!state.coolingPlaying||routeWeight(p.name)<.001)continue;p.t=(p.t+dt*.6*routeWeight(p.name)/pathSample(p.path,0).length)%1;p.pos=pathSample(p.path,p.t).pos}if(state.playing)for(const p of oilParticles){p.t=(p.t+dt*.65*state.speed/pathSample(p.path,0).length)%1;p.pos=pathSample(p.path,p.t).pos}}
function updateCycle(){let deg=((state.angle*180/Math.PI-model.kinematics.firingOffset[state.selectedCylinder])%720+720)%720;let idx=Math.min(3,Math.floor(deg/180));const stages=['동력 행정','배기 행정','흡입 행정','압축 행정'];$('#strokeName').textContent=stages[idx];$('#strokeName').style.color=strokeColors[idx];$('#angleValue').textContent=Math.round(deg)+'°';$('#globalAngle').textContent=Math.round(state.angle*180/Math.PI%720)+'°';$('#crankSlider').value=state.angle*180/Math.PI%720;$('#cylinderInfo').textContent=(state.selectedCylinder+1)+'번 실린더 · 상대 위상';$('#strokeProgress').style.left=(deg/720*100)+'%';}
function wireEvents(){
 $('#driverViewBtn').onclick=()=>{setMode('cabin');state.target=[2.5,2.0,-8.6];state.dist=10.5;state.az=Math.PI;state.el=.14;setSelected('steering_wheel');};
 $('#cabinTopBtn').onclick=()=>{setMode('cabin');state.target=[0,1.5,-17];state.dist=27;state.az=Math.PI;state.el=1.48;};
 $('#cabinShellBtn').onclick=()=>{state.cabinCutaway=!state.cabinCutaway;$('#cabinShellBtn').textContent=state.cabinCutaway?'내장재 투시':'내장재 표시';if(state.mode!=='cabin')setMode('cabin');updatePartList();};
 $('#rearFold').oninput=e=>{state.rearFold=Number(e.target.value)/100;$('#rearFoldValue').textContent=e.target.value+'%';};
const canvas=$('#glcanvas');let moved=false,last=[0,0];
  canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);state.drag=e.button===2?'pan':'orbit';moved=false;last=[e.clientX,e.clientY];canvas.classList.add('dragging')});
  canvas.addEventListener('pointermove',e=>{if(!state.drag)return;const dx=e.clientX-last[0],dy=e.clientY-last[1];if(Math.abs(dx)+Math.abs(dy)>2)moved=true;
    if(state.drag==='orbit'){state.az-=dx*.007;state.el=clamp(state.el+dy*.007,-1.3,1.37)}
    else{const view=renderer.eye,t=state.target,fwd=vec3.norm(vec3.sub(t,view)),right=vec3.norm(vec3.cross(fwd,[0,1,0])),up=vec3.cross(right,fwd);const scale=state.dist*.0012;state.target=state.target.map((v,i)=>v+right[i]*(-dx*scale)+up[i]*(dy*scale))}
    last=[e.clientX,e.clientY];});
  canvas.addEventListener('pointerup',e=>{if(!moved&&e.button===0){const p=renderer.pick(e.clientX,e.clientY);if(p)setSelected(p.id)}state.drag=null;canvas.classList.remove('dragging')});
  canvas.addEventListener('pointercancel',()=>{state.drag=null;canvas.classList.remove('dragging')});
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('wheel',e=>{e.preventDefault();state.dist=clamp(state.dist*Math.exp(e.deltaY*.001),1.2,180)},{passive:false});
  $('#playBtn').onclick=()=>{state.playing=!state.playing;$('#playBtn').textContent=state.playing?'Ⅱ':'▶'};
  $('#speedSlider').oninput=e=>{state.speed=e.target.value/100;$('#speedValue').textContent=state.speed.toFixed(1)+'×'};
  $('#explodeSlider').oninput=e=>{state.explode=Number(e.target.value);$('#explodeValue').textContent=state.explode+'%'};
  $('#resetAnimBtn').onclick=()=>{state.angle=0;state.playing=false;$('#playBtn').textContent='▶';updateCycle()};
  $('#stepBtn').onclick=()=>{state.angle+=rad(30);state.playing=false;$('#playBtn').textContent='▶';updateCycle()};
  $('#ghostToggle').onchange=e=>state.ghost=e.target.checked;
  $('#hoodBtn').onclick=()=>{state.hoodOpen=!state.hoodOpen;$('#hoodBtn').textContent=state.hoodOpen?'본네트 닫기':'본네트 열기';};
  $('#bodyToggle').onchange=e=>{state.showBody=e.target.checked;updatePartList()};
  $('#crankSlider').oninput=e=>{state.angle=rad(Number(e.target.value));state.playing=false;$('#playBtn').textContent='▶';updateCycle()};
  $('#openingSlider').oninput=e=>{state.opening=Number(e.target.value)/100;$('#openingValue').textContent=e.target.value+'%'};
  $('#coolingPlay').onclick=()=>{state.coolingPlaying=!state.coolingPlaying;$('#coolingPlay').textContent=state.coolingPlaying?'냉각 순환 정지':'냉각 순환 재생'};
  $('#hidePart').onclick=()=>{state.hidden.add(state.selected);updatePartList()};
  $('#isolatePart').onclick=()=>{state.isolated=state.selected;updatePartList()};
  $('#restoreParts').onclick=()=>{state.hidden.clear();state.isolated=null;updatePartList()};
  $('#flowToggle').onchange=e=>state.flow=e.target.checked;
  $('#oilToggle').onchange=e=>state.oilFlow=e.target.checked;
  $('#sectionToggle').onchange=e=>state.section=e.target.checked;
  $('#sliceSlider').oninput=e=>{state.cutZ=state.target[2]+Number(e.target.value)/100*(['full','chassis','cabin','exterior'].includes(state.mode)?35:4);$('#sliceValue').textContent=e.target.value+'%'};
  document.querySelectorAll('[data-cylinder]').forEach(btn=>btn.onclick=()=>{state.selectedCylinder=Number(btn.dataset.cylinder)-1;document.querySelectorAll('[data-cylinder]').forEach(b=>b.classList.toggle('active',b===btn));setSelected('piston'+btn.dataset.cylinder);updateCycle()});
  $('#tagsToggle').onchange=e=>{state.tags=e.target.checked;updateTags()};
  $('#searchParts').oninput=updatePartList;
  $('#allSystemsBtn').onclick=()=>{state.visible=new Set(Object.keys(sysColors));refreshToggles();updatePartList()};
  $('#resetViewBtn').onclick=()=>setMode(state.mode);
  $('#topViewBtn').onclick=()=>{state.az=0;state.el=1.35};
  document.querySelectorAll('.mode').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
  $('#helpBtn').onclick=()=>$('#helpDialog').showModal();$('#closeHelp').onclick=$('#okHelp').onclick=()=>$('#helpDialog').close();
  window.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(document.activeElement.tagName))return;if(e.code==='Space'){e.preventDefault();$('#playBtn').click()}else if(e.code==='KeyR')$('#resetViewBtn').click()});
}
function animate(timestamp){if(!renderer)return;const dt=Math.max(0,Math.min(.055,(timestamp-lastTime)/1000||0));lastTime=timestamp;if(state.playing)state.angle=(state.angle+dt*1.36*state.speed)%(Math.PI*4);updateCooling(dt);renderer.render();updateTags();updateCycle();requestAnimationFrame(animate)}
async function boot(){try{model=await loadR4();renderer=new WebGLViewer($('#glcanvas'));renderer.upload(model);renderer.setupParticles();createToggles();setupTags();wireEvents();setMode('bay');$('#partCount').textContent=renderer.parts.length+' OBJECTS · R4+V2+R7';$('#gpuStatus').textContent='R7 · WEBGL 2';lastTime=performance.now();requestAnimationFrame(animate)}catch(e){console.error(e);$('#errorLayer').hidden=false;$('#errorMessage').textContent=e.message+' · start.bat으로 실행하거나 python -m http.server 8000을 사용해 주세요.';$('#gpuStatus').textContent='렌더러 오류';}}
boot();


