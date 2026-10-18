import {Mesh} from './engine-bay.js';
export function buildRecoveryDetails(){
 const parts=[];
 function add(id,name,system,color,build,meta={}){const m=new Mesh();build(m);parts.push({id:'plus_'+id,name,system,color,category:system==='interior'?'실내 · 적재공간':'엔진룸 전면',description:name+'. R6 기반 추가 교육용 형상입니다. 실차 치수와 배관 경로는 검증하지 않았습니다.',opacity:1,ghost:false,explode:[0,1,0],anim:{kind:'world'},meta:{source:'r6-plus',engineBay:system!=='interior',...meta},...m.finish()});}
 const box=(id,n,s,c,p,d,meta)=>add(id,n,s,c,m=>m.box(p,d),meta);
 // Front-facing cooling stack, behind the lock carrier; preserve R6's core.
 for(const x of [-4.8,4.8]){
  box('airguide_'+x,'전면 냉각 공기 가이드 '+x,'cooling','#26343d',[x,.55,4.18],[.14,2.65,1.1]);
  add('core_mount_'+x,'라디에이터 탄성 마운트 '+x,'cooling','#323a40',m=>m.cyl([x,-.75,4.18],.24,.28).box([x,-.91,4.18],[.6,.12,.55]));
 }
 box('condenser_header','콘덴서 상부 헤더','hvac','#9badb6',[0,1.7,4.18],[9.8,.17,.18]);
 for(let i=0;i<25;i++)box('condenser_tube_'+i,'콘덴서 평관 '+(i+1),'hvac','#637985',[0,-.65+i*.09,4.2],[9.6,.033,.10]);
 add('condenser_fins','콘덴서 전면 핀','hvac','#93a5ac',m=>{for(let i=0;i<64;i++)m.box([-4.7+i*.15,.45,4.24],[.013,2.3,.045]);});
 add('condenser_lines','콘덴서 냉매 배관','hvac','#b5c4cb',m=>m.tube([[4.9,1.5,4.18],[5.4,1.5,3.9],[5.4,.4,2.4],[4.2,.2,1.4]],.065).tube([[4.9,-.6,4.18],[5.7,-.6,4.0],[5.7,.9,1.3],[4.5,1.1,-3.5]],.045));
 add('lock_safety','본네트 2차 안전 걸쇠','structure','#bac7cc',m=>m.box([.33,2.89,5.05],[.12,.45,.22]).box([.6,3.06,5.05],[.55,.10,.22]));
 add('lock_spring','본네트 래치 복귀 스프링','structure','#c4cfd1',m=>{const path=[];for(let i=0;i<=96;i++){const a=i/96*Math.PI*12;path.push([-.55+i/96*.75,2.79+.07*Math.cos(a),5.13+.07*Math.sin(a)]);}m.tube(path,.018,6);});
 add('carrier_fixings','전면 캐리어 볼트와 와셔','structure','#becbd1',m=>{for(const x of [-6,-4.2,-2.5,2.5,4.2,6])m.cyl([x,2.69,4.88],.13,.045).cyl([x,2.74,4.88],.085,.07,1,6);});
 add('front_harness','전면 조명 배선 하니스','electrical','#222d36',m=>m.tube([[-5.8,2.3,5.1],[-4,2.3,4.6],[0,2.3,4.55],[4,2.3,4.6],[5.8,2.3,5.1]],.055));
 for(const x of [-5.6,5.6]){
  box('lampplug_'+x,'헤드램프 전기 커넥터 '+x,'electrical','#596b75',[x,1.8,5.1],[.35,.24,.28]);
  add('lampwire_'+x,'헤드램프 분기 배선 '+x,'electrical','#303b43',m=>m.tube([[x,1.8,5.1],[x,2.2,4.8],[x*.85,2.3,4.6]],.035));
 }
 add('washer_front','전면 워셔액 공급 호스','electrical','#353f48',m=>m.tube([[-5.7,-.2,3.6],[-6.2,.8,3.5],[-6.4,2.6,2],[-6.4,2.7,-3.5]],.035));
 box('carrier_warning','냉각팬 주의 라벨','structure','#d6b95b',[2.7,2.66,4.9],[1.05,.018,.33]);
 // Cabin detail uses original R4 coordinates (+Z toward the front).
 for(const x of [-5.65,-1.9,1.9,5.65])add('vent_'+x,'대시보드 송풍구 '+x,'interior','#303c48',m=>{m.box([x,2.3,-8.43],[.8,.55,.12]);for(let i=0;i<5;i++)m.box([x,2.1+i*.09,-8.51],[.72,.025,.06]);});
 add('climate','공조 조작 다이얼','interior','#9babb6',m=>{for(const x of [-.48,0,.48])m.cyl([x,1.45,-8.47],.13,.12,2);});
 box('glovebox','글로브박스 도어','interior','#444c54',[4.1,1.8,-8.46],[3.8,.72,.10]);
 box('glovehandle','글로브박스 손잡이','interior','#83929c',[4.1,2,-8.54],[.65,.11,.12]);
 add('cupholders','센터콘솔 컵홀더','interior','#242c34',m=>m.ring([0,.42,-11.35],.31,.075).ring([0,.42,-12.2],.31,.075));
 box('armrest','앞좌석 센터 암레스트','interior','#424b53',[0,.7,-13],[1.4,.5,1.35]);
 for(const side of [-1,1]){
  const x=side*6.4;
  add('belt_front_'+side,'앞좌석 3점식 안전벨트 '+side,'interior','#303740',m=>m.tube([[x,3.9,-14.6],[side*2.25,.1,-13.1],[side*5.5,-.1,-13.8]],.065));
  box('buckle_'+side,'앞좌석 안전벨트 버클 '+side,'interior','#ae5147',[side*2.1,.18,-13.1],[.22,.32,.30]);
  box('door_trim_'+side,'실내 도어 트림 '+side,'interior','#424d58',[side*6.85,1.1,-12],[.15,2.5,6.1]);
  box('door_arm_'+side,'도어 팔걸이 '+side,'interior','#65727c',[side*6.65,1.1,-12],[.4,.22,2.6]);
  box('trunk_liner_'+side,'트렁크 측면 내장 '+side,'interior','#39454d',[side*6.1,.3,-27.4],[.18,2.3,5.6]);
 }
 box('trunk_floor','트렁크 카펫 바닥','interior','#48535b',[0,-.74,-27.1],[11.8,.12,5.8]);
 box('trunk_sill','트렁크 적재 문턱','interior','#596975',[0,-.42,-30],[11.8,.35,.45]);
 return parts;
}
export const REAR_PIVOT=[0,-.15,-23];
export function rearFoldPoint(p,amount){const a=Math.PI*.46*amount,c=Math.cos(a),s=Math.sin(a),y=p[1]-REAR_PIVOT[1],z=p[2]-REAR_PIVOT[2];return [p[0],REAR_PIVOT[1]+c*y-s*z,REAR_PIVOT[2]+s*y+c*z];}

