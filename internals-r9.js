import {Mesh} from './engine-bay.js';
export const R9_SCOPE={
 cabin:['seat upholstery','dashboard finish','door service hardware','safety electronics','roof and trunk wiring'],
 hvac:['blower impeller','air-mix and distribution doors','actuators','core fins','condensate drain','expansion valve'],
 powertrain:['starter','throttle body','engine sensors','chain guides and tensioner','turbo service lines','transmission valve body and pump'],
 limits:'Major educational assemblies only. No claim of complete OEM BOM, verified 2014 Korean trim, internal clearances, or manufacturing geometry.'
};
const center=p=>p.bounds[0].map((v,i)=>(v+p.bounds[1][i])/2);
function softBox(m,c,s,e=.25){const nu=32,nv=16,start=m.p.length/3,sp=v=>Math.sign(v)*Math.abs(v)**e;
 for(let j=1;j<nv;j++){const v=-Math.PI/2+j*Math.PI/nv;for(let i=0;i<nu;i++){const u=i*2*Math.PI/nu;m.p.push(c[0]+s[0]/2*sp(Math.cos(v))*sp(Math.cos(u)),c[1]+s[1]/2*sp(Math.sin(v)),c[2]+s[2]/2*sp(Math.cos(v))*sp(Math.sin(u)));}}
 for(let j=0;j<nv-2;j++)for(let i=0;i<nu;i++){const a=start+j*nu+i,b=start+j*nu+(i+1)%nu;m.i.push(a,b,b+nu,a,b+nu,a+nu);}
 for(const sign of [-1,1]){const n=m.p.length/3;m.p.push(c[0],c[1]+sign*s[1]/2,c[2]);const ring=start+(sign>0?nv-2:0)*nu;for(let i=0;i<nu;i++)m.i.push(n,...(sign>0?[ring+i,ring+(i+1)%nu]:[ring+(i+1)%nu,ring+i]));}return m;
}
export function upgradeInternalsR9(parts){
 const extra=[],groups={},preserved=new Map(parts.map(p=>[p.id,p]));
 function add(id,name,system,group,color,fn,meta={}){const m=new Mesh();fn(m);const p={id:'r9_'+id,name,system,category:'R9 · '+group,color,opacity:1,ghost:false,explode:[0,.8,0],anim:{kind:'world'},meta:{source:'r9-internals',r9Group:group,dimensionBasis:'illustrative; OEM dimensions unverified',...meta},description:name+'。장치의 구조와 연결을 설명하는 형상입니다. 2014 국내 트림별 구성·치수·배선 경로·작동 간섭은 미검증입니다.',...m.finish()};extra.push(p);groups[group]=(groups[group]||0)+1;return p;}
 const box=(id,n,sys,g,c,p,s,meta={})=>add(id,n,sys,g,c,m=>softBox(m,p,s,.22),meta);
 const tube=(id,n,sys,g,c,path,r,meta={})=>add(id,n,sys,g,c,m=>m.tube(path,r,16),meta);
 const C={silver:'#a8b8c3',metal:'#687e8c',black:'#26323c',dark:'#17232c',trim:'#465767',cloth:'#627481',accent:'#9eacb5',blue:'#4593af',red:'#b6645c'};
 function bolts(id,n,sys,g,points,axis=1,meta={}){add(id,n,sys,g,C.silver,m=>{for(const p of points)m.cyl(p,.045,.07,axis,6).ring(p,.067,.012,axis);},meta);}
 function replaceSoft(p){const c=center(p),s=p.bounds[1].map((v,i)=>v-p.bounds[0][i]),m=new Mesh();softBox(m,c,s,.28);return {...p,...m.finish(),meta:{...p.meta,r9Refined:true},description:(p.description||'')+' R9: 모서리와 쿠션 곡면 상세를 개선했습니다.'};}
 // Replace simplified cushions/backs/headrests and dashboard without overlaying duplicate shells.
 const refined=parts.map(p=>{
  if(/^(seat_(cushion|back)_[LR]|headrest_[LR]|rear_seat_(cushion|back)|rear_headrest_|dashboard$|r7_(cushion_bolster|back_bolster))/.test(p.id))return replaceSoft(p);
  if(['hvac_case','blower'].includes(p.id))return {...p,ghost:true,opacity:.19,meta:{...p.meta,r9Refined:true}};
  return p;
 });
 // Cabin upholstery, recessed insert panels and rear-seat folding attachments.
 for(const sign of [-1,1]){const x=sign*3.8,tag=sign>0?'driver':'passenger',label=sign>0?'운전석':'조수석';
  box('seat_insert_'+tag,label+' 좌판 중앙 패브릭','interior','실내',C.cloth,[x,.205,-12],[2.25,.12,2.75]);
  box('seat_back_insert_'+tag,label+' 등받이 중앙 패브릭','interior','실내',C.cloth,[x,1.9,-13.05],[2.15,3.05,.11]);
  add('seat_stitch_'+tag,label+' 쿠션 파이핑·퀼팅','interior','실내',C.accent,m=>{for(const dx of [-1.2,1.2])m.tube([[x+dx,.21,-13.25],[x+dx,.24,-11],[x+dx,.18,-10.6]],.012,8);for(let j=0;j<8;j++){const zz=-13.1+j*.32;m.tube([[x-.96,.275,zz],[x+.96,.275,zz]],.008,6);}});
  box('seat_back_pocket_'+tag,label+' 시트백 수납 포켓','interior','실내',C.trim,[x,1.4,-14.4],[2.2,1.3,.10]);
  box('buckle_connector_'+tag,label+' 안전벨트 버클 전기 커넥터','electrical','실내',C.red,[sign*2,-.62,-12.8],[.28,.12,.18]);
  tube('seat_branch_'+tag,label+' 시트 하부 분기 하네스','electrical','실내',C.black,[[x,-.8,-11],[x,-.8,-12.6],[sign*2,-.62,-12.8]],.032);
  add('belt_pretensioner_'+tag,label+' 벨트 프리텐셔너 개념부','interior','안전장치',C.metal,m=>m.cyl([sign*6.45,-.1,-16.9],.13,.78,1,24).box([sign*6.45,-.55,-16.9],[.5,.15,.4]));
  box('kick_panel_'+tag,label+' 발밑 측면 킥패널','interior','실내',C.trim,[sign*6.65,.1,-7.5],[.16,1.7,1.7]);
  box('dash_endcap_'+tag,label+' 대시보드 측면 엔드캡','interior','실내',C.black,[sign*6.74,2.18,-7.35],[.12,1.15,1.8]);
  tube('dash_seam_'+tag,label+' 대시보드 상하 분할선','interior','실내',C.dark,[[sign*.9,2.6,-8.44],[sign*3.2,2.6,-8.44],[sign*6.2,2.57,-8.35]],.018);
  for(const [zone,z] of [['front',-12],['rear',-21]]){const dt=zone+'_'+tag,l=label+' '+(zone==='front'?'앞문':'뒷문');
   box('door_water_'+dt,l+' 도어 방수막','interior','도어',C.black,[sign*7.16,1.0,z],[.035,2.8,5.6],{doorInternal:true});
   add('door_guide_'+dt,l+' 유리 전후 가이드 레일','interior','도어',C.metal,m=>{for(const dz of [-2.5,2.5])m.tube([[sign*7.23,-.5,z+dz],[sign*7.23,4,z+dz]],.045,12);},{doorInternal:true});
   add('door_carrier_'+dt,l+' 레귤레이터 캐리어·슬라이더','interior','도어',C.silver,m=>{for(const dz of [-.8,.8])m.box([sign*7.22,1.7,z+dz],[.25,.3,.45]);},{doorInternal:true});
   tube('door_loom_'+dt,l+' 도어 전장 분기 배선','electrical','도어',C.black,[[sign*7.18,.1,z+2.5],[sign*7.18,.4,z],[sign*7.18,1.5,z-.8]],.035,{doorInternal:true});
   add('door_grommet_'+dt,l+' 도어 연결 고무 부트','electrical','도어',C.dark,m=>{for(let k=0;k<7;k++)m.ring([sign*7.3,.15,z+2.4+k*.045],.105,.023,2);},{doorInternal:true});
   bolts('door_fasteners_'+dt,l+' 도어 서비스 체결부','interior','도어',[-2,0,2].map(dz=>[sign*7.27,.8,z+dz]),0,{doorInternal:true});
  }
 }
 for(const x of [-4,0,4]){
  box('rear_insert_'+x,'후석 좌판 패브릭 '+x,'interior','실내',C.cloth,[x,.32,-21],[3.2,.08,2.8]);
  box('rear_back_insert_'+x,'후석 등받이 패브릭 '+x,'interior','실내',C.cloth,[x,1.9,-22.39],[3.15,3.1,.10],{rearFoldAttached:true});
 }
 box('radio_face','오디오 디스플레이 베젤','interior','실내',C.dark,[0,2.4,-8.49],[1.8,1.15,.07]);
 box('display_glass','오디오 화면 유리','interior','실내','#336c86',[0,2.43,-8.54],[1.30,.77,.018]);
 add('display_interface','오디오 화면 그래픽','interior','실내','#a9c9d4',m=>{for(let j=0;j<4;j++)m.box([-.28,2.65-j*.13,-8.56],[.6-j*.08,.035,.008]);});
 add('vent_blades','대시보드 송풍구 루버·조절탭','hvac','공조',C.silver,m=>{for(const x of [-5.65,-1.9,1.9,5.65]){for(let j=0;j<5;j++)m.box([x,2.62-j*.09,-8.53],[.82,.025,.14]);m.box([x,2.44,-8.64],[.16,.10,.08]);}});
 add('climate_marks','공조 다이얼 눈금·조작 표시','interior','실내',C.accent,m=>{for(const x of [-.75,0,.75])for(let j=0;j<10;j++){const a=j/10*2*Math.PI;m.tube([[x+.19*Math.cos(a),1.1+.19*Math.sin(a),-8.6],[x+.22*Math.cos(a),1.1+.22*Math.sin(a),-8.6]],.009,6);}});
 box('srs_ecu','센터 터널 SRS 제어기','electrical','안전장치',C.metal,[0,-.57,-12.9],[.72,.18,.9]);
 box('srs_plug','SRS 제어기 전기 커넥터','electrical','안전장치','#c6aa4b',[.43,-.56,-12.9],[.22,.14,.45]);
 add('impact_sensors','전방 충돌 센서·브래킷','electrical','안전장치',C.black,m=>{for(const x of [-4.5,4.5])m.box([x,.5,5.7],[.3,.3,.18]).box([x,.28,5.7],[.5,.1,.3]);},{engineBay:true});
 tube('roof_loom','천장 조명·에어백 하네스','electrical','실내',C.black,[[6.8,3,-6],[6.5,7.1,-11],[6.4,7.15,-18],[0,7.15,-18]],.032,{roofTrim:true});
 tube('trunk_loom','트렁크 조명·래치 분기 배선','electrical','적재공간',C.black,[[6,-.4,-25],[6,1,-31],[0,1,-36]],.035);
 add('trunk_latch','트렁크 잠금 래치·스트라이커','interior','적재공간',C.silver,m=>m.box([0,-.1,-36],[.65,.30,.2]).tube([[-.15,.1,-36],[-.15,.4,-36],[.15,.4,-36],[.15,.1,-36]],.045));
 // HVAC service view: translucent original housings expose functional subassemblies.
 add('blower_impeller','블로워 시로코 임펠러','hvac','공조',C.cloth,m=>{m.ring([-3.2,.8,-6.58],.56,.035,2).ring([-3.2,.8,-6.15],.56,.035,2);for(let i=0;i<36;i++){const a=i/36*Math.PI*2;m.tube([[-3.2+.52*Math.cos(a),.8+.52*Math.sin(a),-6.58],[-3.2+.56*Math.cos(a+.04),.8+.56*Math.sin(a+.04),-6.15]],.018,6);}});
 add('blower_hub','블로워 모터 허브·축','hvac','공조',C.silver,m=>m.cyl([-3.2,.8,-6.35],.16,.55,2,32));
 box('blower_resistor','블로워 저항·전력 제어부','electrical','공조',C.metal,[-2.5,.25,-6.2],[.36,.24,.4]);
 for(const [id,x,y,z,w,h] of [['evaporator',-1,1.2,-6.7,2,1.5],['heater',.8,1,-6.48,.9,1.1]]){
  add(id+'_fins',(id==='heater'?'히터':'에바포레이터')+' 코어 핀·헤더','hvac','공조',C.silver,m=>{for(let k=0;k<28;k++)m.box([x-w/2+k*w/27,y,z],[.012,h,.08]);m.box([x,y-h/2,z],[w,.08,.12]).box([x,y+h/2,z],[w,.08,.12]);});
 }
 add('blend_door','냉온 혼합 플랩·회전축','hvac','공조',C.black,m=>m.box([.15,1.15,-6.15],[.08,1.6,1.05]).cyl([.15,1.15,-6.15],.05,1.9,1,20));
 add('distribution_door','토출 모드 분배 플랩','hvac','공조',C.trim,m=>m.box([-.7,2.05,-6.25],[1.8,.06,.7]).cyl([-.7,2.05,-6.25],.05,2,0,20));
 add('recirc_door','외기·내기 전환 플랩','hvac','공조',C.trim,m=>m.box([-3.2,1.72,-6.6],[1.1,.06,.7]).cyl([-3.2,1.72,-6.6],.045,1.2,0,20));
 for(const [id,c] of [['blend',[1.5,1,-6.2]],['mode',[-.7,2.3,-6.25]],['recirc',[-3.85,1.7,-6.6]]]){
  box('actuator_'+id,'공조 '+id+' 액추에이터','hvac','공조',C.black,c,[.38,.24,.40]);
  box('actuator_plug_'+id,'공조 '+id+' 커넥터','electrical','공조',C.blue,[c[0]+.22,c[1],c[2]],[.12,.12,.25]);
 }
 add('filter_pleats','실내 공기 필터 여과 주름','hvac','공조','#c4c6ad',m=>{for(let i=0;i<26;i++)m.box([-3.85+i*.05,1.9,-6.78],[.018,.35,.65]);});
 tube('condensate_drain','에바포레이터 응축수 배수관','hvac','공조',C.dark,[[-1,-.10,-6.5],[-1,-.6,-6.2],[-1,-1.1,-5.6]],.075);
 box('expansion_valve','에어컨 팽창밸브 블록','hvac','공조',C.silver,[-1.8,1.6,-4.55],[.45,.42,.30],{engineBay:true});
 tube('evaporator_pipes','팽창밸브–에바포레이터 냉매 연결','hvac','공조',C.silver,[[-1.8,1.6,-4.6],[-1.8,1.6,-5.2],[-1.8,1.4,-6.75]],.06);
 // Missing engine service assemblies; no modification to animated crank/piston geometry.
 add('starter','스타터 모터·감속 하우징','electrical','파워트레인',C.metal,m=>m.cyl([-2.7,-.65,-1.12],.30,.95,0,40).cyl([-2.16,-.65,-1.12],.22,.20,0,32),{engineBay:true});
 add('starter_solenoid','스타터 솔레노이드·전원 단자','electrical','파워트레인',C.black,m=>m.cyl([-2.75,-.24,-1.12],.15,.65,0,24).cyl([-3.11,-.24,-1.12],.055,.12,0,6),{engineBay:true});
 tube('starter_cable','배터리–스타터 전원 케이블','electrical','파워트레인',C.red,[[2.39,1.73,-1.52],[1.8,.4,-2.5],[-2.6,-.24,-1.3],[-3.11,-.24,-1.12]],.045,{engineBay:true});
 add('throttle','스로틀 바디·보어','intake','파워트레인',C.silver,m=>m.ring([1.95,1.25,1.25],.26,.08,0).tube([[1.8,1.25,1.25],[2.15,1.25,1.25]],.29,40,false),{engineBay:true});
 add('throttle_plate','스로틀 버터플라이·회전축','intake','파워트레인',C.accent,m=>m.cyl([1.98,1.25,1.25],.245,.025,0,40).tube([[1.98,.95,1.25],[1.98,1.55,1.25]],.025,12),{engineBay:true});
 box('throttle_motor','스로틀 전동 액추에이터','intake','파워트레인',C.black,[2,1.55,1.5],[.5,.36,.4],{engineBay:true});
 for(const [id,name,c] of [['crank_sensor','크랭크 위치 센서',[2.25,-.65,-.25]],['cam_sensor','캠 위치 센서',[2.27,1.6,.4]],['knock_sensor','노크 센서',[0,.1,-1]],['oil_sensor','오일 압력 스위치',[-1.5,-.7,.95]],['temp_sensor','냉각수 온도 센서',[2.4,.8,1.4]],['oxygen','배기 산소 센서',[-1,-.9,-2.8]]]){
  add(id,name,'electrical','파워트레인',C.black,m=>m.cyl(c,.075,.24,2,12).box([c[0],c[1],c[2]-.19],[.16,.14,.18]),{engineBay:true});
 }
 add('timing_guides','타이밍 체인 고정·가동 가이드','engine','파워트레인',C.black,m=>m.tube([[2.62,-.6,-.3],[2.62,.3,-.65],[2.62,1.4,-.65],[2.62,2.15,-.4]],.065,12).tube([[2.62,-.5,.5],[2.62,.5,.65],[2.62,1.7,.65]],.065,12));
 add('chain_tensioner','체인 유압 텐셔너·플런저','engine','파워트레인',C.silver,m=>m.cyl([2.63,.5,-.95],.12,.45,2,24).cyl([2.63,.5,-.67],.055,.18,2,16));
 add('pcv_diaphragm','캠커버 PCV 다이어프램 캡','intake','파워트레인',C.black,m=>m.cyl([.95,2.79,-.2],.30,.12,1,40).ring([.95,2.86,-.2],.23,.025,1),{engineBay:true});
 tube('turbo_oil_feed','터보 오일 공급관','lubrication','파워트레인',C.silver,[[1,-.1,-.9],[.8,.4,-1.5],[-.7,.7,-2]],.035,{engineBay:true});
 tube('turbo_oil_return','터보 오일 리턴관','lubrication','파워트레인',C.metal,[[-.7,.05,-2],[-.6,-.5,-1.7],[-.4,-.9,-.8]],.065,{engineBay:true});
 tube('turbo_coolant','터보 냉각수 서비스 연결관','cooling','파워트레인',C.black,[[2.5,.5,-.2],[1.8,.6,-1.6],[-.5,.55,-2]],.055,{engineBay:true});
 add('alternator_vents','발전기 통풍 슬롯·타이볼트','electrical','파워트레인',C.dark,m=>{for(let j=0;j<12;j++){const a=j/12*2*Math.PI;m.tube([[2.7,1.05+.40*Math.cos(a),-1.24+.40*Math.sin(a)],[3.30,1.05+.40*Math.cos(a),-1.24+.40*Math.sin(a)]],.018,6);}},{engineBay:true});
 add('trans_pump','변속기 오일펌프·입력 허브','transmission','변속기',C.silver,m=>m.ring([-2.65,-.2,0],.45,.12,0).cyl([-2.65,-.2,0],.17,.35,0,32));
 box('valvebody','자동변속기 유압 밸브바디','transmission','변속기',C.metal,[-3.2,-.75,.05],[1.30,.14,1.35]);
 add('valve_channels','밸브바디 유로 패턴','transmission','변속기',C.silver,m=>{for(let j=0;j<6;j++)m.tube([[-3.75,-.66,-.5+j*.2],[-2.7,-.66,-.5+j*.2],[-2.7,-.66,-.42+j*.2],[-3.6,-.66,-.42+j*.2]],.018,8);});
 add('trans_solenoids','변속 솔레노이드 뱅크','transmission','변속기',C.black,m=>{for(let j=0;j<6;j++)m.cyl([-3.65+j*.19,-.50,.60],.065,.30,2,20);});
 box('trans_filter','변속기 오일 스트레이너','transmission','변속기',C.black,[-3.2,-.93,0],[1.10,.08,1.0]);
 add('parking_pawl','변속기 주차 폴·래칫 개념','transmission','변속기',C.silver,m=>m.box([-3.5,.05,.65],[.5,.1,.15]).cyl([-3.7,.05,.65],.12,.18,1,20));
 box('range_sensor','변속 레인지 센서','electrical','변속기',C.black,[-3.65,.52,.15],[.55,.16,.5],{engineBay:true});
 bolts('gearbox_bolts','변속기 하우징 플랜지 체결부','transmission','변속기',[[-3.9,-.8,-.8],[-3.9,.3,-.8],[-3.9,-.8,.8],[-3.9,.3,.8]],0);
 // Gaskets, ribs, casting fasteners and hose clamps make existing housings legible.
 add('camcover_bolts','캠커버 둘레 체결부','engine','파워트레인',C.silver,m=>{for(const x of [-1.8,-.6,.6,1.8])for(const z of [-.77,.77])m.cyl([x,2.73,z],.055,.08,1,6);},{engineBay:true});
 add('oilpan_ribs','오일팬 보강 리브·드레인 플러그','lubrication','파워트레인',C.metal,m=>{for(let x=-1.8;x<2;x+=.3)m.box([x,-1.37,0],[.06,.12,1.35]);m.cyl([1.65,-1.40,.60],.075,.10,1,6);});
 add('hose_clamps','냉각·흡기 호스 밴드 체결부','cooling','파워트레인',C.silver,m=>{for(const [x,y,z,r] of [[2.5,.5,-.2,.075],[-.5,.55,-2,.075],[-.7,.7,-2,.055]])m.ring([x,y,z],r,.014,1);},{engineBay:true});
 return {parts:refined.concat(extra),groups,added:extra.length,refined:refined.filter(p=>p.meta.r9Refined).map(p=>p.id)};
}
