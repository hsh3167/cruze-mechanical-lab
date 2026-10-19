import {Mesh} from './engine-bay.js';
export const SCALE={wheelbaseMM:2685,mmPerUnit:2685/27,frontTrackMM:1545,rearTrackMM:1560,tire:'205/60R16',tireWidthMM:205,tireDiameterMM:652.4,rimDiameterMM:406.4,reference:'https://www.chevrolet.co.kr/content/dam/chevrolet/as/kr/ko/index/owner-manuals/02-pdfs/cruze/12-technical-data.pdf'};
const U=SCALE.mmPerUnit, W=205/U, R=652.4/U/2, RR=406.4/U/2;
const center=p=>p.bounds[0].map((v,i)=>(v+p.bounds[1][i])/2);
function revolve(m,c,profile,segments=96){const start=m.p.length/3;
 for(const [x,r] of profile)for(let j=0;j<segments;j++){const a=j/segments*2*Math.PI;m.p.push(c[0]+x,c[1]+r*Math.cos(a),c[2]+r*Math.sin(a));}
 for(let k=0;k<profile.length-1;k++)for(let j=0;j<segments;j++){const a=start+k*segments+j,b=start+k*segments+(j+1)%segments;m.i.push(a,b,b+segments,a,b+segments,a+segments);}return m;
}
function spoke(m,c,sign,a,r0,r1,w0,w1,x0,x1){
 const n=m.p.length/3;for(const x of [x0,x1])for(const [r,w] of [[r0,-w0],[r1,-w1],[r1,w1],[r0,w0]])m.p.push(c[0]+sign*x,c[1]+r*Math.cos(a)-w*Math.sin(a),c[2]+r*Math.sin(a)+w*Math.cos(a));
 for(const f of [[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]])m.i.push(n+f[0],n+f[1],n+f[2],n+f[0],n+f[2],n+f[3]);return m;
}
export function upgradeChassisR8(parts){
 const out=[],byId=new Map(parts.map(p=>[p.id,p]));
 function add(id,name,system,color,fn,verified=false){const m=new Mesh();fn(m);out.push({id,name,system,category:'R8 · '+name,color,opacity:1,ghost:false,explode:[0,system==='wheels'?0:-1,0],anim:{kind:'world'},meta:{source:'r8-chassis',dimensionBasis:verified?'published vehicle/tire specification':'illustrative detail; OEM dimensions unverified'},description:name+'。'+(verified?'축거 2685mm 기준 축척, 205/60R16 규격과 전후 윤거를 적용했습니다.':'형상·세부 치수는 구조 설명용 추정입니다. 순정 부품 실측·간섭·강도는 미검증입니다.'),...m.finish()});}
 const replacement=new Set(parts.filter(p=>p.system==='wheels').map(p=>p.id));
 for(const tag of ['FL','FR','RL','RR']){
  const sign=tag.endsWith('L')?-1:1,front=tag.startsWith('F'),z=front?0:-27,x=sign*(front?1545:1560)/U/2,c=[x,-2.1,z],label=(front?'전륜 ':'후륜 ')+(sign>0?'좌측':'우측');
  add('tire_'+tag,label+' 타이어 · 205/60R16','wheels','#242b33',m=>revolve(m,c,[[-W*.39,RR],[-W*.46,RR*1.08],[-W*.50,R*.80],[-W*.48,R*.91],[-W*.40,R*.98],[-W*.31,R],[W*.31,R],[W*.40,R*.98],[W*.48,R*.91],[W*.50,R*.80],[W*.46,RR*1.08],[W*.39,RR]]),true);
  add('rim_barrel_'+tag,label+' 16인치 휠 림 · 입체 단면','wheels','#8394a1',m=>revolve(m,c,[[-.84,RR*.98],[-.82,RR*1.035],[-.72,RR*1.04],[-.65,RR*.92],[-.25,RR*.88],[.25,RR*.88],[.65,RR*.92],[.72,RR*1.04],[.82,RR*1.035],[.84,RR*.98]]));
  add('rim_lip_'+tag,label+' 휠 외측 가공 립','wheels','#c1ccd3',m=>m.ring([x+sign*.81,-2.1,z],RR*1.025,.035,0));
  add('hub_'+tag,label+' 휠 허브·센터 캡','wheels','#9cabb6',m=>m.cyl([x+sign*.68,-2.1,z],.49,.24,0,48).cyl([x+sign*.82,-2.1,z],.27,.06,0,40));
  add('r8_spokes_'+tag,label+' 입체 5쌍 스포크','wheels','#b3bfc7',m=>{for(let j=0;j<5;j++)for(const offset of [-.095,.095])spoke(m,c,sign,j/5*Math.PI*2+offset,.40,RR*.97,.075,.11,.55,.76);});
  add('r8_lugs_'+tag,label+' 휠 너트 5개','wheels','#d3d8d9',m=>{for(let j=0;j<5;j++){const a=j/5*Math.PI*2;m.cyl([x+sign*.83,-2.1+.37*Math.cos(a),z+.37*Math.sin(a)],.065,.10,0,6);}});
  add('r8_valve_'+tag,label+' 타이어 밸브','wheels','#424b50',m=>m.tube([[x+sign*.80,-2.1+RR*.90,z],[x+sign*.94,-2.1+RR*.92,z]],.035,12));
  add('r8_tread_'+tag,label+' 트레드·사이드월 패턴','wheels','#101820',m=>{
   for(const dx of [-.24,0,.24])revolve(m,c,[[dx-.018,R+.003],[dx+.018,R+.003]],128);
   for(let j=0;j<64;j++){const a=j/64*Math.PI*2;for(const side of [-1,1]){const path=[];for(let k=0;k<3;k++){const dx=side*(.29+k*.08),t=a+side*k*.012,rad=R*(k===2?.987:.999);path.push([x+dx,-2.1+rad*Math.cos(t),z+rad*Math.sin(t)]);}m.tube(path,.012,6);}}
   for(const s of [-1,1])for(const r of [R*.82,R*.89])m.ring([x+s*W*.486,-2.1,z],r,.012,0);
  });
  // Reposition the existing brake/hub/knuckle joint stack to the new wheel track.
  const shift=x-sign*7.8;
  for(const p of parts.filter(p=>new RegExp('_(?:'+tag+')(?:_|$)').test(p.id)&&p.system!=='wheels'&&!/^(?:damper_|spring_|strut_|arm_|trailingarm_|rearshock_|wheelarch_)/.test(p.id))){
   const positions=p.positions.slice();for(let k=0;k<positions.length;k+=3)positions[k]+=shift;
   byId.set(p.id,{...p,positions,bounds:p.bounds.map(b=>[b[0]+shift,b[1],b[2]])});
  }
  if(front){
   for(const id of ['spring_'+tag,'damper_body_'+tag,'damper_rod_'+tag])replacement.add(id);
   const low=[sign*6.7,-1.4,-.05],mid=[sign*6.22,1.5,-.33],top=[sign*5.9,3.05,-.5];
   add('damper_body_'+tag,label+' 스트럿 하우징','suspension','#414e59',m=>m.tube([low,mid],.255,40));
   add('damper_rod_'+tag,label+' 크롬 피스톤 로드','suspension','#c4d2da',m=>m.tube([mid,top],.10,32));
   add('spring_'+tag,label+' 코일 스프링 · 끝단 밀착 형상','suspension','#d3aa54',m=>{const path=[];for(let j=0;j<=240;j++){const t=j/240,a=t*2*Math.PI*6.5,ct=[sign*(6.37-.42*t),.12+2.48*(.14*t+.86*(.5-.5*Math.cos(Math.PI*t))),-.2-.27*t];path.push([ct[0]+.56*Math.cos(a),ct[1],ct[2]+.56*Math.sin(a)]);}m.tube(path,.075,12);});
   add('r8_spring_seats_'+tag,label+' 상하 스프링 시트','suspension','#61717d',m=>{for(const [xx,y,zz] of [[6.37,.06,-.2],[5.95,2.68,-.47]])revolveY(m,[sign*xx,y,zz],[[0,.28],[.025,.69],[.09,.72],[.13,.66],[.13,.29]]);});
   add('r8_boot_'+tag,label+' 스트럿 더스트 부트·범프스톱','suspension','#1c2933',m=>{for(let j=0;j<12;j++)m.ring([sign*(6.22-j*.02),1.3+j*.095,-.33-j*.008],.17+j*.002,.035,1);m.cyl([sign*6.0,2.5,-.45],.17,.30,1,32);});
   add('r8_mount_'+tag,label+' 상부 고무 마운트·베어링','suspension','#252f37',m=>m.cyl([sign*5.9,2.91,-.5],.58,.14,1,48).ring([sign*5.9,3.05,-.5],.37,.045,1));
   add('r8_knuckle_bracket_'+tag,label+' 스트럿-너클 체결 브래킷','suspension','#687b88',m=>{for(const zz of [-.25,.25])m.box([sign*6.75,-1.3,zz],[.47,.80,.10]);for(const y of [-1.52,-1.05])m.cyl([sign*6.75,y,.31],.095,.14,2,6);});
   add('r8_balljoint_'+tag,label+' 로어암 볼조인트·부트','suspension','#384b59',m=>m.cyl([sign*6.60,-2.45,0],.22,.28,1,32).ring([sign*6.6,-2.28,0],.16,.045,1));
   add('r8_arm_bushings_'+tag,label+' 로어암 부싱·체결부','suspension','#28343d',m=>{for(const zz of [1,-2.5])m.cyl([sign*2.8,-2.5,zz],.22,.52,0,32).cyl([sign*2.8,-2.5,zz],.09,.62,0,12);});
  }else{
   replacement.add('spring_'+tag);
   add('spring_'+tag,label+' 후륜 코일 스프링','suspension','#c8a04f',m=>{const path=[];for(let j=0;j<=200;j++){const t=j/200,a=t*2*Math.PI*6,r=.51+.12*Math.sin(Math.PI*t);path.push([sign*5.3+r*Math.cos(a),-1.65+2.22*t,-26+r*Math.sin(a)]);}m.tube(path,.07,12);});
   add('r8_rear_seats_'+tag,label+' 후륜 스프링 고무 패드','suspension','#27343d',m=>{for(const y of [-1.72,.64])m.cyl([sign*5.3,y,-26],.64,.12,1,40);});
   add('r8_rear_mount_'+tag,label+' 쇽업소버 상하 아이·부싱','suspension','#667b87',m=>{for(const [y,zz,xx] of [[-2,-27.0,6.3],[1.75,-26.7,5.9]])m.ring([sign*xx,y,zz],.16,.065,0).cyl([sign*xx,y,zz],.08,.30,0,16);});
  }
 }
 return [...parts.filter(p=>!replacement.has(p.id)).map(p=>byId.get(p.id)),...out];
}
function revolveY(m,c,profile){const tmp=new Mesh();revolve(tmp,[0,0,0],profile,64);const n=m.p.length/3;for(let j=0;j<tmp.p.length;j+=3)m.p.push(c[0]+tmp.p[j+1],c[1]+tmp.p[j],c[2]+tmp.p[j+2]);for(const i of tmp.i)m.i.push(n+i);return m;}
