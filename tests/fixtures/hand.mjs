/** Synthetic camera landmarks, deliberately not a real-camera accuracy fixture. */
export function makeHand({x=.5,y=.35,scale=1,pinch=false,palm=false,yaw=1,zOffset=0}={}){
 const p=Array.from({length:21},()=>({x:x+.05,y:y+.3,z:0}));
 const put=(i,dx,dy,z=0)=>{p[i]={x:x+dx,y:y+dy,z};};
 put(0,.05,.43);put(5,-.015,.23);put(6,-.01,.14,-.015);put(7,-.005,.07,-.03);put(8,0,0,-.045);
 put(1,-.03,.36);put(2,-.09,.30);put(3,-.13,.24);put(4,-.17,.17,-.02);
 for(const [mcp,dx] of [[9,.05],[13,.10],[17,.15]]){
  put(mcp,dx,.25);put(mcp+1,dx,.15);
  put(mcp+2,dx,palm?.07:.29);put(mcp+3,dx,palm?0:.34);
 }
 if(pinch)p[4]={...p[8],x:p[8].x+.01};
 return p.map(point=>({x:x+(point.x-x)*scale*yaw,y:y+(point.y-y)*scale,z:point.z*scale+zOffset}));
}

/** A local forward fingertip stroke, with the distal joint moving coherently.
 * Palm position, apparent size and all other fingers remain unchanged. */
export function tapFinger(points,tip=8,travel=.09){
 const result=points.map(p=>({...p}));
 const width=Math.hypot(points[5].x-points[17].x,points[5].y-points[17].y,points[5].z-points[17].z);
 result[tip].z-=width*travel;result[tip-1].z-=width*travel*.6;
 return result;
}
