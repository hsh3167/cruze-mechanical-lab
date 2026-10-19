// Column-major Float32 matrices shared by the renderer and motion verification.
export const identity=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
export const point=(m,v)=>[0,1,2].map(r=>m[r]*v[0]+m[r+4]*v[1]+m[r+8]*v[2]+m[r+12]);
export function multiply(a,b){const m=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let v=0;for(let k=0;k<4;k++)v+=a[r+4*k]*b[k+4*c];m[r+4*c]=v;}return m;}
export function translation(v){const m=identity();m.set(v,12);return m;}
export function operationMatrix(op){let m=identity();
 if(op.kind==='translate')return translation(op.value);
 if(op.kind==='link'){
  const v=op.to.map((x,i)=>x-op.from[i]),d=op.target.map((x,i)=>x-op.to[i]),length2=v.reduce((s,x)=>s+x*x,0);
  if(length2<1e-12)throw Error('Motion link has coincident anchors');
  for(let c=0;c<3;c++)for(let r=0;r<3;r++)m[r+c*4]+=d[r]*v[c]/length2;
  const q=point(m,op.from);for(let r=0;r<3;r++)m[12+r]=op.from[r]-q[r];return m;
 }
 if(op.kind==='scaleY')m[5]=op.scale;
 else if(op.kind==='rotateY'){const c=Math.cos(op.angle),s=Math.sin(op.angle);m[0]=c;m[2]=-s;m[8]=s;m[10]=c;}
 else if(op.kind==='rotateZ'){const c=Math.cos(op.angle),s=Math.sin(op.angle);m[0]=c;m[1]=s;m[4]=-s;m[5]=c;}
 else throw Error('Unknown motion operation: '+op.kind);
 return multiply(translation(op.pivot),multiply(m,translation(op.pivot.map(v=>-v))));
}
export function motionMatrix(operations,base=identity()){return operations.reduce((pose,op)=>multiply(operationMatrix(op),pose),base);}
