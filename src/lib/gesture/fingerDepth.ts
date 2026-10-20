import type {Landmark} from './pose.ts';
import type {ForwardDepth} from './forwardDepth.ts';
/** Subtract the palm's 3D plane before measuring each distal finger. Rigid
 * hand translation/size changes and palm tilt must not press five keys. */
export function measureFingerDepth(points:Landmark[],tip:number,aspect=1):ForwardDepth|null{
 if(points.length!==21||points.some(p=>!p||![p.x,p.y,p.z].every(Number.isFinite)))return null;
 const a=points[0],b=points[5],c=points[17];
 const ux=b.x-a.x,uy=(b.y-a.y)/aspect,uz=b.z-a.z;
 const vx=c.x-a.x,vy=(c.y-a.y)/aspect,vz=c.z-a.z;
 const nz=ux*vy-uy*vx;
 const scale=Math.hypot(b.x-c.x,(b.y-c.y)/aspect,b.z-c.z);
 if(scale<.025||Math.abs(nz)<scale*scale*.04)return null;
 const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz;
 const normalZ=Math.abs(nz)/Math.hypot(nx,ny,nz);
 const abovePalm=(i:number)=>{
  const p=points[i],plane=a.z-(nx*(p.x-a.x)+ny*(p.y-a.y)/aspect)/nz;
  return (plane-p.z)*normalZ/scale;
 };
 return {scale:1,fingerDepth:abovePalm(tip),jointDepth:abovePalm(tip-1),shape:[],indexExtended:true};
}
