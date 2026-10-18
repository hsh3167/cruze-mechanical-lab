"""Reproducible V2 viewer integration with canonical R4 geometry."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parent
js=(ROOT/'v2-viewer-source.js').read_text(encoding='utf-8')
def replace(old,new):
    global js
    assert old in js,old[:90]
    js=js.replace(old,new)
def between(start,end,value):
    global js
    a=js.index(start);b=js.index(end,a);js=js[:a]+value+js[b:]

js="import {loadR4} from './glb-loader.js';\nimport {pistonPose,valveLift} from './mechanics.js';\n"+js
colors=dict(engine='#b7c8d9',intake='#e18b71',ignition='#ed9d95',cooling='#4dcbd3',lubrication='#e9a84b',transmission='#b39ad9',
    structure='#97aabf',suspension='#f3bd65',steering='#d7b867',brakes='#d78787',wheels='#8b9baa',exhaust='#b9a38b',fuel='#afbd80',hvac='#71b6cc',electrical='#b49be6',interior='#a8aa98',body='#738ba3')
between('const sysColors=','const strokeColors=', 'const sysColors='+json.dumps(colors)+';\n')
replace('playing:true','playing:false')
replace('selectedCylinder:0,section:false','selectedCylinder:0,showBody:false,coolingPlaying:true,opening:0,hidden:new Set(),isolated:null,section:false')
replace("function hexColor(h)","""function partVisible(p){if(!state.visible.has(p.system)||state.hidden.has(p.id)||(state.isolated&&state.isolated!==p.id))return false;
 if(p.system==='body'&&!state.showBody&&state.mode!=='exterior')return false;
 if(state.mode==='pump')return p.meta?.coolingPart==='pump';if(state.mode==='thermostat')return p.meta?.coolingPart==='thermostat';
 if(p.id==='coolanthose')return false;
 if(state.mode==='internals'&&p.system==='engine'&&['block','head','valvecover','headbolts','headgasket','oilpan','liners'].includes(p.id))return false;
 return true;}
const pathCache=new WeakMap();
function pathSample(path,t){let d=pathCache.get(path);if(!d){const lengths=path.slice(1).map((p,i)=>Math.hypot(...vec3.sub(p,path[i])));d={lengths,total:lengths.reduce((a,b)=>a+b,0)};pathCache.set(path,d)}let u=((t%1)+1)%1*d.total;for(let i=0;i<d.lengths.length;i++){const len=d.lengths[i];if(u<=len)return {pos:path[i].map((v,j)=>v+(path[i+1][j]-v)*u/(len||1)),length:d.total};u-=len}return {pos:path[0],length:d.total}}
function routeWeight(name){const k=model.coolingRouteMeta[name]?.kind;return k==='main'?state.opening:k==='bypass'?1-state.opening:1}
function hexColor(h)""")
replace('gl.enable(gl.CULL_FACE)','gl.disable(gl.CULL_FACE)')
replace('vec3 n=normalize(vNormal);','vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;')
replace('-.04,120)', '-.04,500)') if '-.04,120)' in js else None
replace(',.04,120)', ',.04,500)')
replace('for(let x=-10;x<=10;x++)','for(let x=-50;x<=50;x+=2)')
replace('for(let z=-10;z<=10;z++)','for(let z=-50;z<=50;z+=2)')
replace('x,-2.18,-10,x,-2.18,10','x,-5.35,-50,x,-5.35,50')
replace('-10,-2.18,z,10,-2.18,z','-50,-5.35,z,50,-5.35,z')
between('  calcPose(part){','  updateView(){',"""  calcPose(part){let pose=mat.id();const a=part.anim||{},u=part.meta||{},k=model.kinematics,angle=state.angle;
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
   if(a.kind==='combustion'){const deg=((angle*180/Math.PI-k.firingOffset[a.index])%720+720)%720;part.dynamicAlpha=state.mode==='ignition'&&deg<75?.64*Math.pow(Math.sin(Math.PI*deg/75),.75):0}
   const ex=(['pump','thermostat'].includes(state.mode)&&u.explodeOffset?u.explodeOffset:part.explode).map(v=>v*state.explode*.014);part.model=mat.mul(mat.trans(...ex),pose);
  }
""")
replace("let model=null,renderer=null,lastTime=0", "let coolingRotorAngle=0;\nlet model=null,renderer=null,lastTime=0")
replace('if(!state.visible.has(part.system))continue;', 'if(!partVisible(part))continue;')
replace("if(!part||!state.tags||!state.visible.has(part.system))", "if(!part||!state.tags||!partVisible(part))")
replace("if(!part||!state.tags||!partVisible(part))", "if(!part||!state.tags||['full','chassis','cabin','exterior'].includes(state.mode)||!partVisible(part))")
replace("const valid=renderer.parts.filter(p=>state.visible.has(p.system)", "const valid=renderer.parts.filter(p=>partVisible(p)")
replace("'냉각'", "'cooling'")
replace("'윤활'", "'lubrication'")
replace('coolParticles,[.18,.94,.98,.94]', 'coolParticles.filter(p=>routeWeight(p.name)>.001),[.18,.94,.98,.94]')
between('function createToggles(){','function refreshToggles()',"""function createToggles(){const root=$('#systemList');root.innerHTML='';for(const [sys,color] of Object.entries(sysColors)){const b=document.createElement('button');b.className='system-toggle on';b.innerHTML=`<span class="color-dot" style="background:${color}"></span>${model.systemLabels[sys]}`;b.title=model.systemLabels[sys]+' 표시 전환';b.onclick=()=>{if(state.visible.has(sys))state.visible.delete(sys);else state.visible.add(sys);refreshToggles();updatePartList()};b.dataset.sys=sys;root.appendChild(b)}}
""")
between('function setMode(name){','function setupTags()',"""function setMode(name){const all=Object.keys(sysColors);const modes={
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
cabin:{visible:['structure','interior','hvac','steering','electrical'],selected:'battery',badge:'실내 · 공조 · 전장',text:'실내 공간과 공조·전장 부품의 개념 배치입니다. 국내 트림별 사양과 치수는 검증되지 않았습니다.',title:'실내 패키징',cam:[0,2,-18,52,-.6,.45]},
exterior:{visible:['body','wheels'],selected:'block',badge:'외장·유리 · 전체 패키징',text:'차량 외형의 단순화된 개념 형상입니다. 실제 크루즈 외장 면품질과 정확한 비례를 보증하지 않습니다.',title:'외장 패키징',cam:[0,0,-15,75,-.6,.3]}};
const m=modes[name];if(!m)return;state.mode=name;state.hidden.clear();state.isolated=null;state.explode=0;$('#explodeSlider').value=0;$('#explodeValue').textContent='0%';state.visible=new Set(m.visible);state.target=m.cam.slice(0,3);state.dist=m.cam[3];state.az=m.cam[4];state.el=m.cam[5];document.querySelectorAll('.mode').forEach(b=>b.classList.toggle('active',b.dataset.mode===name));$('#stageBadge').innerHTML='<span class="pulse"></span> '+m.badge;$('#learnCard').innerHTML=`<span class="learn-no">01</span><b>${m.title}</b><p>${m.text}</p>`;refreshToggles();setSelected(m.selected);updatePartList();}
""")
between('function updateCooling(dt){','function updateCycle()',"""function updateCooling(dt){if(!model)return;if(state.coolingPlaying)coolingRotorAngle+=dt*2*Math.PI;for(const p of coolParticles){if(!state.coolingPlaying||routeWeight(p.name)<.001)continue;p.t=(p.t+dt*.6*routeWeight(p.name)/pathSample(p.path,0).length)%1;p.pos=pathSample(p.path,p.t).pos}if(state.playing)for(const p of oilParticles){p.t=(p.t+dt*.65*state.speed/pathSample(p.path,0).length)%1;p.pos=pathSample(p.path,p.t).pos}}
""")
replace("state.dist=clamp(state.dist*Math.exp(e.deltaY*.001),3.3,30)", "state.dist=clamp(state.dist*Math.exp(e.deltaY*.001),1.2,180)")
replace("$('#ghostToggle').onchange=e=>state.ghost=e.target.checked;", """$('#ghostToggle').onchange=e=>state.ghost=e.target.checked;
  $('#bodyToggle').onchange=e=>{state.showBody=e.target.checked;updatePartList()};
  $('#crankSlider').oninput=e=>{state.angle=rad(Number(e.target.value));state.playing=false;$('#playBtn').textContent='▶';updateCycle()};
  $('#openingSlider').oninput=e=>{state.opening=Number(e.target.value)/100;$('#openingValue').textContent=e.target.value+'%'};
  $('#coolingPlay').onclick=()=>{state.coolingPlaying=!state.coolingPlaying;$('#coolingPlay').textContent=state.coolingPlaying?'냉각 순환 정지':'냉각 순환 재생'};
  $('#hidePart').onclick=()=>{state.hidden.add(state.selected);updatePartList()};
  $('#isolatePart').onclick=()=>{state.isolated=state.selected;updatePartList()};
  $('#restoreParts').onclick=()=>{state.hidden.clear();state.isolated=null;updatePartList()};""")
replace("state.cutZ=Number(e.target.value)/100", "state.cutZ=state.target[2]+Number(e.target.value)/100*(['full','chassis','cabin','exterior'].includes(state.mode)?35:4)")
replace("$('#resetViewBtn').onclick=()=>{state.target=[-.3,.22,.2];state.az=-.49;state.el=.35;state.dist=12};", "$('#resetViewBtn').onclick=()=>setMode(state.mode);")
replace("$('#topViewBtn').onclick=()=>{state.target=[-.3,0,0];state.az=-.2;state.el=1.35;state.dist=12};", "$('#topViewBtn').onclick=()=>{state.az=0;state.el=1.35};")
replace("else if(e.key==='KeyR')", "else if(e.code==='KeyR')")
replace("const response=await fetch('models/model.json');if(!response.ok)throw Error('models/model.json 로딩 오류 ('+response.status+')');model=await response.json();", "model=await loadR4();")
replace("setMode('internals');", "setMode('full');")
replace("renderer.parts.length+' PARTS'", "renderer.parts.length+' OBJECTS · R4+V2'")
replace("$('#gpuStatus').textContent='WEBGL 2 · LOCAL'", "$('#gpuStatus').textContent='R5 · WEBGL 2'")
replace("$('#angleValue').textContent=Math.round(deg)+'°';", "$('#angleValue').textContent=Math.round(deg)+'°';$('#globalAngle').textContent=Math.round(state.angle*180/Math.PI%720)+'°';$('#crankSlider').value=state.angle*180/Math.PI%720;")
(ROOT/'app.js').write_text(js,encoding='utf-8')
print('Unified R4/V2 viewer built')
