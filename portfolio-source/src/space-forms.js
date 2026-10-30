import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Each vertebra is a separate closed surface, with air between the plates.
// A merged buffer keeps the complex silhouette to one draw call.
export function vertebraeGeometry(mobile=false){
 const parts=[],layers=19,around=mobile?32:48,section=8;
 for(let layer=0;layer<layers;layer++){
  const g=new T.TorusGeometry(1,.16,section,around),p=g.attributes.position;
  const y=(layer-9)*.49,twist=layer*.37+.15*Math.sin(layer),sway=.19*Math.sin(y*.9);
  for(let i=0;i<p.count;i++){
   const u=(i%(around+1))/around*Math.PI*2,v=Math.floor(i/(around+1))/section*Math.PI*2;
   const lobe=Math.pow((1+Math.cos(u*3+layer*.13))*.5,4);
   const r=.52+.54*lobe+.16*Math.cos(v)*(1+.45*lobe);
   const a=u+twist;
   p.setXYZ(i,Math.cos(a)*r+sway,y+Math.sin(v)*(.12+.07*lobe)+.13*Math.sin(u*3+layer*.13),Math.sin(a)*r);
  }
  g.computeVertexNormals();parts.push(g);
  // Swept, flattened processes branch from every other plate; their taper is geometric.
  for(let side=0;side<3;side++){
   const a=side*Math.PI*2/3+twist,points=[];
   for(let k=0;k<5;k++){const t=k/4,r=.66+t*(.76+.18*Math.sin(layer));points.push(new T.Vector3(Math.cos(a+t*.2)*r+sway,y+t*.13-.1*Math.sin(t*Math.PI),Math.sin(a+t*.2)*r));}
   const b=new T.TubeGeometry(new T.CatmullRomCurve3(points),12,.1,6,false),bp=b.attributes.position;
   for(let k=0;k<bp.count;k++){const t=Math.floor(k/7)/12,center=points[0];bp.setY(k,y+(bp.getY(k)-y)*.65);if(t>.65){const factor=1-(t-.65)*1.8;const end=points[4];bp.setY(k,end.y+(bp.getY(k)-end.y)*factor);}}
   b.computeVertexNormals();parts.push(b);
  }
 }
 const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());geometry.computeBoundingSphere();return geometry;
}

export function drapeHeight(x,y){
 return .48*Math.cos(x*.85)+.3*Math.sin(x*1.9+y*.7)+.13*Math.cos(y*2.1-x*.8)+.8*Math.exp(-((x+.2)**2+(y*.75)**2)*.5)-.4*Math.exp(-((x-1.7)**2+(y+.4)**2)*1.3);
}
export function createDrapedGrid(material,mobile=false){
 const radius=mobile?.145:.105;
 const cells=[];
 const columns=mobile?18:25,rows=mobile?9:13;
 for(let col=-columns;col<=columns;col++)for(let row=-rows;row<=rows;row++){
  const x=col*radius*1.53,y=(row+(Math.abs(col)%2)*.5)*radius*Math.sqrt(3)*1.02;
  cells.push([x,y,drapeHeight(x,y)]);
 }
 // Three rings produce a bevel plus real sides with only 36 triangles per tile.
 const vertices=[0,0,.075,0,0,0],indices=[];
 for(const [scale,z] of [[.84,.075],[1,.045],[1,0]])for(let k=0;k<6;k++){const a=k*Math.PI/3;vertices.push(Math.cos(a)*radius*scale,Math.sin(a)*radius*scale,z);}
 for(let k=0;k<6;k++){const n=(k+1)%6;indices.push(0,2+k,2+n,1,14+n,14+k);for(let ring=0;ring<2;ring++){const a=2+ring*6+k,b=2+ring*6+n;indices.push(a,a+6,b,b,a+6,b+6);}}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();
 const grid=new T.InstancedMesh(geo,material,cells.length),dummy=new T.Object3D(),normal=new T.Vector3(),front=new T.Vector3(0,0,1),color=new T.Color();
 cells.forEach(([x,y,z],i)=>{
  const dx=(drapeHeight(x+.01,y)-drapeHeight(x-.01,y))/.02,dy=(drapeHeight(x,y+.01)-drapeHeight(x,y-.01))/.02;
  normal.set(-dx,-dy,1).normalize();dummy.position.set(x,y,z);dummy.quaternion.setFromUnitVectors(front,normal);dummy.updateMatrix();grid.setMatrixAt(i,dummy.matrix);
  color.setHSL(.1+.05*Math.sin(x+y),.09,.14+.09*(.5+.5*Math.sin(x*2+y*3)));grid.setColorAt(i,color);
 });
 grid.userData.relief=true;return grid;
}

export function membraneGeometry(){
 const geo=new T.PlaneGeometry(12,10,64,48),p=geo.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);p.setZ(i,.12*Math.sin(x*2.4+y*.7)+.07*Math.sin(y*3.2-x*.8)+.035*Math.sin(x*6+y*4));}
 geo.computeVertexNormals();return geo;
}

export function flowingRibbonGeometry(phase=0){
 const p=[],uv=[],indices=[],steps=160;
 for(let i=0;i<=steps;i++){
  const t=i/steps,a=t*Math.PI*2.4+phase,r=1.5+t*1.9,width=.2+.55*Math.sin(t*Math.PI)**2;
  for(const side of [-1,1]){p.push(Math.cos(a)*r,Math.sin(a)*r*.6-1.8+side*width,Math.sin(a*.7)*1.2-1.4);uv.push(t,(side+1)/2);}
  if(i<steps){const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}
 }
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();return geo;
}
