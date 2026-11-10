import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {GALLERY_DESCENT} from './space-path.js';

export const GALLERY_SPINE_BOUNDS=Object.freeze({top:4.5,bottom:-GALLERY_DESCENT-4.5});
// Unequal joints and swept processes keep the column organic at close range.
// Build the entire expanded column once. Lower radial tessellation keeps the
// longer spine inside the existing geometry budget; scrolling never stretches it.
export function vertebraeGeometry(mobile=false){
 const parts=[],joints=[],around=mobile?14:20,section=6,spurSegments=5;let vertexCursor=0;
 for(let layer=Math.ceil(GALLERY_SPINE_BOUNDS.bottom/.56);layer<=Math.floor(GALLERY_SPINE_BOUNDS.top/.56);layer++){
  const jointStart=vertexCursor;
  const g=new T.TorusGeometry(1,.16,section,around),p=g.attributes.position;
  const y=layer*.56+.045*Math.sin(layer*1.91),twist=layer*.31+.22*Math.sin(layer*.83);
  const sway=.23*Math.sin(y*.81),swayZ=.13*Math.cos(y*.67);
  const lobes=[.38+.09*Math.sin(layer*1.23),.24+.08*Math.cos(layer*.91),.46+.1*Math.sin(layer*.73+.8)];
  for(let i=0;i<p.count;i++){
   const u=(i%(around+1))/around*Math.PI*2,v=Math.floor(i/(around+1))/section*Math.PI*2;
   let lobe=0;for(let side=0;side<3;side++)lobe+=lobes[side]*Math.exp(6*(Math.cos(u-side*Math.PI*2/3-.13*Math.sin(layer+side))-1));
   const ridges=.045*Math.sin(u*5+layer*.72)+.025*Math.cos(u*7-layer*.31);
   const wall=.14+.035*Math.sin(u*2+layer*.79)+lobe*.12;
   const r=.46+lobe+ridges+Math.cos(v)*wall;
   const a=u+twist;
   p.setXYZ(i,Math.cos(a)*r+sway,y+Math.sin(v)*(.115+lobe*.12)+.105*Math.sin(u*3+layer*.51)+.045*Math.cos(u+layer),Math.sin(a)*r*(.9+.09*Math.sin(layer*.8))+swayZ);
  }
  g.computeVertexNormals();parts.push(g);vertexCursor+=p.count;
  // Offset roots, unequal lengths and taper prevent the repeated fan silhouette.
  for(let side=0;side<3;side++){
   const a=side*Math.PI*2/3+twist+.13*Math.sin(layer+side),points=[];
   const length=.62+.31*(.5+.5*Math.sin(layer*1.37+side*2.1))+(side===2?.16:0);
   const bend=.19*Math.sin(layer*.59+side*1.8),lift=.12+.13*Math.cos(layer*.7+side);
   for(let k=0;k<5;k++){const t=k/4,r=.63+t*length,angle=a+bend*t;points.push(new T.Vector3(Math.cos(angle)*r+sway,y+t*lift-.12*Math.sin(t*Math.PI),Math.sin(angle)*r+swayZ));}
   const curve=new T.CatmullRomCurve3(points),b=new T.TubeGeometry(curve,spurSegments,.13,6,false),bp=b.attributes.position;
   for(let k=0;k<bp.count;k++){
    const t=Math.floor(k/7)/spurSegments,center=curve.getPointAt(t),taper=.14+.86*Math.pow(1-t,.7);
    bp.setXYZ(k,center.x+(bp.getX(k)-center.x)*taper,center.y+(bp.getY(k)-center.y)*taper*.6,center.z+(bp.getZ(k)-center.z)*taper);
   }
   b.computeVertexNormals();parts.push(b);vertexCursor+=bp.count;
  }
  joints.push({start:jointStart,count:vertexCursor-jointStart,y});
 }
 const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());
 // Retain joint ranges and their original coordinates for geometry invariants.
 const restY=new Float32Array(geometry.attributes.position.count);
 for(let i=0;i<restY.length;i++)restY[i]=geometry.attributes.position.getY(i);
 geometry.userData.joints=joints;geometry.userData.restY=restY;
 geometry.computeBoundingSphere();return geometry;
}

export const LAB_WAVE_PERIOD=4.8;
export const LAB_LIP_SEAM=-2.35;
const drapeFrequency=Math.PI*2/LAB_WAVE_PERIOD,drapedGrids=new WeakMap(),transitionBase=new Float64Array(15),transitionLip=new Float64Array(15);
// Five vector coefficients describe the rest shape and two coherent harmonics.
// The basin's curved left boundary joins the rolled mouth's right semicircle.
function lipCoefficients(x,y,out){
 out.fill(0);
  const u=(LAB_LIP_SEAM-x)/1.75,theta=y/2.52*Math.PI;
  const c=Math.cos(theta),s=Math.sin(theta),bulge=Math.sin(Math.PI*u);
  out[0]=-3.14+(.86+.14*bulge)*c+.2*(u-.5);
  out[1]=(1.96+.2*bulge)*s;
  out[2]=.08+1.12*u+.29*c;
  const a=-Math.cos(theta*2),b=Math.sin(theta*2);
  out[3]=.045*c*a;out[4]=.07*s*a;out[5]=.085*a;
  out[6]=.045*c*b;out[7]=.07*s*b;out[8]=.085*b;
 return out;
}
function basinCoefficients(x,y,out){
 out.fill(0);
  const r=Math.hypot((x-.08)*1.08,(y+.02)*.76);
  const pocket=.56*Math.exp(-r*r*.63)-.36*Math.exp(-(((r-1.48)*1.65)**2));
  const ridges=.07*Math.cos(r*5.4)*Math.exp(-r*r*.13);
  const sweep=.095*Math.sin(x*.75+y*.31)+.06*Math.sin(y*1.45-x*.26);
  const curl=Math.max(0,x-2.32),angle=curl*.79;
  out[0]=x>2.32?2.32+Math.sin(angle)/.79:x;
  out[1]=y+.035*Math.sin(x*.8)*Math.sin(y*.9);
  out[2]=pocket+ridges+sweep+.92*(1-Math.cos(angle))+.13*Math.sin(x*4.2+y*.42)*Math.max(0,Math.min(1,x-1.45));
  const envelope=.35+.65*Math.exp(-r*r*.085),radial=Math.sqrt(r*r+.035)*2.7,travel=radial*2+.35;
  out[5]=-.46*envelope*Math.cos(radial);out[8]=.46*envelope*Math.sin(radial);
  out[11]=-.105*envelope*Math.cos(travel);out[14]=.105*envelope*Math.sin(travel);
 return out;
}
function rawDrapeCoefficients(x,y,out){
 if(x<LAB_LIP_SEAM)return lipCoefficients(x,y,out);
 basinCoefficients(x,y,out);
 if(x<-1.12){
  const t=Math.min(1,(x-LAB_LIP_SEAM)/1.23),weight=1-t*t*(3-2*t);
  const theta=Math.max(-1,Math.min(1,y/2.52))*Math.PI/2;
  basinCoefficients(LAB_LIP_SEAM,y,transitionBase);
  lipCoefficients(LAB_LIP_SEAM-.94*1.75,theta/Math.PI*2.52,transitionLip);
  for(let i=0;i<15;i++)out[i]+=weight*(transitionLip[i]-transitionBase[i]);
 }
 return out;
}
function drapeCoefficients(x,y,out){
 rawDrapeCoefficients(x,y,out);
 for(let i=0;i<15;i+=3){out[i]*=1.08;out[i+1]*=.76;}
 return out;
}
export function drapePoint(x,y,target=new T.Vector3(),time=0){
 const c=drapeCoefficients(x,y,new Float64Array(15)),phase=time*drapeFrequency;
 const a=Math.sin(phase),b=Math.cos(phase),d=Math.sin(phase*2),e=Math.cos(phase*2);
 return target.set(c[0]+a*c[3]+b*c[6]+d*c[9]+e*c[12],c[1]+a*c[4]+b*c[7]+d*c[10]+e*c[13],c[2]+a*c[5]+b*c[8]+d*c[11]+e*c[14]);
}
export function drapeHeight(x,y,time=0){return drapePoint(x,y,undefined,time).z;}

// Cache the spatial derivatives once. Each animation frame only combines five
// coefficients and forms an orthonormal tile basis; no per-cell allocations.
export function createDrapeSampler(coordinates){
 const values=new Float32Array(coordinates.length*45),c=new Float64Array(15),lo=new Float64Array(15),hi=new Float64Array(15);
 for(let i=0;i<coordinates.length;i++){
  const [x,y]=coordinates[i],offset=i*45,epsilon=.003;
  drapeCoefficients(x,y,c);values.set(c,offset);
  // Never cross the lip/cloth seam while measuring a patch's tangent.
  const left=x<LAB_LIP_SEAM?x-epsilon:Math.max(x-epsilon,LAB_LIP_SEAM);
  const right=x<LAB_LIP_SEAM?Math.min(x+epsilon,LAB_LIP_SEAM-.0000001):x+epsilon;
  drapeCoefficients(left,y,lo);drapeCoefficients(right,y,hi);
  for(let k=0;k<15;k++)values[offset+15+k]=(hi[k]-lo[k])/(right-left);
  drapeCoefficients(x,y-epsilon,lo);drapeCoefficients(x,y+epsilon,hi);
  for(let k=0;k<15;k++)values[offset+30+k]=(hi[k]-lo[k])/(epsilon*2);
 }
 let a=0,b=1,d=0,e=1;
 return {
  count:coordinates.length,values,
  setTime(time){const phase=time*drapeFrequency;a=Math.sin(phase);b=Math.cos(phase);d=Math.sin(phase*2);e=Math.cos(phase*2);},
  sample(index,position,tx,ty){
   const offset=index*45;
   for(let j=0;j<3;j++){
    const k=offset+j*15;
    const target=j===0?position:j===1?tx:ty;
    target.set(values[k]+a*values[k+3]+b*values[k+6]+d*values[k+9]+e*values[k+12],values[k+1]+a*values[k+4]+b*values[k+7]+d*values[k+10]+e*values[k+13],values[k+2]+a*values[k+5]+b*values[k+8]+d*values[k+11]+e*values[k+14]);
   }
  },
  bounds(padding=0){
   const box=new T.Box3(),low=new T.Vector3(),high=new T.Vector3();
   for(let i=0;i<coordinates.length;i++){
    const k=i*45;
    for(let axis=0;axis<3;axis++){
     const span=Math.hypot(values[k+axis+3],values[k+axis+6])+Math.hypot(values[k+axis+9],values[k+axis+12])+padding;
     low.setComponent(axis,values[k+axis]-span);high.setComponent(axis,values[k+axis]+span);
    }
    box.expandByPoint(low);box.expandByPoint(high);
   }
   return box;
  }
 };
}

export function updateDrapedGrid(grid,time=0){
 const state=drapedGrids.get(grid);if(!state)throw new TypeError('Expected a draped tile grid');
 const {sampler,basis,normal,tx,ty,position,tileScale}=state;sampler.setTime(time);
 for(let i=0;i<grid.count;i++){
  sampler.sample(i,position,tx,ty);tileScale.set(.95*Math.min(1.6,tx.length()),.95*Math.min(1.2,ty.length()),.85);tx.normalize();normal.crossVectors(tx,ty).normalize();ty.crossVectors(normal,tx).normalize();
  basis.makeBasis(tx,ty,normal);basis.scale(tileScale);basis.setPosition(position);grid.setMatrixAt(i,basis);
 }
 grid.instanceMatrix.needsUpdate=true;
}
export function createDrapedGrid(material,mobile=false){
 const radius=mobile?.145:.105;
 const cells=[];let lipCells=0;
 const columns=mobile?18:25,rows=mobile?9:13;
 for(let col=-columns;col<=columns;col++)for(let row=-rows;row<=rows;row++){
  const x=col*radius*1.53,y=(row+(Math.abs(col)%2)*.5)*radius*Math.sqrt(3)*1.02;
  if(x<LAB_LIP_SEAM)lipCells++;else cells.push([x,y]);
 }
 // Redistribute the existing left-strip cells around the mouth by arc length.
 // Uniform parameter rows would leave large gaps at the ellipse's long sides.
 const lipColumns=mobile?4:6,arc=new Float64Array(513);
 for(let column=0;column<lipColumns;column++){
  const u=(column+.5)/lipColumns,count=Math.floor(lipCells/lipColumns)+(column<lipCells%lipColumns?1:0),bulge=Math.sin(Math.PI*u);
  const rx=.86+.14*bulge,ry=1.96+.2*bulge;
  let previousX=-rx,previousY=0,previousZ=-.29;arc[0]=0;
  for(let i=1;i<=512;i++){
   const angle=-Math.PI+i/512*Math.PI*2,x=rx*Math.cos(angle),y=ry*Math.sin(angle),z=.29*Math.cos(angle);
   arc[i]=arc[i-1]+Math.hypot(x-previousX,y-previousY,z-previousZ);previousX=x;previousY=y;previousZ=z;
  }
  let cursor=1;
  for(let row=0;row<count;row++){
   const distance=(row+(column%2)*.5)/count*arc[512];
   while(cursor<512&&arc[cursor]<distance)cursor++;
   const index=cursor-1+(distance-arc[cursor-1])/(arc[cursor]-arc[cursor-1]),angle=-Math.PI+index/512*Math.PI*2;
   cells.push([LAB_LIP_SEAM-u*1.75,angle/Math.PI*2.52]);
  }
 }
 // Five rounded bevel rings retain a solid stamped edge (60 triangles / cell).
 const vertices=[0,0,.079,0,0,0],uv=[.5,.5,.5,.5],indices=[];
 for(const [scale,z] of [[.86,.079],[.96,.071],[1,.049],[1,.017],[.94,0]])for(let k=0;k<6;k++){
  const a=k*Math.PI/3,px=Math.cos(a),py=Math.sin(a);vertices.push(px*radius*scale,py*radius*scale,z);uv.push(.5+px*scale*.5,.5+py*scale*.5);
 }
 // Duplicate the face perimeter: broad flat metal tops, smooth rounded edges.
 for(let k=0;k<6;k++){const a=k*Math.PI/3;vertices.push(Math.cos(a)*radius*.86,Math.sin(a)*radius*.86,.079);uv.push(.5+Math.cos(a)*.43,.5+Math.sin(a)*.43);}
 for(let k=0;k<6;k++){
  const n=(k+1)%6;indices.push(0,32+k,32+n,1,26+n,26+k);
  for(let ring=0;ring<4;ring++){const a=2+ring*6+k,b=2+ring*6+n;indices.push(a,a+6,b,b,a+6,b+6);}
 }
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
 const grid=new T.InstancedMesh(geo,material,cells.length),sampler=createDrapeSampler(cells),color=new T.Color();
 grid.instanceMatrix.setUsage(T.DynamicDrawUsage);
 drapedGrids.set(grid,{sampler,basis:new T.Matrix4(),normal:new T.Vector3(),tx:new T.Vector3(),ty:new T.Vector3(),position:new T.Vector3(),tileScale:new T.Vector3(.98,.76,.85)});
 updateDrapedGrid(grid,0);
 cells.forEach(([x,y],i)=>{
  const tint=.5+.5*Math.sin(x*71.23+y*93.77);color.setRGB(.58+.28*tint,.6+.25*tint,.57+.24*tint);grid.setColorAt(i,color);
 });
 // Every possible phase is covered, so culling and marker clearance stay valid
 // without rescanning the instances on each animation frame.
 grid.boundingBox=sampler.bounds(Math.hypot(radius*1.6,.079*.85));grid.boundingSphere=grid.boundingBox.getBoundingSphere(new T.Sphere());
 grid.name='lab-honeycomb';grid.userData.relief=true;grid.userData.wavePeriod=LAB_WAVE_PERIOD;return grid;
}

export function membraneGeometry(){
 const geo=new T.PlaneGeometry(12,10,64,48),p=geo.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);p.setZ(i,.12*Math.sin(x*2.4+y*.7)+.07*Math.sin(y*3.2-x*.8)+.035*Math.sin(x*6+y*4));}
 geo.computeVertexNormals();return geo;
}

export function flowingRibbonGeometry(phase=0){
 const p=[],uv=[],indices=[],steps=52,lanes=3;
 // Parallel currents, gently folded in depth. Three strips reuse the former
 // spiral's triangle budget; each retains along/across UVs for the flow shader.
 for(let lane=0;lane<lanes;lane++)for(let i=0;i<=steps;i++){
  const t=i/steps,envelope=Math.sin(t*Math.PI),x=-4.4+t*8.8;
  const wave=.31*Math.sin(t*7.5+phase*.5)+.075*Math.sin(t*29+lane*.42+phase);
  const y=-2.1+lane*.43+phase*.27+wave,z=-1.75+.65*Math.sin(t*5.8+phase*.4)+lane*.035;
  const width=.075+.22*envelope*envelope,fold=.75*Math.sin(t*8+phase+lane*.24);
  for(const side of [-1,1]){p.push(x,y+side*width,z+side*width*fold);uv.push(t,(side+1)/2);}
  if(i<steps){const n=(lane*(steps+1)+i)*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}
 }
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();return geo;
}

