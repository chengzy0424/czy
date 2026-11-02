import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Unequal joints and swept processes keep the column organic at close range.
// Reuse the same segment budget and merge it into one draw call.
export function vertebraeGeometry(mobile=false){
 const parts=[],layers=19,around=mobile?32:48,section=8;
 for(let layer=0;layer<layers;layer++){
  const g=new T.TorusGeometry(1,.16,section,around),p=g.attributes.position;
  const y=(layer-9)*.49+.045*Math.sin(layer*1.91),twist=layer*.31+.22*Math.sin(layer*.83);
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
  g.computeVertexNormals();parts.push(g);
  // Offset roots, unequal lengths and taper prevent the repeated fan silhouette.
  for(let side=0;side<3;side++){
   const a=side*Math.PI*2/3+twist+.13*Math.sin(layer+side),points=[];
   const length=.62+.31*(.5+.5*Math.sin(layer*1.37+side*2.1))+(side===2?.16:0);
   const bend=.19*Math.sin(layer*.59+side*1.8),lift=.12+.13*Math.cos(layer*.7+side);
   for(let k=0;k<5;k++){const t=k/4,r=.63+t*length,angle=a+bend*t;points.push(new T.Vector3(Math.cos(angle)*r+sway,y+t*lift-.12*Math.sin(t*Math.PI),Math.sin(angle)*r+swayZ));}
   const curve=new T.CatmullRomCurve3(points),b=new T.TubeGeometry(curve,12,.13,6,false),bp=b.attributes.position;
   for(let k=0;k<bp.count;k++){
    const t=Math.floor(k/7)/12,center=curve.getPointAt(t),taper=.14+.86*Math.pow(1-t,.7);
    bp.setXYZ(k,center.x+(bp.getX(k)-center.x)*taper,center.y+(bp.getY(k)-center.y)*taper*.6,center.z+(bp.getZ(k)-center.z)*taper);
   }
   b.computeVertexNormals();parts.push(b);
  }
 }
 const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());geometry.computeBoundingSphere();return geometry;
}

// The pocket and rolled hem share one parameterized surface. This also lets a
// backing mesh follow the fold instead of assuming every tile faces forward.
export function drapePoint(x,y,target=new T.Vector3()){
 const radius=Math.hypot((x-.58)*.86,(y+.08)*1.08);
 const pocket=-1.24*Math.exp(-radius*radius*.86)+.43*Math.exp(-(((radius-1.66)*1.55)**2));
 const rings=.047*Math.cos(radius*8.5)*Math.exp(-radius*radius*.18);
 const sweep=.17*Math.sin(x*.9+y*.3)+.1*Math.sin(y*1.6-x*.35);
 const curl=Math.max(0,-x-2.35),angle=curl*1.25,curlRadius=.8;
 const px=x<-2.35?-2.35-curlRadius*Math.sin(angle):x;
 const py=y+.055*Math.sin(y*1.3+x*.42)*Math.min(1,curl);
 return target.set(px,py,pocket+rings+sweep+curlRadius*(1-Math.cos(angle)));
}
export function drapeHeight(x,y){
 return drapePoint(x,y).z;
}
export function createDrapedGrid(material,mobile=false){
 const radius=mobile?.145:.105;
 const cells=[];
 const columns=mobile?18:25,rows=mobile?9:13;
 for(let col=-columns;col<=columns;col++)for(let row=-rows;row<=rows;row++){
  const x=col*radius*1.53,y=(row+(Math.abs(col)%2)*.5)*radius*Math.sqrt(3)*1.02;
  cells.push([x,y]);
 }
 // Three rings produce a bevel plus real sides with only 36 triangles per tile.
 const vertices=[0,0,.075,0,0,0],indices=[];
 for(const [scale,z] of [[.84,.075],[1,.045],[1,0]])for(let k=0;k<6;k++){const a=k*Math.PI/3;vertices.push(Math.cos(a)*radius*scale,Math.sin(a)*radius*scale,z);}
 for(let k=0;k<6;k++){const n=(k+1)%6;indices.push(0,2+k,2+n,1,14+n,14+k);for(let ring=0;ring<2;ring++){const a=2+ring*6+k,b=2+ring*6+n;indices.push(a,a+6,b,b,a+6,b+6);}}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();
 const grid=new T.InstancedMesh(geo,material,cells.length),basis=new T.Matrix4(),normal=new T.Vector3(),tx=new T.Vector3(),ty=new T.Vector3(),position=new T.Vector3(),sample=new T.Vector3(),tileScale=new T.Vector3(.9,.9,1),color=new T.Color();
 cells.forEach(([x,y],i)=>{
  drapePoint(x+.005,y,tx).sub(drapePoint(x-.005,y,sample)).normalize();
  drapePoint(x,y+.005,ty).sub(drapePoint(x,y-.005,sample)).normalize();
  normal.crossVectors(tx,ty).normalize();ty.crossVectors(normal,tx).normalize();
  basis.makeBasis(tx,ty,normal);basis.scale(tileScale);basis.setPosition(drapePoint(x,y,position));grid.setMatrixAt(i,basis);
  const tint=.5+.5*Math.sin(x*1.7-y*.9);color.setHSL(.43+.08*tint,.055,.22+.09*tint);grid.setColorAt(i,color);
 });
 grid.computeBoundingBox();grid.computeBoundingSphere();grid.userData.relief=true;return grid;
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

