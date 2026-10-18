'use strict';
/* Portable, standalone WebGL2 renderer. There are no external JS/CDN dependencies.
   Python writes model.json + conceptual_assembly.glb. The viewer loads the JSON
   mesh manifest for reliable offline playback; GLB is included for CAD/Blender exchange.
*/

const $=(s)=>document.querySelector(s);
const sysColors={구조:'#97aabf',운동:'#f3bd65',타이밍:'#b49be6',냉각:'#4dcbd3',흡배기:'#e18b71',구동:'#b39ad9',차체:'#738ba3',윤활:'#e9a84b',점화:'#ed9d95'};
const strokeColors=['#e7ac67','#ac94dc','#63b5d8','#71c8a4'];
const state={playing:true,speed:1,angle:0,explode:0,ghost:true,flow:true,tags:true,mode:'overview',visible:new Set(Object.keys(sysColors)),selected:'block',selectedCylinder:0,section:false,cutZ:0,oilFlow:true,az:-.49,el:.35,dist:12,target:[-.3,.22,.2],drag:null,parts:[],fps:0};
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
void main(){if(uCase>.5 && uSlice>.5 && vPos.z>uSlicePosition)discard;vec3 n=normalize(vNormal);vec3 light=normalize(vec3(-.56,.86,1.0));
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
    this.makeGrid();gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  }
  programFrom(v,f){const gl=this.gl;const compile=(t,src)=>{const shader=gl.createShader(t);gl.shaderSource(shader,src);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader};const prog=gl.createProgram();gl.attachShader(prog,compile(gl.VERTEX_SHADER,v));gl.attachShader(prog,compile(gl.FRAGMENT_SHADER,f));gl.linkProgram(prog);if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(prog));return prog;}
  upload(data){const gl=this.gl;this.parts=data.parts.map(part=>{const vao=gl.createVertexArray();gl.bindVertexArray(vao);const positions=new Float32Array(part.positions),normals=new Float32Array(part.normals),indices=new Uint32Array(part.indices);
      for(const [name,arr] of [['aPosition',positions],['aNormal',normals]]){const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,arr,gl.STATIC_DRAW);const loc=gl.getAttribLocation(this.program,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,3,gl.FLOAT,false,0,0)}
      const ibo=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ibo);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);gl.bindVertexArray(null);
      return {...part,vao,count:indices.length,center:part.bounds[0].map((v,i)=>(v+part.bounds[1][i])*.5),model:mat.id(),rgb:hexColor(part.color)};
    });this.partById=new Map(this.parts.map(p=>[p.id,p]));}
  makeGrid(){const gl=this.gl;const vertices=[];for(let x=-10;x<=10;x++){vertices.push(x,-2.18,-10,x,-2.18,10)}for(let z=-10;z<=10;z++){vertices.push(-10,-2.18,z,10,-2.18,z)}this.gridCount=vertices.length/3;this.grid=gl.createVertexArray();gl.bindVertexArray(this.grid);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);const loc=gl.getAttribLocation(this.lineProgram,'aPosition');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,3,gl.FLOAT,false,0,0);gl.bindVertexArray(null);}
  calcPose(part){const ani=part.anim||{},ang=state.angle,expl=state.explode*.014;let pose=mat.id();const cr=model.kinematics;const ex=part.explode.map(v=>v*expl);
    if(ani.kind==='crank'){pose=mat.mul(mat.trans(0,cr.crankY,0),mat.rx(ang));}
    else if(ani.kind==='cam'){pose=mat.mul(mat.trans(0,2.16,ani.z),mat.rx(ang/2));}
    else if(ani.kind==='piston'||ani.kind==='rod'){
      const i=ani.index,phase=ang+rad(cr.phase[i]);const cy=cr.crankY+cr.crankRadius*Math.cos(phase),cz=cr.crankRadius*Math.sin(phase);const py=cy+Math.sqrt(cr.conrod**2-cz**2),x=cr.positions[i];
      if(ani.kind==='piston'){pose=mat.trans(x,py,0)}
      else{const y=(cy+py)/2,z=cz/2;pose=mat.mul(mat.trans(x,y,z),mat.rx(Math.atan2(-cz,py-cy)))}
    } else if(ani.kind==='turborotor'){const c=ani.center;pose=mat.mul(mat.trans(...c),mat.mul(mat.rx(ang*7.5),mat.trans(...c.map(v=>-v))))}
    else if(ani.kind==='combustion'){const deg=((ang*180/Math.PI-cr.firingOffset[ani.index])%720+720)%720;part.dynamicAlpha=deg<75? .64*Math.pow(Math.sin(Math.PI*deg/75),.75):0}
    else if(ani.kind==='valve'){
      const cycle=(ang*180/Math.PI-model.kinematics.firingOffset[ani.index]+1440)%720;
      const range=ani.side==='intake'?[355,545]:[175,365];let lift=0;
      if(cycle>range[0]&&cycle<range[1])lift=.13*Math.pow(Math.sin(Math.PI*(cycle-range[0])/(range[1]-range[0])),.8);
      pose=mat.trans(0,-lift,0);
    }
    part.model=mat.mul(mat.trans(...ex),pose);
  }
  updateView(){const gl=this.gl,canvas=this.canvas;const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight),scale=Math.min(2,window.devicePixelRatio||1);if(canvas.width!==Math.floor(w*scale)||canvas.height!==Math.floor(h*scale)){canvas.width=Math.floor(w*scale);canvas.height=Math.floor(h*scale)}gl.viewport(0,0,canvas.width,canvas.height);
    const e=state.el,a=state.az,d=state.dist;this.eye=[state.target[0]+d*Math.sin(a)*Math.cos(e),state.target[1]+d*Math.sin(e),state.target[2]+d*Math.cos(a)*Math.cos(e)];
    this.vp=mat.mul(mat.perspective(rad(45),canvas.width/canvas.height,.04,120),mat.lookAt(this.eye,state.target));}
  render(){const gl=this.gl;this.updateView();gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);this.drawGrid();gl.useProgram(this.program);gl.uniformMatrix4fv(this.loc.uViewProj,false,this.vp);gl.uniform3fv(this.loc.uEye,this.eye);gl.uniform1f(this.loc.uSlice,state.section?1:0);gl.uniform1f(this.loc.uSlicePosition,state.cutZ);
    const opacityPart=[];
    for(const part of this.parts){this.calcPose(part);if(!state.visible.has(part.system))continue;const a=part.anim?.kind==='combustion'?part.dynamicAlpha:(part.ghost?(state.ghost?part.opacity:1):part.opacity);if(a<.025)continue;if(a<.99){opacityPart.push([part,a]);continue}this.drawPart(part,a)}
    gl.depthMask(false);opacityPart.sort((a,b)=>{const pa=mat.point(a[0].model,a[0].center),pb=mat.point(b[0].model,b[0].center);return vec3.dot(vec3.sub(pb,this.eye),vec3.sub(pb,this.eye))-vec3.dot(vec3.sub(pa,this.eye),vec3.sub(pa,this.eye))});for(const [p,a] of opacityPart)this.drawPart(p,a);gl.depthMask(true);this.drawParticles();gl.bindVertexArray(null);}
  drawPart(part,alpha){const gl=this.gl;gl.uniformMatrix4fv(this.loc.uModel,false,part.model);gl.uniform3fv(this.loc.uColor,part.rgb);gl.uniform1f(this.loc.uAlpha,alpha);gl.uniform1f(this.loc.uSelect,state.selected===part.id ? .6 : 0);gl.uniform1f(this.loc.uCase,['block','liners','head','valvecover','oilpan','gearbox'].includes(part.id)?1:0);gl.uniform1f(this.loc.uGlow,part.anim?.kind==='combustion'?1:0);gl.bindVertexArray(part.vao);gl.drawElements(gl.TRIANGLES,part.count,gl.UNSIGNED_INT,0);}
  drawGrid(){const gl=this.gl;gl.useProgram(this.lineProgram);gl.uniformMatrix4fv(this.lineLoc.uViewProj,false,this.vp);gl.uniformMatrix4fv(this.lineLoc.uModel,false,mat.id());gl.uniform4fv(this.lineLoc.uRGBA,[.21,.36,.48,.17]);gl.bindVertexArray(this.grid);gl.drawArrays(gl.LINES,0,this.gridCount);}
  drawParticles(){if(!(state.flow&&state.visible.has('냉각'))&&!(state.oilFlow&&state.visible.has('윤활')))return;const gl=this.gl;gl.useProgram(this.lineProgram);gl.uniformMatrix4fv(this.lineLoc.uViewProj,false,this.vp);gl.uniformMatrix4fv(this.lineLoc.uModel,false,mat.id());gl.bindVertexArray(this.particleVao);gl.bindBuffer(gl.ARRAY_BUFFER,this.particleBuffer);for(const [enabled,points,color] of [[state.flow&&state.visible.has('냉각'),coolParticles,[.18,.94,.98,.94]],[state.oilFlow&&state.visible.has('윤활'),oilParticles,[1.0,.65,.17,.98]]]){if(!enabled||!points.length)continue;gl.uniform4fv(this.lineLoc.uRGBA,color);const positions=new Float32Array(points.flatMap(p=>p.pos));gl.bufferData(gl.ARRAY_BUFFER,positions,gl.DYNAMIC_DRAW);gl.drawArrays(gl.POINTS,0,points.length)}}
  setupParticles(){const gl=this.gl;this.particleVao=gl.createVertexArray();this.particleBuffer=gl.createBuffer();gl.bindVertexArray(this.particleVao);gl.bindBuffer(gl.ARRAY_BUFFER,this.particleBuffer);gl.bufferData(gl.ARRAY_BUFFER,1024,gl.DYNAMIC_DRAW);const a=gl.getAttribLocation(this.lineProgram,'aPosition');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,3,gl.FLOAT,false,0,0);gl.bindVertexArray(null);coolParticles=[];for(const [name,path] of Object.entries(model.coolingPaths))for(let i=0;i<16;i++)coolParticles.push({path,name,t:i/16,pos:path[0]});oilParticles=[];for(const [name,path] of Object.entries(model.oilPaths||{}))for(let i=0;i<15;i++)oilParticles.push({path,name,t:i/15,pos:path[0]});}
  project(pos){const m=this.vp;const x=pos[0],y=pos[1],z=pos[2];const p=[m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14],m[3]*x+m[7]*y+m[11]*z+m[15]];if(p[3]<=0)return null;const ndc=[p[0]/p[3],p[1]/p[3],p[2]/p[3]];if(Math.abs(ndc[0])>1.3||Math.abs(ndc[1])>1.3)return null;return [(ndc[0]*.5+.5)*this.canvas.clientWidth,(1-ndc[1])*.5*this.canvas.clientHeight,p[3]];}
  pick(clientX,clientY){const rect=this.canvas.getBoundingClientRect(),ndcX=(clientX-rect.left)/rect.width*2-1,ndcY=1-(clientY-rect.top)/rect.height*2;
    const aspect=rect.width/rect.height,depth=Math.tan(rad(45)/2),dirCamera=vec3.norm([ndcX*aspect*depth,ndcY*depth,-1]);const fwd=vec3.norm(vec3.sub(state.target,this.eye)),right=vec3.norm(vec3.cross(fwd,[0,1,0])),up=vec3.cross(right,fwd);
    const dir=vec3.norm([0,1,2].map(j=>right[j]*dirCamera[0]+up[j]*dirCamera[1]-fwd[j]*dirCamera[2]));
    const intersections=[];
    for(const part of this.parts){if(!state.visible.has(part.system))continue;const center=mat.point(part.model,part.center);const size=part.bounds[1].map((v,i)=>v-part.bounds[0][i]);const radius=Math.hypot(...size)*.43+.05;const rel=vec3.sub(center,this.eye);const dist=vec3.dot(rel,dir);if(dist<0)continue;const gap=Math.hypot(...vec3.sub(rel,dir.map(v=>v*dist)));if(gap<radius)intersections.push({part,dist:dist-Math.sqrt(radius*radius-gap*gap),miss:gap/radius});}
    intersections.sort((a,b)=>a.dist-b.dist||a.miss-b.miss);return intersections.length?intersections[0].part:null;
  }
}
function createToggles(){const root=$('#systemList');root.innerHTML='';for(const [sys,color] of Object.entries(sysColors)){const b=document.createElement('button');b.className='system-toggle on';b.innerHTML=`<span class="color-dot" style="background:${color}"></span>${{구조:'엔진 구조',운동:'운동부',타이밍:'밸브/타이밍',냉각:'냉각',흡배기:'터보/흡배기',구동:'변속기',차체:'엔진룸',윤활:'윤활/오일',점화:'점화/연료'}[sys]}`;b.title=`${sys} 표시 전환`;b.onclick=()=>{if(state.visible.has(sys))state.visible.delete(sys);else state.visible.add(sys);refreshToggles();updatePartList()};b.dataset.sys=sys;root.appendChild(b)}}
function refreshToggles(){document.querySelectorAll('.system-toggle').forEach(b=>{b.classList.toggle('on',state.visible.has(b.dataset.sys))});}
function setSelected(id){const p=renderer.partById.get(id);if(!p)return;state.selected=id;$('#partSystem').textContent=p.category;$('#partTitle').textContent=p.name;$('#partDesc').textContent=p.description;$('#partId').textContent=id.toUpperCase();updatePartList()}
function updatePartList(){if(!renderer)return;const query=$('#searchParts').value.toLowerCase().trim();const valid=renderer.parts.filter(p=>state.visible.has(p.system)&&(!query||(p.name+p.description+p.category).toLowerCase().includes(query)));$('#visibleCount').textContent=valid.length+'개';const root=$('#partList');root.innerHTML='';for(const p of valid){const btn=document.createElement('button');btn.className='part-item'+(p.id===state.selected?' selected':'');btn.style.setProperty('--swatch',p.color);btn.innerHTML=`<span>${p.name}</span><small>↗</small>`;btn.onclick=()=>setSelected(p.id);root.appendChild(btn)}}
function setMode(name){state.mode=name;document.querySelectorAll('.mode').forEach(b=>b.classList.toggle('active',b.dataset.mode===name));const modes={
  overview:{visible:['구조','운동','타이밍','냉각','흡배기','구동','차체'],selected:'block',badge:'엔진룸 전체 · 주요 부품 배치',text:'실제 설치 위치는 차종·시장별로 다를 수 있습니다. 엔진·변속기·냉각계통의 연결 관계를 확인하세요.',title:'전체 구성의 이해',cam:[-.3,.22,.2,12,-.49,.35]},
  internals:{visible:['구조','운동','타이밍'],selected:'piston1',badge:'4행정 엔진 · 피스톤과 밸브',text:'크랭크축 2회전(720°) 동안 흡입, 압축, 동력, 배기 행정이 한 번씩 진행됩니다.',title:'4행정 사이클',cam:[0,.12,0,8.3,-.37,.26]},
  cooling:{visible:['구조','냉각'],selected:'waterpump',badge:'냉각수 개념 유로 · 흐름 표시',text:'냉각수는 워터펌프의 순환력으로 엔진에서 열을 받아 라디에이터에서 방출합니다. 서모스탯이 라디에이터 유로를 제어합니다.',title:'냉각수 순환',cam:[0,.13,1.2,11.5,-.29,.34]},
  turbo:{visible:['구조','흡배기'],selected:'turbo',badge:'배기가스 에너지 → 과급 공기',text:'배기가스가 터빈을 구동하고 압축기는 흡기를 가압합니다. 인터쿨러는 뜨거워진 압축 공기를 식힙니다.',title:'터보차저와 과급',cam:[-.5,.4,-.1,10,-.72,.40]},
  drive:{visible:['운동','구동','구조'],selected:'planetarysun',badge:'엔진 → 컨버터 → 변속기 → 차동기어',text:'유성기어의 선기어·유성기어·링기어와 클러치의 기능을 살펴봅니다. 실제 6T40의 단수별 구동방식을 복제한 것은 아닙니다.',title:'자동변속기 개념 구조',cam:[-1.65,-.25,.1,11,-.45,.20]},
  oil:{visible:['구조','운동','윤활'],selected:'oilpump',badge:'오일팬 → 펌프 → 필터 → 베어링·캠축',text:'오일이 스트레이너를 거쳐 펌프에서 가압되고, 필터를 지나 마찰 부품에 공급된 뒤 중력으로 오일팬에 돌아옵니다.',title:'엔진오일 순환',cam:[.2,-.25,0,10.5,-.37,.25]},
  ignition:{visible:['구조','운동','타이밍','점화','흡배기'],selected:'coilmodule',badge:'MFI 연료분사 → 혼합기 압축 → 점화',text:'점화코일 일체형 모듈과 4개 점화플러그, 포트 인젝터의 역할을 살펴봅니다. 주황색 구체는 실제 화염이 아닌 점화시점 표시입니다.',title:'점화·연료분사',cam:[0,.56,0,9,-.42,.44]}}
  const m=modes[name];if(!m)return;state.visible=new Set(m.visible);state.target=m.cam.slice(0,3);state.dist=m.cam[3];state.az=m.cam[4];state.el=m.cam[5];$('#stageBadge').innerHTML='<span class="pulse"></span> '+m.badge;$('#learnCard').innerHTML=`<span class="learn-no">01</span><b>${m.title}</b><p>${m.text}</p>`;refreshToggles();setSelected(m.selected)}
function setupTags(){const labels={block:['실린더 블록',[0,.2,-.45]],turbo:['터보차저',[-.45,.75,-2]],radiator:['라디에이터',[0,.8,3.4]],gearbox:['6단 변속기',[-3.3,.35,0]],waterpump:['워터펌프',[2.9,-.5,.8]],oilpump:['오일펌프',[2.8,-.94,.34]],coilmodule:['점화 모듈',[0,2.95,0]]};const root=$('#tagLayer');for(const [id,[name,pos]] of Object.entries(labels)){let b=document.createElement('button');b.className='model-tag';b.textContent=name;b.onclick=()=>setSelected(id);b.dataset.id=id;b.dataset.pos=JSON.stringify(pos);root.appendChild(b);tagLinks.push(b)}}
function updateTags(){for(const tag of tagLinks){const part=renderer.partById.get(tag.dataset.id);if(!part||!state.tags||!state.visible.has(part.system)){tag.style.display='none';continue}const pos=JSON.parse(tag.dataset.pos);const offset=part.explode.map(v=>v*state.explode*.014);const proj=renderer.project(vec3.add(pos,offset));if(!proj){tag.style.display='none';continue}tag.style.display='block';tag.style.left=proj[0]+'px';tag.style.top=proj[1]+'px';}}
function updateCooling(dt){if(!model)return;for(const p of [...coolParticles,...oilParticles]){p.t=((p.t+dt*.08*state.speed)%1+1)%1;const path=p.path;const segments=path.length-1;const u=p.t*segments,i=Math.min(segments-1,Math.floor(u)),f=u-i;p.pos=path[i].map((v,j)=>v+(path[i+1][j]-v)*f)}}
function updateCycle(){let deg=((state.angle*180/Math.PI-model.kinematics.firingOffset[state.selectedCylinder])%720+720)%720;let idx=Math.min(3,Math.floor(deg/180));const stages=['동력 행정','배기 행정','흡입 행정','압축 행정'];$('#strokeName').textContent=stages[idx];$('#strokeName').style.color=strokeColors[idx];$('#angleValue').textContent=Math.round(deg)+'°';$('#cylinderInfo').textContent=(state.selectedCylinder+1)+'번 실린더 · 상대 위상';$('#strokeProgress').style.left=(deg/720*100)+'%';}
function wireEvents(){const canvas=$('#glcanvas');let moved=false,last=[0,0];
  canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);state.drag=e.button===2?'pan':'orbit';moved=false;last=[e.clientX,e.clientY];canvas.classList.add('dragging')});
  canvas.addEventListener('pointermove',e=>{if(!state.drag)return;const dx=e.clientX-last[0],dy=e.clientY-last[1];if(Math.abs(dx)+Math.abs(dy)>2)moved=true;
    if(state.drag==='orbit'){state.az-=dx*.007;state.el=clamp(state.el+dy*.007,-1.3,1.37)}
    else{const view=renderer.eye,t=state.target,fwd=vec3.norm(vec3.sub(t,view)),right=vec3.norm(vec3.cross(fwd,[0,1,0])),up=vec3.cross(right,fwd);const scale=state.dist*.0012;state.target=state.target.map((v,i)=>v+right[i]*(-dx*scale)+up[i]*(dy*scale))}
    last=[e.clientX,e.clientY];});
  canvas.addEventListener('pointerup',e=>{if(!moved&&e.button===0){const p=renderer.pick(e.clientX,e.clientY);if(p)setSelected(p.id)}state.drag=null;canvas.classList.remove('dragging')});
  canvas.addEventListener('pointercancel',()=>{state.drag=null;canvas.classList.remove('dragging')});
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('wheel',e=>{e.preventDefault();state.dist=clamp(state.dist*Math.exp(e.deltaY*.001),3.3,30)},{passive:false});
  $('#playBtn').onclick=()=>{state.playing=!state.playing;$('#playBtn').textContent=state.playing?'Ⅱ':'▶'};
  $('#speedSlider').oninput=e=>{state.speed=e.target.value/100;$('#speedValue').textContent=state.speed.toFixed(1)+'×'};
  $('#explodeSlider').oninput=e=>{state.explode=Number(e.target.value);$('#explodeValue').textContent=state.explode+'%'};
  $('#resetAnimBtn').onclick=()=>{state.angle=0;state.playing=false;$('#playBtn').textContent='▶';updateCycle()};
  $('#stepBtn').onclick=()=>{state.angle+=rad(30);state.playing=false;$('#playBtn').textContent='▶';updateCycle()};
  $('#ghostToggle').onchange=e=>state.ghost=e.target.checked;
  $('#flowToggle').onchange=e=>state.flow=e.target.checked;
  $('#oilToggle').onchange=e=>state.oilFlow=e.target.checked;
  $('#sectionToggle').onchange=e=>state.section=e.target.checked;
  $('#sliceSlider').oninput=e=>{state.cutZ=Number(e.target.value)/100;$('#sliceValue').textContent=e.target.value+'%'};
  document.querySelectorAll('[data-cylinder]').forEach(btn=>btn.onclick=()=>{state.selectedCylinder=Number(btn.dataset.cylinder)-1;document.querySelectorAll('[data-cylinder]').forEach(b=>b.classList.toggle('active',b===btn));setSelected('piston'+btn.dataset.cylinder);updateCycle()});
  $('#tagsToggle').onchange=e=>{state.tags=e.target.checked;updateTags()};
  $('#searchParts').oninput=updatePartList;
  $('#allSystemsBtn').onclick=()=>{state.visible=new Set(Object.keys(sysColors));refreshToggles();updatePartList()};
  $('#resetViewBtn').onclick=()=>{state.target=[-.3,.22,.2];state.az=-.49;state.el=.35;state.dist=12};
  $('#topViewBtn').onclick=()=>{state.target=[-.3,0,0];state.az=-.2;state.el=1.35;state.dist=12};
  document.querySelectorAll('.mode').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
  $('#helpBtn').onclick=()=>$('#helpDialog').showModal();$('#closeHelp').onclick=$('#okHelp').onclick=()=>$('#helpDialog').close();
  window.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(document.activeElement.tagName))return;if(e.code==='Space'){e.preventDefault();$('#playBtn').click()}else if(e.key==='KeyR')$('#resetViewBtn').click()});
}
function animate(timestamp){if(!renderer)return;const dt=Math.max(0,Math.min(.055,(timestamp-lastTime)/1000||0));lastTime=timestamp;if(state.playing)state.angle=(state.angle+dt*1.36*state.speed)%(Math.PI*4);updateCooling(dt);renderer.render();updateTags();updateCycle();requestAnimationFrame(animate)}
async function boot(){try{const response=await fetch('models/model.json');if(!response.ok)throw Error('models/model.json 로딩 오류 ('+response.status+')');model=await response.json();renderer=new WebGLViewer($('#glcanvas'));renderer.upload(model);renderer.setupParticles();createToggles();setupTags();wireEvents();setMode('internals');$('#partCount').textContent=renderer.parts.length+' PARTS';$('#gpuStatus').textContent='WEBGL 2 · LOCAL';lastTime=performance.now();requestAnimationFrame(animate)}catch(e){console.error(e);$('#errorLayer').hidden=false;$('#errorMessage').textContent=e.message+' · start.bat으로 실행하거나 python -m http.server 8000을 사용해 주세요.';$('#gpuStatus').textContent='렌더러 오류';}}
boot();
