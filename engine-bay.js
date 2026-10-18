// R6: additive, educational engine-bay detail in the original R4 coordinate frame.
// Component types checked against Chevrolet's 2014 1.4L owner manual, pp.10-6/7.
// Shape, dimensions and hose routing are schematic; the original R4 is untouched.
export const BAY_REFERENCE='https://www.chevrolet.com/ownercenter/content/dam/gmownercenter/gmna/dynamic/manuals/2014/chevrolet/cruze/2014_chevrolet_cruze_owners.pdf';
export const HOOD_PIVOT=[0,3.25,-4.8];
export function hoodPoint(p,open=true){const a=open?-65*Math.PI/180:0,c=Math.cos(a),s=Math.sin(a),y=p[1]-HOOD_PIVOT[1],z=p[2]-HOOD_PIVOT[2];return [p[0],HOOD_PIVOT[1]+c*y-s*z,HOOD_PIVOT[2]+s*y+c*z]}
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l)};
export class Mesh{
 constructor(){this.p=[];this.i=[]}
 box(c,s){const [x,y,z]=s.map(v=>v/2),v=[[-x,-y,-z],[x,-y,-z],[x,y,-z],[-x,y,-z],[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]];for(const f of [[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[0,1,5,4],[3,7,6,2]]){const n=this.p.length/3;for(const k of f)this.p.push(...v[k].map((a,j)=>a+c[j]));this.i.push(n,n+1,n+2,n,n+2,n+3)}return this}
 tube(path,r,n=12,caps=true){const start=this.p.length/3;for(let k=0;k<path.length;k++){const t=norm(sub(path[Math.min(k+1,path.length-1)],path[Math.max(k-1,0)])),u=norm(cross(t,Math.abs(t[1])<.9?[0,1,0]:[1,0,0])),v=cross(t,u);for(let j=0;j<n;j++){const a=j/n*Math.PI*2;this.p.push(...path[k].map((x,i)=>x+r*(u[i]*Math.cos(a)+v[i]*Math.sin(a))))}}for(let k=0;k<path.length-1;k++)for(let j=0;j<n;j++){const a=start+k*n+j,b=start+k*n+(j+1)%n;this.i.push(a,b,b+n,a,b+n,a+n)}if(caps){for(const k of [0,path.length-1]){const c=this.p.length/3;this.p.push(...path[k]);for(let j=0;j<n;j++){const a=start+k*n+j,b=start+k*n+(j+1)%n;this.i.push(c,...(k?[a,b]:[b,a]))}}}return this}
 cyl(c,r,h,axis=1,n=20){const a=c.slice(),b=c.slice();a[axis]-=h/2;b[axis]+=h/2;return this.tube([a,b],r,n)}
 ring(c,r,t,axis=1){const path=[];for(let i=0;i<=32;i++){const a=i/32*Math.PI*2,p=c.slice();p[(axis+1)%3]+=r*Math.cos(a);p[(axis+2)%3]+=r*Math.sin(a);path.push(p)}return this.tube(path,t,8,false)}
 finish(){const p=Float32Array.from(this.p),n=new Float32Array(p.length);for(let i=0;i<this.i.length;i+=3){const a=this.i[i]*3,b=this.i[i+1]*3,c=this.i[i+2]*3,u=[0,1,2].map(j=>p[b+j]-p[a+j]),v=[0,1,2].map(j=>p[c+j]-p[a+j]),w=cross(u,v);for(const k of [a,b,c])for(let j=0;j<3;j++)n[k+j]+=w[j]}for(let i=0;i<n.length;i+=3){const l=Math.hypot(n[i],n[i+1],n[i+2])||1;for(let j=0;j<3;j++)n[i+j]/=l}const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(let i=0;i<p.length;i++) {const j=i%3;lo[j]=Math.min(lo[j],p[i]);hi[j]=Math.max(hi[j],p[i])}return {positions:p,normals:n,indices:Uint32Array.from(this.i),bounds:[lo,hi]}}
}
export function buildEngineBay(){const parts=[],C={steel:'#768a99',paint:'#576c7a',black:'#242d34',rubber:'#333d43',silver:'#b5c1c4',white:'#dfded0',blue:'#469dc9',yellow:'#e5bc4e',red:'#b84c45'};
 function add(id,name,sys,color,build,description,meta={}){const m=new Mesh();build(m);parts.push({id:'bay_'+id,name,system:sys,category:'엔진룸 · '+name,color:C[color]||color,opacity:1,ghost:false,explode:sys==='structure'?[0,-2,0]:[0,2,0],anim:{kind:'world'},meta:{source:'r6-engine-bay',engineBay:true,...meta},description:description+' 교육용 형상이며 국내 사양의 치수·정확한 장착 위치는 미검증입니다.',...m.finish()})}
 function box(id,name,sys,color,c,s,desc,meta){add(id,name,sys,color,m=>m.box(c,s),desc,meta)}
 function hose(id,name,sys,path,r=.08,desc='장치 사이의 연결 경로를 나타냅니다.'){add(id,name,sys,'rubber',m=>m.tube(path,r),desc)}
 function cap(id,name,sys,c,r,color,desc){add(id,name,sys,color,m=>{m.cyl(c,r,.13);for(let j=0;j<8;j++){const a=j*Math.PI/4;m.box([c[0]+r*.84*Math.cos(a),c[1]+.035,c[2]+r*.84*Math.sin(a)],[.07,.12,.07])}},desc)}
 // Engine compartment enclosure: leave the bottom open for existing R4 running gear.
 box('firewall','엔진룸 격벽','structure','paint',[0,1.1,-4.65],[14.2,3.9,.18],'엔진룸과 승객실 사이를 구분하는 격벽입니다.');
 box('firewall_insulation','격벽 방열·흡음 패드','structure','black',[0,1.1,-4.51],[9.9,2.65,.11],'열과 소음 전달을 줄이는 격벽 안쪽 패드입니다.');
 box('cowl','와이퍼 카울 커버','structure','black',[0,3.12,-4.36],[14.5,.20,.83],'앞유리 아래 와이퍼 공간과 배수부를 덮습니다.');
 add('cowl_grille','카울 흡기 그릴','hvac','rubber',m=>{for(let x=-6.5;x<=6.5;x+=.24)m.box([x,3.24,-4.38],[.10,.045,.58])},'외기 유입부의 그릴을 단순화했습니다.');
 hose('cowl_seal','카울 후단 고무 실링','structure',[[-7,3.3,-4.7],[0,3.3,-4.7],[7,3.3,-4.7]],.085,'후단 틈새를 막는 고무 실링입니다.');
 for(const side of [-1,1]){const tag=side<0?'L':'R',x=side*6.65;
  box('apron_'+tag,'엔진룸 사이드 에이프런 '+tag,'structure','paint',[x,.9,.6],[.20,3.4,9.5],'엔진룸 측면의 차체 패널입니다.');
  box('fender_rail_'+tag,'펜더 상부 장착 레일 '+tag,'structure','steel',[side*7.05,2.82,.55],[.66,.18,10.5],'펜더와 주변 부품이 체결되는 상부 레일입니다.');
  add('tower_'+tag,'스트럿 타워 패널 '+tag,'structure','paint',m=>m.cyl([side*5.9,2.61,-.5],1.01,.5).ring([side*5.9,2.91,-.5],.83,.085),'기존 스트럿 상부 마운트 주변의 차체 보강부입니다.');
  add('tower_nuts_'+tag,'스트럿 타워 체결 너트 '+tag,'suspension','silver',m=>{for(let i=0;i<3;i++){const a=i*Math.PI*2/3;m.cyl([side*5.9+.65*Math.cos(a),3.21,-.5+.65*Math.sin(a)],.075,.12,1,6)}},'스트럿 마운트의 상부 체결부입니다.');
  add('rail_fasteners_'+tag,'펜더 레일 체결부 '+tag,'structure','silver',m=>{for(const z of [-3.8,-1.7,1.5,3.7,5.4])m.cyl([side*7.05,2.95,z],.08,.07,1,6)},'상부 패널 체결 볼트입니다.');
  box('headlamp_back_'+tag,'헤드램프 후면 하우징 '+tag,'electrical','black',[side*5.55,1.62,5.88],[2.8,1.35,1.4],'램프 뒤쪽의 밀폐 하우징을 나타냅니다.');
  add('headlamp_caps_'+tag,'헤드램프 정비 캡 '+tag,'electrical','rubber',m=>{for(const dx of [-.65,.65])m.cyl([side*5.55+dx,1.65,5.13],.36,.10,2)},'전구 접근부의 후면 방진 캡입니다.');
  box('hinge_base_'+tag,'본네트 힌지 고정부 '+tag,'structure','steel',[side*5.9,3,-4.2],[.4,.35,.85],'본네트 후단의 차체 측 힌지입니다.');
  box('hinge_arm_'+tag,'본네트 힌지 가동 암 '+tag,'structure','silver',[side*5.9,3.1,-3.88],[.18,.18,1.05],'본네트와 함께 회전하는 개념 힌지입니다.',{hoodAttached:true});
 }
 box('upper_support','라디에이터 상부 서포트','structure','paint',[0,2.5,4.88],[13.5,.28,.70],'냉각 모듈과 본네트 잠금부를 지지하는 전방 상부 멤버입니다.');
 box('lower_support','라디에이터 하부 서포트','structure','steel',[0,-1.02,4.02],[12.1,.25,.50],'냉각 모듈 아래쪽의 지지 멤버입니다.');
 add('radiator_brackets','냉각 모듈 상부 브래킷','cooling','black',m=>{for(const x of [-1.85,1.85])m.box([x,1.18,3.5],[.45,.20,.65]).tube([[x,1.18,3.7],[x,2.4,4.8]],.075)},'기존 R4 라디에이터를 상부 지지대에 연결합니다.');
 box('latch','본네트 잠금 래치','structure','silver',[0,2.72,4.84],[.70,.28,.42],'본네트가 닫혔을 때 스트라이커를 붙잡는 잠금부입니다.');
 add('latch_loop','본네트 스트라이커','structure','silver',m=>m.tube([[-.22,2.82,4.84],[-.22,2.53,4.84],[.22,2.53,4.84],[.22,2.82,4.84]],.055),'본네트 하부의 잠금 고리입니다.',{hoodAttached:true});
 hose('latch_cable','본네트 릴리스 케이블','structure',[[0,2.52,4.8],[-4.8,2.52,4.8],[-6.4,2.5,2],[-6.4,2.45,-4.4]],.035,'실내 레버와 전방 잠금부를 잇는 개념 케이블입니다.');
 add('hood_frame','본네트 안쪽 보강 프레임','structure','steel',m=>{for(const x of [-6.4,0,6.4])m.box([x,2.92,.8],[.16,.12,9.7]);for(const z of [-3.8,.8,5.45])m.box([0,2.92,z],[12.8,.12,.18])},'본네트 안쪽의 개념 보강 골격입니다.',{hoodAttached:true});
 box('hood_pad','본네트 안쪽 흡음 패드','structure','black',[0,2.88,.5],[11.9,.06,7.2],'안쪽 면에 붙은 방열·흡음 패드입니다.',{hoodAttached:true});
 add('hood_prop','본네트 지지봉','structure','silver',m=>m.tube([[5.8,2.65,4.65],hoodPoint([5.8,2.88,1.8])],.055),'열린 본네트를 받치는 개념 지지봉입니다.',{hoodProp:true});
 // Existing R4 radiator/condenser/fan cores remain single assemblies.
 add('fan_shroud','냉각팬 슈라우드','cooling','black',m=>m.ring([0,.1,3.18],.91,.09,2).box([-1.48,.1,3.13],[1.1,1.65,.12]).box([1.48,.1,3.13],[1.1,1.65,.12]).box([0,.98,3.13],[2,.14,.12]).box([0,-.78,3.13],[2,.14,.12]),'팬 바깥의 공기를 냉각 코어 쪽으로 유도하는 덕트입니다.');
 box('fan_controller','냉각팬 제어 모듈','electrical','silver',[1.5,.5,2.99],[.52,.52,.18],'전동 냉각팬의 구동을 제어하는 모듈입니다.');
 for(const side of [-1,1])box('airguide_'+side,'전방 냉각 공기 가이드 '+side,'cooling','black',[side*3.27,.15,3.62],[2.0,2.1,.18],'코어 양옆의 빈 공간을 막아 냉각 모듈로 공기를 안내합니다.');
 add('radiator_tanks','라디에이터 엔드탱크','cooling','black',m=>{for(const x of [-2.22,2.22])m.box([x,.1,3.32],[.18,1.9,.40])},'냉각 코어 좌우의 냉각수 분배 탱크입니다.');
 add('condenser_mounts','콘덴서 장착 탭','hvac','silver',m=>{for(const x of [-2,2])for(const y of [-.65,.85])m.box([x,y,3.9],[.3,.15,.12])},'기존 에어컨 콘덴서의 지지 탭입니다.');
 add('horns','전방 경음기','electrical','black',m=>{for(const x of [-3.25,3.25])m.cyl([x,.5,5.15],.30,.18,2)},'범퍼 뒤쪽의 경음기를 개념 배치했습니다.');
 // Routine service points and recognizable top-side detail.
 cap('oil_cap','엔진오일 주입구 마개','lubrication',[-1.55,2.76,.52],.24,'black','밸브 커버의 엔진오일 주입구입니다.');
 add('dipstick_handle','오일 딥스틱 손잡이','lubrication','yellow',m=>m.ring([2.24,1.11,1.46],.17,.055,2),'기존 딥스틱 상단의 눈에 띄는 고리 손잡이입니다.');
 cap('coolant_cap','냉각수 보조탱크 압력 마개','cooling',[2.88,2.05,2.20],.22,'black','기존 냉각수 보조탱크 상부의 압력 마개입니다.');
 box('coolant_level','냉각수 탱크 수위 표시부','cooling','white',[3.29,1.55,2.2],[.035,.15,.40],'기존 탱크 측면 수위 확인부를 표시했습니다.');
 cap('brake_cap','브레이크액 리저버 마개','brakes',[-4.5,2.49,-3.25],.18,'black','기존 마스터 실린더 리저버의 상부 마개입니다.');
 box('washer_tank','워셔액 저장탱크','body','white',[-5.5,-.1,4.45],[1.30,1.85,1.0],'전방 측면에 배치한 워셔액 탱크의 개념 형상입니다.');
 add('washer_neck','워셔액 주입 목','body','white',m=>m.tube([[-5.5,.7,4.45],[-5.65,1.6,4.38],[-5.5,2.55,4.14]],.17),'하부 저장탱크에서 상부 주입구로 이어집니다.');
 cap('washer_cap','워셔액 주입구 캡','body',[-5.5,2.59,4.14],.26,'blue','워셔액 주입부를 구분하는 파란색 캡입니다.');
 hose('washer_hose','워셔액 공급 튜브','body',[[-5.7,-.2,4.6],[-6.2,.5,3.5],[-6.3,2.7,-3.9],[0,2.7,-4.3]],.035,'워셔펌프에서 카울 방향으로 이어지는 개념 튜브입니다.');
 box('battery_tray','배터리 트레이','electrical','black',[2.75,.61,-1.74],[1.45,.16,1.18],'기존 배터리 아래의 지지 트레이입니다.');
 box('battery_clamp','배터리 고정 클램프','electrical','silver',[2.75,1.70,-1.74],[.13,.10,1.06],'배터리의 이동을 막는 상부 고정 바입니다.');
 add('battery_positive','배터리 양극 단자·보호캡','electrical','red',m=>m.cyl([2.39,1.73,-1.52],.10,.12).box([2.39,1.84,-1.52],[.34,.16,.30]),'기존 배터리의 양극 연결부입니다.');
 add('battery_negative','배터리 음극 단자','electrical','silver',m=>m.cyl([3.1,1.73,-1.97],.10,.15),'기존 배터리의 음극 연결부입니다.');
 hose('positive_cable','배터리 양극 전원선','electrical',[[2.39,1.73,-1.52],[3.6,1.8,-1.2],[4.5,1.65,-1.25]],.075);
 hose('ground_cable','배터리 접지선','electrical',[[3.1,1.73,-1.97],[3.6,1.4,-2.4],[5.9,1.25,-2.8]],.06);
 add('ground_stud','차체 접지 스터드','electrical','silver',m=>m.cyl([5.9,1.28,-2.8],.10,.15,1,6),'차체 접지 연결점을 나타냅니다.');
 add('fuse_lid','퓨즈박스 커버 보강 리브','electrical','black',m=>{for(let x=4.65;x<5.9;x+=.18)m.box([x,1.735,-1.4],[.055,.07,1.55])},'기존 퓨즈박스 커버의 보강 리브입니다.');
 add('fuse_clips','퓨즈박스 잠금 클립','electrical','rubber',m=>{for(const z of [-2.22,-.58])m.box([5.2,1.49,z],[.25,.35,.14])},'덮개의 잠금 클립입니다.');
 add('ecu_connectors','ECU 커넥터','electrical','black',m=>{for(const x of [4.0,4.6])m.box([x,1.53,-2.37],[.40,.25,.30])},'기존 엔진 제어기의 하네스 커넥터입니다.');
 hose('ecu_loom','ECU 연결 하네스','electrical',[[4.3,1.5,-2.3],[4.3,1.2,-1.7],[3.8,1.3,-.6],[1.9,2.2,.3]],.10);
 add('airbox_lid','에어클리너 덮개 리브','intake','black',m=>{for(let z=-1.2;z<.8;z+=.22)m.box([-2.8,1.44,z],[.9,.08,.055])},'기존 에어클리너 상단 덮개의 리브입니다.');
 add('airbox_clips','에어클리너 잠금 클립','intake','silver',m=>{for(const z of [-.9,.5])m.box([-3.46,1.18,z],[.12,.22,.18])},'필터 하우징을 잠그는 클립입니다.');
 add('intake_snorkel','전방 흡기 스노클','intake','black',m=>m.tube([[-2.8,1.1,1.5],[-3.8,1.35,2.4],[-3.8,2.0,4.4]],.28,16).box([-3.8,2.1,4.75],[1.45,.40,.6]),'전방에서 에어클리너로 공기를 안내하는 개념 흡입 덕트입니다.');
 hose('turbo_inlet','에어클리너·터보 흡입 연결관','intake',[[-3.0,1.1,-1.4],[-3.2,1.0,-2.1],[-2.3,.8,-2.65],[-1.1,.65,-2.7]],.19);
 add('inlet_clamps','흡기 연결관 밴드 클램프','intake','silver',m=>m.ring([-3.05,1.1,-1.5],.21,.035,2).ring([-1.18,.65,-2.7],.21,.035,0),'고무 흡기관 양단의 체결 밴드입니다.');
 box('map_sensor','흡기 압력 센서 커넥터','electrical','black',[1.62,1.66,1.12],[.24,.22,.28],'흡기 상태를 감지하는 센서의 개념 커넥터입니다.');
 hose('pcv_hose','크랭크케이스 환기 호스','intake',[[1.7,2.52,-.65],[2.1,2.65,-1.3],[.8,2.1,-2.4],[-1.1,1.2,-2.4]],.075,'밸브 커버에서 흡기 측으로 이어지는 개념 환기 경로입니다.');
 box('purge_valve','증발가스 퍼지 밸브','fuel','black',[-2.1,1.85,1.8],[.42,.32,.26],'연료 증발가스를 흡기 쪽으로 공급하는 개념 밸브입니다.');
 hose('purge_hose','퍼지 밸브 연결 호스','fuel',[[-2.3,1.85,1.8],[-2.7,1.8,.8],[-3.6,1.6,-3.9]],.055);
 add('ac_service_ports','에어컨 냉매 서비스 포트','hvac','silver',m=>m.cyl([3.9,1.28,2.8],.10,.22).cyl([4,1.3,-2.1],.10,.22),'냉매 배관의 점검 포트를 개념 표시했습니다.');
 hose('ac_return','에어컨 저압 귀환 배관','hvac',[[4,1.1,-4.4],[4.5,.9,-3.0],[4.1,.6,.4],[3.2,-1.2,1.1]],.09);
 box('abs_connector','ABS 전기 커넥터','electrical','black',[5.48,.40,-3.0],[.20,.45,.65],'기존 ABS 유압 모듈의 전기 연결부입니다.');
 add('abs_pipes','ABS 상부 유압 파이프','brakes','silver',m=>{for(let i=0;i<4;i++)m.tube([[4.35+i*.24,.8,-3],[4.35+i*.24,1.12,-3.4],[4.35+i*.24,1.12,-4.3]],.025,8)},'기존 ABS 모듈에서 나오는 개념 브레이크 배관입니다.');
 hose('booster_vacuum','브레이크 부스터 진공 호스','brakes',[[-4.3,1.8,-3.9],[-3.4,2.2,-3.6],[-2,1.6,-.7],[-1.8,1.4,1.2]],.07);
 add('engine_harness_clips','엔진 상부 하네스 고정 클립','electrical','black',m=>{for(const x of [-1.5,-.5,.5,1.5])m.box([x,2.92,.35],[.16,.17,.20])},'점화 모듈 주변 배선의 고정 클립입니다.');
 hose('coil_loom','점화 모듈 전원 하네스','electrical',[[2,2.85,.3],[2.3,2.75,.9],[3.8,2.0,1.0],[4.8,1.7,-.6]],.065);
 box('heatshield','터보 상부 방열판','intake','silver',[-.7,1.43,-2.05],[2.05,.12,1.13],'기존 터보·배기 매니폴드 위쪽의 개념 방열판입니다.');
 return parts;
}

