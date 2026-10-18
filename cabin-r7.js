import {Mesh} from './engine-bay.js';

// Right-handed world: +Y up, +Z vehicle forward, +X VEHICLE LEFT.
// R4's legacy L/R IDs used the opposite X convention. Keep IDs stable for saves.
export const VEHICLE_FRAME={forward:[0,0,1],up:[0,1,0],left:[1,0,0],driverX:4.4};
export const MIRRORED_IDS=new Set(['steering_wheel','steering_center','steering_column','steering_motor','instrument_cluster','pedal_accelerator','pedal_brake','brake_booster','master_cylinder','brake_reservoir','bay_brake_cap','plus_glovebox','plus_glovehandle','bcm','hvac_case','evaporator','heatercore','blower']);
function reflect(p){
 const positions=p.positions.slice(),normals=p.normals.slice(),indices=p.indices.slice();
 for(let i=0;i<positions.length;i+=3){positions[i]=-positions[i];normals[i]=-normals[i];}
 for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
 return {...p,positions,normals,indices,bounds:[[-p.bounds[1][0],p.bounds[0][1],p.bounds[0][2]],[-p.bounds[0][0],p.bounds[1][1],p.bounds[1][2]]],meta:{...p.meta,r7Corrected:true}};
}
export function correctVehicleFrame(parts){return parts.map(original=>{
 let p=MIRRORED_IDS.has(original.id)?reflect(original):{...original,meta:{...original.meta}};
 // Preserve the intake end of the vacuum hose and reconnect its booster end.
 if(p.id==='bay_booster_vacuum')p={...p,...new Mesh().tube([[4.3,1.8,-3.9],[3.4,2.2,-3.6],[0,2.8,-3.7],[-2,1.6,-.7],[-1.8,1.4,1.2]],.07).finish(),meta:{...p.meta,r7Corrected:true}};
 if(p.id==='bay_latch_cable')p={...p,...new Mesh().tube([[0,2.52,4.8],[4.8,2.52,4.8],[6.4,2.5,2],[6.4,2.45,-4.4],[5.8,.6,-7.4]],.035).finish(),meta:{...p.meta,r7Corrected:true}};
 // Public left/right labels follow vehicle direction, never camera direction.
 if(/_(?:[FR]?[LR])(?:_|$)/.test(p.id)&&!p.id.startsWith('r7_')){
  const side=(p.bounds[0][0]+p.bounds[1][0])/2>0?'좌측':'우측';
  p.name=(p.name||p.meta.label||p.id).replace(/\b(FL|FR|RL|RR|L|R)\b/g,token=>token.length===2?(token[0]==='F'?'전륜 ':'후륜 ')+side:side);
  p.meta.vehicleSide=side;p.meta.label=p.name;
 }
 const names={steering_wheel:'운전석 스티어링 휠 · 좌핸들',steering_center:'운전석 에어백 모듈',instrument_cluster:'운전석 계기판',pedal_accelerator:'운전석 가속 페달',pedal_brake:'운전석 브레이크 페달',plus_glovebox:'조수석 글로브박스',plus_glovehandle:'조수석 글로브박스 손잡이'};
 if(names[p.id]){p.name=names[p.id];p.meta.label=p.name;}
 if(/^seat_(cushion|back)_R$|^headrest_R$/.test(p.id))p.name=(p.name||p.meta.label).replace('앞좌석','운전석');
 if(/^seat_(cushion|back)_L$|^headrest_L$/.test(p.id))p.name=(p.name||p.meta.label).replace('앞좌석','조수석');
 if(p.id==='plus_belt_front_-1'||p.id==='plus_belt_front_1'){
  const x=p.id.endsWith('_-1')?-1:1;
  p={...p,...ribbon([[x*6.65,4.6,-16.65],[x*2.1,.3,-13.1],[x*5.5,.05,-13.8]],.18).finish()};
 }
 if(p.system==='interior'&&MIRRORED_IDS.has(p.id))p.description=(p.name||p.id)+' . 차량 전방 +Z, 차량 좌측 +X 기준으로 수정한 좌핸들 배치입니다. 형상과 치수는 교육용 개념 모델입니다.';
 return p;
});}

// Broad flat webbing, rather than cylindrical hoses for safety belts.
function ribbon(path,width){const m=new Mesh();for(let i=0;i<path.length-1;i++){
 const a=path[i],b=path[i+1],n=m.p.length/3;
 for(const p of [a,b])for(const dx of [-width/2,width/2])m.p.push(p[0]+dx,p[1],p[2]);
 m.i.push(n,n+2,n+3,n,n+3,n+1);
 }return m;}
function rounded(m,c,d,r=.12){
 const [w,h,depth]=d,steps=5,start=m.p.length/3,outline=[];
 r=Math.min(r,w*.45,h*.45);
 for(const [x,y,base] of [[w/2-r,h/2-r,0],[-w/2+r,h/2-r,90],[-w/2+r,-h/2+r,180],[w/2-r,-h/2+r,270]])for(let i=0;i<=steps;i++){
 const a=(base+i*90/steps)*Math.PI/180;outline.push([x+r*Math.cos(a),y+r*Math.sin(a)]);
 }
 const count=outline.length;
 for(const z of [-depth/2,depth/2])for(const [x,y] of outline)m.p.push(c[0]+x,c[1]+y,c[2]+z);
 for(let i=0;i<count;i++){const j=(i+1)%count;m.i.push(start+i,start+j,start+count+j,start+i,start+count+j,start+count+i);}
 for(let i=1;i<count-1;i++)m.i.push(start,start+i+1,start+i,start+count,start+count+i,start+count+i+1);
 return m;
}
export function buildCabinR7(){
 const parts=[],C={trim:'#3e4854',soft:'#515d6a',dark:'#1e2831',silver:'#abbac4',fabric:'#626e77',belt:'#293139',red:'#c65751',glass:'#88bac6',ivory:'#c1beb2'};
 function add(id,name,group,color,build,description='',meta={}){const m=new Mesh();build(m);parts.push({id:'r7_'+id,name,system:meta.system||'interior',category:group,color:C[color]||color,opacity:1,ghost:false,explode:[0,.7,0],anim:{kind:'world'},meta:{source:'r7-interior',cabin:true,cabinGroup:group,...meta},description:name+'。'+description+' 교육용 개념 형상이며 국내 트림별 사양·치수·체결부는 실차 검증 전입니다.',...m.finish()});}
 const box=(id,n,g,c,p,d,desc='',meta={})=>add(id,n,g,c,m=>rounded(m,p,d,.1),desc,meta);
 // Driving controls: all linked to the positive-X driver's position.
 add('wheel_spokes','스티어링 휠 3스포크','운전 조작계','silver',m=>m.tube([[4.4,3.1,-8.44],[3.5,3.34,-8.44]],.09).tube([[4.4,3.1,-8.44],[5.3,3.34,-8.44]],.09).tube([[4.4,3.1,-8.44],[4.4,2.02,-8.44]],.10));
 box('column_shroud','스티어링 칼럼 상하 커버','운전 조작계','trim',[4.4,2.65,-7.95],[1.1,.72,.75]);
 add('stalks','방향지시등·와이퍼 레버','운전 조작계','dark',m=>m.tube([[3.94,2.85,-8],[3.14,3,-8.13]],.075).tube([[4.86,2.85,-8],[5.65,3,-8.13]],.075));
 add('ignition','시동 키 실린더','운전 조작계','silver',m=>m.cyl([3.78,2.55,-8.18],.16,.14,2));
 box('lighting_switch','조명 조절 스위치','운전 조작계','dark',[5.9,1.65,-8.49],[.55,.55,.17]);
 add('cluster_gauges','속도계·회전계 다이얼','운전 조작계','dark',m=>{for(const x of [3.8,5])m.cyl([x,2.8,-8.18],.37,.06,2);});
 add('cluster_rings','계기판 크롬 베젤','운전 조작계','silver',m=>{for(const x of [3.8,5])m.ring([x,2.8,-8.22],.37,.025,2);});
 add('cluster_ticks','계기판 눈금·바늘','운전 조작계','ivory',m=>{for(const x of [3.8,5]){for(let i=0;i<12;i++){const a=i*Math.PI/6;m.tube([[x+.28*Math.cos(a),2.8+.28*Math.sin(a),-8.27],[x+.33*Math.cos(a),2.8+.33*Math.sin(a),-8.27]],.012,6);}m.tube([[x,2.8,-8.27],[x-.21,2.98,-8.27]],.018,6);}});
 box('cluster_lcd','계기판 중앙 정보창','운전 조작계','glass',[4.4,2.8,-8.19],[.36,.45,.05]);
 box('dead_pedal','운전석 풋레스트','운전 조작계','dark',[5.75,-.58,-7.1],[.75,.18,1.25]);
 add('pedal_arms','브레이크·가속 페달 암','운전 조작계','silver',m=>m.tube([[4.2,-.25,-6.5],[4.2,.8,-5.65],[4.2,1.1,-5.2]],.065).tube([[3.1,-.25,-6.5],[3.1,.65,-5.8]],.045));
 box('pedal_bracket','페달 박스 지지대','운전 조작계','trim',[4.1,1.05,-5.6],[2.5,.18,.65]);
 add('booster_pushrod','브레이크 부스터 푸시로드','운전 조작계','silver',m=>m.tube([[4.2,1.1,-5.2],[4.5,1.6,-4.45]],.055), '브레이크 페달과 엔진룸 부스터 연결.',{system:'brakes'});
 add('master_abs_lines','마스터 실린더–ABS 연결 배관','브레이크','silver',m=>{for(let i=0;i<2;i++)m.tube([[4.5,1.55,-3.2+i*.22],[5.1,1.55,-3.2+i*.22],[5.6,1.1,-3.85+i*.22],[4.7+i*.25,.85,-3.0]],.025,8);},'',{system:'brakes',engineBay:true,cabin:false});
 box('knee_panel','운전석 무릎 하부 커버','대시보드','trim',[4.4,1.18,-8.25],[3.9,.65,.20]);
 box('passenger_airbag','조수석 에어백 모듈','안전장치','dark',[-4.2,2.66,-7.25],[2.75,.35,.85]);
 box('glove_inner','글로브박스 내부 수납함','대시보드','dark',[-4.1,1.75,-7.8],[3.35,.65,.8]);
 box('hazard','비상등 스위치','센터 스택','red',[0,2.98,-8.5],[.28,.20,.08]);
 box('radio_keys','오디오 물리 버튼 패널','센터 스택','dark',[0,1.91,-8.56],[1.55,.22,.12]);
 add('radio_knobs','오디오 볼륨·선곡 노브','센터 스택','silver',m=>{for(const x of [-.62,.62])m.cyl([x,1.9,-8.65],.10,.10,2);});
 box('power_socket','12V 전원·AUX 단자','센터 콘솔','dark',[0,.82,-8.7],[.85,.28,.10]);
 box('console_tray','센터 콘솔 앞 수납 트레이','센터 콘솔','dark',[0,.43,-9.25],[1.30,.07,.8]);
 box('shifter_base','자동변속기 레버 베젤','센터 콘솔','silver',[0,.49,-10.05],[1.05,.12,1.1]);
 box('shifter_boot','변속 레버 부트','센터 콘솔','dark',[0,.68,-10.02],[.64,.30,.55]);
 add('shifter','자동변속 레버·노브','센터 콘솔','trim',m=>m.tube([[0,.66,-10.02],[0,1.25,-9.9]],.075).cyl([0,1.28,-9.9],.22,.40,0));
 add('selector_marks','변속 위치 P R N D 표시','센터 콘솔','ivory',m=>{for(let i=0;i<4;i++)m.box([-.38,.57,-9.65-i*.23],[.09,.022,.07]);});
 add('shift_cable','자동변속 셀렉터 케이블','센터 콘솔','dark',m=>m.tube([[0,.15,-10.05],[.4,-.5,-8],[.6,-.7,-5],[-3.2,-.4,-.9]],.045), '레버와 변속기 셀렉터의 연결 경로.',{system:'transmission'});
 add('handbrake','기계식 주차브레이크 레버','센터 콘솔','dark',m=>m.box([.95,.25,-12.15],[.22,.20,1.3]).tube([[.95,.4,-12.75],[.95,.75,-11.6]],.12));
 add('handbrake_cables','주차브레이크 이퀄라이저·케이블','브레이크','silver',m=>{m.box([.95,-1.2,-17],[.6,.12,.35]);for(const x of [-5.9,5.9])m.tube([[.95,-1.2,-17],[x,-1.45,-23],[x,-1.6,-26.3]],.035);},'',{system:'brakes'});
 // Seat upholstery, exposed frames, mechanisms and headrest posts.
 for(const s of [-1,1]){const x=s*3.8,tag=s===1?'driver':'passenger',name=s===1?'운전석':'조수석';
  add('seat_frame_'+tag,name+' 시트 하부 프레임','시트','dark',m=>m.box([x,-.65,-12],[3.05,.18,3.05]).tube([[x-1.4,-.5,-13.4],[x-1.4,3.25,-13.7],[x+1.4,3.25,-13.7],[x+1.4,-.5,-13.4]],.085));
  add('seat_springs_'+tag,name+' 좌판 서스펜션 스프링','시트','silver',m=>{for(let j=0;j<5;j++){const path=[];for(let i=0;i<=24;i++)path.push([x-1.1+i/24*2.2,-.49,-13.15+j*.55+.10*Math.sin(i*Math.PI/2)]);m.tube(path,.022,6);}});
  for(const e of [-1,1]){box('cushion_bolster_'+tag+e,name+' 좌판 측면 볼스터 '+e,'시트','soft',[x+e*1.38,.12,-12],[.48,.50,3.3]);box('back_bolster_'+tag+e,name+' 등받이 볼스터 '+e,'시트','soft',[x+e*1.35,1.95,-13.58],[.48,3.5,.68]);}
  add('seat_seams_'+tag,name+' 시트 스티치','시트','fabric',m=>{for(const e of [-1,1])m.tube([[x+e*1.02,.23,-10.4],[x+e*1.02,.23,-13.45],[x+e*1.02,3.6,-13.37]],.012,6);});
  add('headrest_posts_'+tag,name+' 헤드레스트 조절봉','시트','silver',m=>{for(const e of [-1,1])m.cyl([x+e*.5,3.87,-14],.045,.68);});
  add('recliner_'+tag,name+' 리클라이너 힌지','시트','dark',m=>m.cyl([x+s*1.68,.1,-13.35],.32,.13,0));
  box('seat_adjust_'+tag,name+' 시트 조절 레버','시트','trim',[x+s*1.73,-.25,-12.55],[.16,.15,.85]);
  add('seat_rail_handle_'+tag,name+' 시트 슬라이드 손잡이','시트','silver',m=>m.tube([[x-1.1,-.67,-10.5],[x-1.1,-.67,-10],[x+1.1,-.67,-10],[x+1.1,-.67,-10.5]],.04));
  box('side_airbag_'+tag,name+' 측면 에어백 모듈','안전장치','dark',[x+s*1.3,2.2,-13.63],[.28,1.2,.35]);
  for(const e of [-1,1])for(const z of [-10.45,-13.55])add('seat_bolt_'+tag+e+z,name+' 레일 고정 볼트 '+e+z,'시트','silver',m=>m.cyl([x+e*1.1,-.94,z],.10,.12,1,6));
 }
 // Front/rear doors, trim, seals, window mechanisms and speakers.
 for(const s of [-1,1]){const tag=s===1?'L':'R',side=s===1?'좌측':'우측',x=s*7.08;
  for(const [row,z] of [['front',-12],['rear',-21.1]]){
   if(row==='rear')box('rear_door_trim_'+tag,side+' 뒷문 내부 트림','도어','trim',[x,1.05,z],[.18,2.9,8.1]);
   add('door_handle_'+row+tag,side+' '+(row==='front'?'앞문':'뒷문')+' 실내 손잡이','도어','silver',m=>m.tube([[x-s*.23,1.92,z+1.4],[x-s*.30,1.98,z+.8],[x-s*.24,1.88,z+.45]],.055));
   box('door_pocket_'+row+tag,side+' 도어 하부 포켓 '+row,'도어','dark',[x-s*.16,-.05,z],[.33,.65,3.7]);
   add('speaker_'+row+tag,side+' 도어 스피커 '+row,'도어','dark',m=>m.cyl([x-s*.20,.35,z+2.45],.59,.12,0));
   add('speaker_grille_'+row+tag,side+' 스피커 그릴 '+row,'도어','soft',m=>{for(let i=-3;i<=3;i++)m.tube([[x-s*.28,.35+i*.12,z+2.45-Math.sqrt(.26-i*i*.0144)],[x-s*.28,.35+i*.12,z+2.45+Math.sqrt(.26-i*i*.0144)]],.015,6);});
   add('window_regulator_'+row+tag,side+' 윈도 레귤레이터 '+row,'도어 내부 기구','silver',m=>m.tube([[s*7.55,-.8,z-1.6],[s*7.55,2.2,z+1.6]],.065).tube([[s*7.55,-.8,z+1.6],[s*7.55,2.2,z-1.6]],.065).cyl([s*7.55,.2,z],.28,.22,0));
   box('door_latch_'+row+tag,side+' 도어 래치 '+row,'도어 내부 기구','silver',[s*7.58,1.3,z-3.7],[.24,.5,.35]);
   add('door_bowden_'+row+tag,side+' 도어 손잡이 케이블 '+row,'도어 내부 기구','dark',m=>m.tube([[s*7.4,1.9,z+.8],[s*7.4,1.55,z-1.2],[s*7.58,1.3,z-3.7]],.028,8));
   box('window_switch_'+row+tag,side+' 윈도 스위치 '+row,'도어','dark',[s*6.7,1.25,z+.3],[.24,.1,s===1&&row==='front'?1.1:.4]);
  }
  add('door_seals_'+tag,side+' 앞뒤 도어 웨더스트립','도어','dark',m=>{for(const z of [-11.4,-21.4])m.tube([[s*7.25,-.8,z-4.3],[s*7.25,3,z-4.3],[s*6.85,6.4,z-2.8],[s*6.85,6.4,z+2.5],[s*7.25,2.8,z+4.3],[s*7.25,-.8,z+4.3],[s*7.25,-.8,z-4.3]],.045);});
  box('sill_trim_'+tag,side+' 실내 사이드실 커버','바닥·필러','trim',[s*6.9,-.75,-16.4],[.48,.18,20]);
  add('A_trim_'+tag,side+' A필러 내장재','바닥·필러','ivory',m=>m.tube([[s*7.15,3.2,-5.65],[s*6.6,7.15,-10.7]],.20));
  box('B_trim_'+tag,side+' B필러 내장재','바닥·필러','soft',[s*6.94,3.3,-16.9],[.25,7.6,.52]);
  add('C_trim_'+tag,side+' C필러 내장재','바닥·필러','ivory',m=>m.tube([[s*7.1,3,-28],[s*6.6,7.1,-23.4]],.22));
  add('curtain_'+tag,side+' 커튼 에어백 수납 모듈','안전장치','ivory',m=>m.tube([[s*6.7,6.85,-11],[s*6.7,6.85,-23]],.11));
  add('belt_retractor_'+tag,side+' 앞좌석 벨트 리트랙터·상부 앵커','안전장치','silver',m=>m.box([s*6.8,-.5,-16.8],[.4,.65,.6]).ring([s*6.65,4.6,-16.65],.15,.04,0));
  add('belt_anchor_'+tag,side+' 안전벨트 하부 앵커','안전장치','silver',m=>m.cyl([s*5.5,.05,-13.8],.12,.12));
  for(const z of [-13.8,-21])add('grab_'+tag+z,side+' 천장 손잡이 '+z,'천장','ivory',m=>m.tube([[s*6.35,6.85,z-.5],[s*6.15,6.65,z-.5],[s*6.15,6.65,z+.5],[s*6.35,6.85,z+.5]],.065));
  box('visor_'+tag,side+' 선바이저','천장','ivory',[s*3.8,6.55,-10.7],[3.3,.17,1.25], '',{roofTrim:true});
  box('visor_mirror_'+tag,side+' 선바이저 거울','천장','glass',[s*3.8,6.43,-10.7],[1.3,.025,.7], '',{roofTrim:true});
  for(const z of [-8.7,-17])box('floor_mat_'+tag+z,side+' 바닥 매트 '+z,'바닥·필러','dark',[s*3.8,-1.03,z],[3.9,.07,3.1]);
  box('foot_duct_'+tag,side+' 후석 발밑 송풍 덕트','공조','dark',[s*1.3,-1.04,-16.8],[.55,.32,5.0], '',{system:'hvac'});
 }
 box('carpet','실내 바닥 카펫','바닥·필러','trim',[0,-1.22,-14.6],[13.4,.12,17.4]);
 box('headliner','루프 헤드라이너','천장','ivory',[0,7.25,-17.1],[12.9,.10,11.2], '',{roofTrim:true});
 box('map_lamp','앞좌석 맵램프·실내등','천장','ivory',[0,6.97,-12.1],[1.45,.23,.9], '',{roofTrim:true});
 box('dome_lamp','후석 실내등','천장','ivory',[0,7.02,-20.6],[1.05,.18,.65], '',{roofTrim:true});
 add('rear_mirror_stem','실내 백미러 지지대','천장','dark',m=>m.tube([[0,5.75,-9.1],[0,5.45,-9.8],[0,5.3,-10.3]],.08));
 box('rear_mirror','실내 백미러 하우징','천장','dark',[0,5.3,-10.3],[2.15,.62,.24]);
 box('rear_mirror_glass','실내 백미러 반사면','천장','glass',[0,5.3,-10.44],[1.95,.46,.025]);
 // Rear safety systems, hinges, seat structure, shelf and luggage equipment.
 for(const x of [-4,0,4]){
  add('rear_belt_'+x,'뒷좌석 3점식 안전벨트 '+x,'안전장치','belt',m=>{const r=ribbon([[x===0?.9:Math.sign(x)*6.1,4.25,-24.2],[x-1.05,.45,-21.7],[x+1.1,.4,-22.5]],.17);m.p.push(...r.p);m.i.push(...r.i);});
  box('rear_buckle_'+x,'뒷좌석 안전벨트 버클 '+x,'안전장치','red',[x-1.05,.45,-21.7],[.22,.25,.25]);
  add('rear_posts_'+x,'후석 헤드레스트 조절봉 '+x,'시트','silver',m=>{for(const e of [-1,1])m.cyl([x+e*.4,3.85,-23.3],.04,.65);},'',{rearFoldAttached:true});
 }
 for(const x of [-4,4]){
  add('isofix_'+x,'ISOFIX 하부 앵커 '+x,'안전장치','silver',m=>{for(const e of [-1,1])m.tube([[x+e*.8-.13,.22,-22.6],[x+e*.8-.13,.40,-22.45],[x+e*.8+.13,.40,-22.45],[x+e*.8+.13,.22,-22.6]],.035,8);});
  add('rear_hinge_'+x,'후석 폴딩 힌지 '+x,'시트','silver',m=>m.cyl([x,-.15,-23],.20,.35,0));
  box('top_tether_'+x,'후석 상부 테더 앵커 '+x,'안전장치','silver',[x,2.7,-25],[.35,.08,.35]);
 }
 add('rear_frame','뒷좌석 등받이 프레임','시트','dark',m=>m.tube([[-5.6,.1,-23.1],[-5.6,3.5,-23.35],[5.6,3.5,-23.35],[5.6,.1,-23.1]],.10), '',{rearFoldAttached:true});
 box('parcel_shelf','후석 패키지 트레이','적재공간','fabric',[0,2.6,-25.3],[12.1,.16,3.0]);
 add('rear_speakers','후석 트레이 스피커 그릴','적재공간','dark',m=>{for(const x of [-4.4,4.4])m.cyl([x,2.7,-25.4],.55,.06);});
 box('trunk_backliner','트렁크 후면 내장재','적재공간','trim',[0,.3,-35.8],[12.2,2.7,.16]);
 box('trunk_floor_extension','트렁크 뒤쪽 카펫','적재공간','fabric',[0,-1.1,-32.7],[12.0,.12,5.6]);
 add('spare_wheel','스페어 타이어·휠','적재공간','dark',m=>m.ring([0,-1.55,-31.8],2.1,.38).cyl([0,-1.55,-31.8],1.65,.20));
 add('spare_fixing','스페어 휠 중앙 고정구','적재공간','silver',m=>m.cyl([0,-1.35,-31.8],.13,.45).box([0,-1.1,-31.8],[.7,.12,.14]));
 box('tool_tray','잭·휠렌치 공구 수납함','적재공간','dark',[4.5,-.65,-32.5],[1.8,.4,2.5]);
 add('jack','비상용 가위잭','적재공간','silver',m=>m.tube([[4,-.4,-33],[4.5,.0,-32.5],[5,-.4,-33],[4.5,-.7,-33.5],[4,-.4,-33]],.065));
 add('wheel_wrench','휠 너트 렌치','적재공간','silver',m=>m.tube([[4,-.3,-31.6],[5,-.3,-31.6],[5,-.3,-32]],.045));
 box('trunk_light','트렁크 조명','적재공간','ivory',[-5.98,1,-29],[.10,.3,.55]);
 box('rear_vent','실내 압력 배출 벤트','적재공간','dark',[6.2,.2,-34],[.16,.8,1.4]);
 // Behind-dashboard services omitted from the former cabin model.
 box('cabin_filter','실내 공기 필터·커버','공조','ivory',[-3.3,1.35,-6.6],[1.7,.18,1.0], '',{system:'hvac'});
 add('blower_duct','블로워–공조 케이스 연결 덕트','공조','dark',m=>m.tube([[-3.3,.9,-6.1],[-2.1,.9,-6.1],[.4,.9,-6.3]],.26), '',{system:'hvac'});
 add('defrost_duct','앞유리 디프로스트 덕트','공조','dark',m=>m.tube([[1,1.7,-6.4],[0,2.7,-6.6],[-4.7,2.9,-6.5]],.16).tube([[0,2.7,-6.6],[4.7,2.9,-6.5]],.16), '',{system:'hvac'});
 box('defrost_grille','앞유리 성에 제거 송풍 그릴','대시보드','dark',[0,2.86,-6.6],[10.2,.06,.25]);
 add('dash_beam','크로스카 대시보드 지지빔','대시보드 내부','silver',m=>m.tube([[-6.8,1.8,-6.25],[6.8,1.8,-6.25]],.14), '',{system:'structure'});
 box('cabin_fuse','실내 퓨즈박스','전장','dark',[5.8,1.0,-6.85],[.7,.8,.35], '',{system:'electrical'});
 box('obd','OBD 진단 커넥터','전장','dark',[4.5,.65,-8.3],[.52,.18,.17], '',{system:'electrical'});
 add('dash_loom','대시보드 횡방향 와이어 하네스','전장','dark',m=>m.tube([[-6,1.4,-6.9],[-3.2,1.4,-6.9],[0,1.45,-7.0],[4.4,1.45,-6.9],[5.8,1,-6.85]],.07), '',{system:'electrical'});
 add('seat_wiring','시트·안전벨트 배선','전장','dark',m=>{for(const s of [-1,1])m.tube([[s*5.9,-1.05,-12],[s*3.8,-.75,-12],[s*2.1,.18,-13.1]],.03);}, '',{system:'electrical'});
 return parts;
}
