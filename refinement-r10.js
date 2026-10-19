import {Mesh} from './engine-bay.js';
import {SCALE} from './chassis-r8.js';
export const DIMENSIONS={lengthMM:4605,widthMM:1790,heightMM:1475,frontOverhangMM:955,rearOverhangMM:965,wheelbaseMM:2685,frontTrackMM:1545,rearTrackMM:1560,tire:'205/60R16',source:'https://blog.gm-korea.co.kr/3875',image:'https://t1.daumcdn.net/cfile/tistory/2428CB3652689CD312'};
export const SERVICES={
 front:{label:'앞바퀴 · 브레이크 · 스트럿',mode:'suspension',camera:[0,.3,0,27,-.62,.3],steps:['휠·타이어','캘리퍼·디스크·허브','스트럿·스프링','암·조향 연결']},
 door:{label:'앞문 · 유리 · 레귤레이터',mode:'cabin',camera:[8,2,-11.5,17,Math.PI*.43,.24],steps:['트림·스위치','방수막·배선','레귤레이터·래치','유리·외판']},
 hvac:{label:'공조 · 블로워 · 열교환기',mode:'hvacdetail',camera:[-1.2,1,-6.4,12,-.38,.36],steps:['케이스·필터','블로워·제어기','플랩·액추에이터','히터·증발기']},
 engine:{label:'엔진 · 타이밍 · 보조장치',mode:'internals',camera:[0,.3,0,15,-.4,.26],steps:['커버·센서','타이밍·흡배기','헤드·밸브','블록·회전부']}
};
export function materialFor(p){const id=p.id;return /glass|windshield/.test(id)?{roughness:.12,metallic:.05,specular:.65}:/tire|rubber|boot|bushing|hose|seal|belt/.test(id)?{roughness:.93,metallic:0,specular:.05}:/seat|headrest|carpet|fabric|stitch|headliner|door_trim/.test(id)?{roughness:.96,metallic:0,specular:.025}:/disc|shaft|crank|gear|bolt|nut|rim|hub|spoke|rod|spring|pipe|rail|bracket/.test(id)?{roughness:.32,metallic:.78,specular:.55}:/hood|fascia|door_[LR]$|roof$|pillar|trunk_lid/.test(id)?{roughness:.27,metallic:.32,specular:.46}:{roughness:.69,metallic:.08,specular:.18};}
const center=p=>p.bounds[0].map((x,i)=>(x+p.bounds[1][i])/2);
function groupFor(p){const c=center(p),id=p.id;
 if(c[2]>-4&&['suspension','wheels','brakes','steering','transmission'].includes(p.system)&&/FL|FR|tierod_|steering_rack/.test(id))return ['front',/tire|rim|spoke|lug|tread|valve/.test(id)?0:/disc|caliper|hub|knuckle/.test(id)?1:/strut|spring|damper|boot|bumpstop/.test(id)?2:3];
 if(p.meta.doorAssembly==='front:1')return ['door',/trim|arm_|pocket|handle|switch/.test(id)?0:/water|loom|grommet/.test(id)?1:/regulator|carrier|latch|bowden|guide/.test(id)?2:3];
 if(p.meta.r9Group==='공조'||['hvac_case','blower','evaporator','heatercore','r7_cabin_filter','r7_blower_duct','r7_defrost_duct'].includes(id))return ['hvac',/case|filter|duct/.test(id)?0:/blower/.test(id)?1:/door|actuator/.test(id)?2:3];
 if(['engine','intake','exhaust','ignition','lubrication'].includes(p.system)&&!p.meta.engineBay&&c[2]>-4&&c[2]<4)return ['engine',/cover|sensor|coil|plug/.test(id)?0:/timing|chain|turbo|manifold|throttle/.test(id)?1:/head|valve|cam/.test(id)?2:3];return null;}
export function upgradeR10(parts){const added=[],repaired=[],connections=[];let next=parts.map(p=>({...p,meta:{...p.meta}}));const baseBody=next.filter(p=>p.system==='body'&&!p.meta.engineBay&&!/mirror|hood/.test(p.id)),bodyWidth=Math.max(...baseBody.map(p=>Math.max(Math.abs(p.bounds[0][0]),Math.abs(p.bounds[1][0])))),bodyTop=Math.max(...baseBody.map(p=>p.bounds[1][1])),front=Math.max(...baseBody.map(p=>p.bounds[1][2])),rear=Math.min(...baseBody.map(p=>p.bounds[0][2])),ground=-2.1-652.4/SCALE.mmPerUnit/2,targetTop=ground+1475/SCALE.mmPerUnit;
 const warp=v=>[v[0]*(1790/SCALE.mmPerUnit/2/bodyWidth),v[1]>3.25?3.25+(v[1]-3.25)*(targetTop-3.25)/(bodyTop-3.25):v[1],v[2]>0?v[2]*(955/SCALE.mmPerUnit)/front:v[2]<-27?-27+(v[2]+27)*(965/SCALE.mmPerUnit)/(-rear-27):v[2]];
 // Recompute normals after nonuniform body deformation. Powertrain, wheelbase and suspension anchors stay unchanged.
 next=next.map(p=>{if((p.system==='body'&&!p.meta.engineBay&&!/hood|mirror/.test(p.id))||p.meta.roofTrim||/r9_roof_loom/.test(p.id)){const m=new Mesh();m.p=Array.from(p.positions);m.i=Array.from(p.indices);for(let i=0;i<m.p.length;i+=3)m.p.splice(i,3,...warp(m.p.slice(i,i+3)));p={...p,...m.finish(),meta:{...p.meta,r10Proportioned:true}};}return p;});
 function add(id,name,system,color,fn,meta={}){const m=new Mesh();fn(m);const p={id:'r10_'+id,name,system,category:'R10 연결·장착',color,opacity:1,ghost:false,explode:[0,.6,0],anim:{kind:'world'},description:name+' · 연결 위치와 조립 관계를 설명하는 보강 형상입니다. 정비 절차와 실차 간섭의 인증 결과는 아닙니다.',meta:{source:'r10-refinement',...meta},...m.finish()};added.push(p);return p;}
 function replace(id,fn){const i=next.findIndex(p=>p.id===id);if(i<0)return;const m=new Mesh();fn(m);next[i]={...next[i],...m.finish(),meta:{...next[i].meta,r10Connection:true}};repaired.push(id);}
 for(const sign of [-1,1]){const tag=sign>0?'FR':'FL',x=sign*1545/SCALE.mmPerUnit/2;
 replace('halfshaft_'+tag,m=>m.tube([[sign*3.15,-2,-.2],[sign*4.5,-2.04,-.12],[x,-2.1,0]],.12,24));
 add('hub_'+tag,'전륜 허브 플랜지 '+tag,'brakes','#a3b2ba',m=>m.cyl([sign*7.3,-2.1,0],.29,.96,0,32).cyl([sign*6.98,-2.1,0],.59,.15,0,40),{wheelTag:tag});
 add('cvboots_'+tag,'등속 조인트 벨로즈 '+tag,'transmission','#273039',m=>{for(const cx of [sign*3.45,sign*6.75])for(let i=0;i<8;i++)m.ring([cx+sign*(i-3.5)*.065,-2.06,-.09],.18+.07*Math.sin(i/7*Math.PI),.035,0);},{wheelTag:tag});
 replace('tierod_'+(sign>0?'R':'L'),m=>m.tube([[sign*4,-1.5,-2.2],[sign*5.3,-1.62,-1.35],[sign*6.65,-1.75,-.12]],.075,16));
 add('tie_joint_'+tag,'타이로드 볼 조인트 '+tag,'steering','#87959d',m=>m.cyl([sign*6.65,-1.75,-.12],.17,.3,1,24),{wheelTag:tag});
 add('balljoint_'+tag,'로어암 볼 조인트 '+tag,'suspension','#748a96',m=>m.cyl([sign*6.6,-2.55,0],.2,.34,1,24),{wheelTag:tag});
 connections.push({id:'hub-shaft-'+tag,parts:['halfshaft_'+tag,'r10_hub_'+tag],point:[x,-2.1,0],kind:'shared endpoint',toleranceMM:5},{id:'tie-knuckle-'+tag,parts:['tierod_'+(sign>0?'R':'L'),'knuckle_'+tag],point:[sign*6.65,-1.75,-.12],kind:'endpoint inside knuckle bounds',toleranceMM:15});
 }
 // The old diagnostic CV stub crossed the gearbox along Z; replace with an inboard joint sleeve.
 replace('cvshaft',m=>m.cyl([-3.15,-2,-.2],.22,.5,0,24));
 // Door group assignment follows physical X, never ambiguous legacy L/R suffixes.
 for(const p of next){const c=center(p),id=p.id;if(/^(front_door|rear_door|sideglass_|mirror_|plus_door_|r7_(door_|window_|rear_door_trim)|r9_door_)/.test(id)&&!id.includes('seals')){p.meta.doorAssembly=(c[2]>-16.4?'front':'rear')+':'+(c[0]>0?1:-1);if(id.startsWith('sideglass_'))p.meta.windowMoving=true;}}
 for(const sign of [-1,1])for(const type of ['front','rear']){const z=type==='front'?-5.9:-16.5,back=type==='front'?-16.2:-26.5,x=sign*8.4,meta={doorAssembly:type+':'+sign};
 add('door_frame_'+type+'_'+sign,'도어 내부 보강·헤밍 '+type+' '+sign,'interior','#536675',m=>m.tube([[x,-1.35,z],[x,-1.35,back],[x,2.8,back],[x,2.8,z],[x,-1.35,z]],.075,12).tube([[sign*7.2,.7,(z+back)/2],[x,.7,(z+back)/2]],.09,12),meta);
 add('door_hinge_'+type+'_'+sign,'도어 힌지·체크 링크 '+type+' '+sign,'interior','#b3bdc1',m=>{for(const y of [-.65,2.15])m.box([x,y,z],[.35,.34,.45]).cyl([x,y,z],.09,.5,1,16);m.tube([[sign*7.3,.3,z-.1],[x,.3,z-.35]],.065,12);},meta);
 add('door_weather_'+type+'_'+sign,'도어 개구부 씰 '+type+' '+sign,'body','#1c2932',m=>m.tube([[x,-1.4,z],[x,-1.4,back],[sign*7.75,7.25,back+.5],[sign*7.75,7.25,z-3],[x,2.8,z],[x,-1.4,z]],.055,12),meta);
 }
 // HVAC shell screws and a discrete heater pipe bulkhead connection.
 add('hvac_screws','공조 케이스 체결 나사','hvac','#9ca8af',m=>{for(const x of [-3.45,-1.2,1.05])for(const y of [-.2,1.1,2.3])m.cyl([x,y,-5.5],.045,.09,2,6);},{r9Group:'공조'});
 add('heater_bulkhead','히터 파이프 방화벽 그로밋','hvac','#252e36',m=>m.box([-.35,1.2,-4.67],[.7,.45,.18]),{engineBay:true});
 add('hvac_mode_cam','공조 풍향 모드 캠·링크','hvac','#b1bdc0',m=>{m.cyl([1.1,1.05,-6.25],.29,.08,0,36);for(let i=0;i<12;i++){const a=i*Math.PI/6;m.box([1.1,1.05+Math.cos(a)*.29,-6.25+Math.sin(a)*.29],[.08,.09,.09]);}m.tube([[1.1,1.05,-6.25],[1.1,1.45,-6.55]],.035,12);},{r9Group:'공조',catalogCandidate:'13263294; 13267333',fitment:'US catalog reference; Korean VIN not verified'});
 add('blower_bracket','블로워 제어기 장착 브래킷','hvac','#778c99',m=>m.box([-2.7,.1,-6.45],[.5,.08,.55]).box([-2.7,.28,-6.7],[.5,.4,.07]),{r9Group:'공조',catalogCandidate:'13376446'});
 add('hvac_loom','공조 모듈 와이어링 하니스','electrical','#34434e',m=>m.tube([[-3.3,.5,-5.8],[-2.8,1.6,-5.8],[-.8,2.1,-5.8],[1,1.4,-5.9]],.045,16),{r9Group:'공조',catalogCandidate:'13265200'});
 add('heater_clamps','히터 코어 파이프 클램프','hvac','#b4c2c9',m=>{for(const x of [-.55,-.15])m.ring([x,1.2,-4.7],.12,.025,2);},{r9Group:'공조',engineBay:true,catalogCandidate:'93190977'});
 add('starter_bolts','스타터 체결 볼트','electrical','#aab7bd',m=>{for(const x of [-1.8,-1.3])m.cyl([x,-1.2,-1.65],.065,.3,2,6);},{engineBay:true,catalogCandidate:'11048336'});
 next.push(...added);
 for(const p of next){const id=p.id,tag=id.match(/(?:halfshaft|arm_front|arm_rear)_(FL|FR)$/)?.[1];if(tag){const s=tag==='FR'?1:-1;p.meta.link={from:id.startsWith('halfshaft')?[s*3.15,-2,-.2]:[s*2.8,-2.55,id.startsWith('arm_front')?1:-2.5],to:id.startsWith('halfshaft')?[s*1545/SCALE.mmPerUnit/2,-2.1,0]:[s*6.6,-2.55,0],tag};}if(id==='tierod_L'||id==='tierod_R'){const s=id.endsWith('R')?1:-1;p.meta.link={from:[s*4,-1.5,-2.2],to:[s*6.65,-1.75,-.12],tag:s>0?'FR':'FL'};}}

 for(const p of next){p.meta.material=materialFor(p);const svc=groupFor(p);if(svc){p.meta.service=svc[0];p.meta.serviceStage=svc[1];}
 const c=center(p),id=p.id;let tag=id.match(/(?:^|_)(FL|FR|RL|RR)$/)?.[1];if(!tag&&p.meta.wheelTag)tag=p.meta.wheelTag;
 if(tag){p.meta.wheelTag=tag;const isSpring=/spring/.test(id),isDamper=/strut|damper|rearshock|boot|bump/.test(id);p.meta.suspensionMotion=isSpring?'spring':isDamper?'strut':/mount|bushing/.test(id)?'fixed':'unsprung';}
 }
 return {parts:next,added:added.map(p=>p.id),repaired,connections,dimensions:DIMENSIONS,bodyWarp:{bodyWidth,bodyTop,front,rear,ground,targetTop},limits:['Body envelope calibrated; surface design remains approximate.','Suspension and steering motion is an educational kinematic approximation, not a load or collision simulation.','Only listed connection checks are verified; full interference certification is pending.']};
}
export function doorPivot(assembly){const [type,s]=assembly.split(':');return [Number(s)*8.4,1,type==='front'?-5.9:-16.5];}
export function rotateYPoint(p,pivot,a){const x=p[0]-pivot[0],z=p[2]-pivot[2],c=Math.cos(a),s=Math.sin(a);return [pivot[0]+c*x+s*z,p[1],pivot[2]-s*x+c*z];}
export function motionDescriptor(p,state){const u=p.meta||{},ops=[];if(u.doorAssembly){const sign=Number(u.doorAssembly.split(':')[1]);if(u.windowMoving)ops.push({kind:'translate',value:[0,-3.45*(state.windowOpen||0),0]});ops.push({kind:'rotateY',pivot:doorPivot(u.doorAssembly),angle:-sign*(state.doorOpen||0)*Math.PI/3});}
 if(u.link){const sign=u.link.tag==='FR'?1:-1,pivot=[sign*1545/SCALE.mmPerUnit/2,-2.1,0],to=rotateYPoint(u.link.to,pivot,(state.steer||0)*Math.PI/180);to[1]+=(state.travel||0)/SCALE.mmPerUnit;ops.push({kind:'link',from:u.link.from,to:u.link.to,target:to});}
 if(u.wheelTag&&!u.link){const front=u.wheelTag[0]==='F',sign=u.wheelTag[1]==='R'?1:-1,x=sign*(front?1545:1560)/SCALE.mmPerUnit/2,z=front?0:-27,travel=(state.travel||0)/SCALE.mmPerUnit;
 if(u.suspensionMotion==='spring'||u.suspensionMotion==='strut'){const top=p.bounds[1][1],bottom=p.bounds[0][1];ops.push({kind:'scaleY',pivot:[0,top,0],scale:Math.max(.45,1-travel/Math.max(.5,top-bottom))});}
 else if(u.suspensionMotion==='unsprung'){if(front)ops.push({kind:'rotateY',pivot:[x,-2.1,z],angle:(state.steer||0)*Math.PI/180});ops.push({kind:'translate',value:[0,travel,0]});}}
 if(p.id==='steering_wheel'||p.id==='steering_center')ops.push({kind:'rotateZ',pivot:[4.4,3.1,-8.4],angle:-(state.steer||0)*Math.PI/180*4});
 return ops;}
export function serviceOffset(p,service,progress){if(p.meta?.service!==service||progress===0)return [0,0,0];const stage=p.meta.serviceStage||0,t=Math.max(0,Math.min(1,progress*4-stage)),c=center(p);return service==='front'?[Math.sign(c[0])*(2+stage*.65)*t,(stage===2?3:0)*t,stage===3?-1.8*t:0]:service==='door'?[(2+stage*1.2)*t,stage===3?2*t:0,0]:service==='hvac'?[(stage-1.5)*1.8*t,stage*.7*t,-(1+stage*.6)*t]:[(stage-1.5)*1.3*t,(4-stage)*1.35*t,0];}
