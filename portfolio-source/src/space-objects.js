import * as T from 'three';
import {CARD_SPECS} from './space-path.js';
import {seededRandom} from './weave-math.js';

function tube(points,radius,material,segments=96,closed=false){
 const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),closed);
 return new T.Mesh(new T.TubeGeometry(curve,segments,radius,6,closed),material);
}
function ringShape(radius,inner){
 const shape=new T.Shape();shape.absarc(0,0,radius,0,Math.PI*2,false);
 const hole=new T.Path();hole.absarc(0,0,inner,0,Math.PI*2,true);shape.holes.push(hole);return shape;
}
function extruded(shape,depth=.12,bevel=.025,curveSegments=48){return new T.ExtrudeGeometry(shape,{depth,steps:1,curveSegments,bevelEnabled:true,bevelSegments:3,bevelSize:bevel,bevelThickness:bevel});}
function mesh(geometry,material,parent,position=[0,0,0]){const m=new T.Mesh(geometry,material);m.position.fromArray(position);parent.add(m);return m;}
function torus(parent,r,t,mat,pos=[0,0,0],horizontal=false){const m=mesh(new T.TorusGeometry(r,t,8,96),mat,parent,pos);if(horizontal)m.rotation.x=Math.PI/2;return m;}
function roundedShape(w,h,r){const s=new T.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;}
function setUV(geo,w,h){const p=geo.attributes.position,uv=new Float32Array(p.count*2);for(let i=0;i<p.count;i++){uv[i*2]=p.getX(i)/w+.5;uv[i*2+1]=p.getY(i)/h+.5;}geo.setAttribute('uv',new T.BufferAttribute(uv,2));return geo;}

export function buildWorld({mobile=false,documentRef=document,onTexture=()=>{}}={}){
 const world=new T.Group(),pickables=[],opaque=[],textures=[],cards=[];
 const chrome=new T.MeshPhysicalMaterial({color:0xa7b8bd,metalness:.97,roughness:.18,clearcoat:1,clearcoatRoughness:.12,iridescence:.9,iridescenceIOR:1.4,iridescenceThicknessRange:[180,520],envMapIntensity:1.65});
 const dark=new T.MeshStandardMaterial({color:0x10191c,metalness:.92,roughness:.3,envMapIntensity:1.1});
 const rose=new T.MeshPhysicalMaterial({color:0x531227,metalness:.9,roughness:.24,clearcoat:1,envMapIntensity:1.6});
 const silver=new T.MeshStandardMaterial({color:0xb3c5c3,metalness:.96,roughness:.24});
 const glow=new T.MeshBasicMaterial({color:0x842447,toneMapped:true});
 const glass=new T.MeshPhysicalMaterial({color:0xb9cbcf,metalness:mobile?.7:.18,roughness:.13,transmission:mobile?0:.42,thickness:.3,ior:1.46,clearcoat:1,iridescence:1,iridescenceIOR:1.35,iridescenceThicknessRange:[180,460],envMapIntensity:1.6});
 const emblem=new T.Group();emblem.position.set(2,0,0);world.add(emblem);
 const lens=new T.Group();emblem.add(lens);
 // Elliptical tube cross section: changing normals create a narrow, angle-dependent highlight.
 const ringGeo=new T.TorusGeometry(1.12,.082,20,160);ringGeo.scale(1,1,1.85);
 const rim=mesh(ringGeo,glass,lens);opaque.push(rim);
 torus(lens,1.21,.012,silver,[0,0,.12]);torus(lens,1.045,.01,rose,[0,0,.13]);
 // Original ZY monogram, not the reference studio's trademark.
 const z=new T.Shape();z.moveTo(-.52,.43);z.lineTo(.48,.43);z.lineTo(.48,.27);z.lineTo(-.22,-.29);z.lineTo(.5,-.29);z.lineTo(.5,-.46);z.lineTo(-.5,-.46);z.lineTo(-.5,-.28);z.lineTo(.23,.26);z.lineTo(-.52,.26);z.closePath();
 opaque.push(mesh(extruded(z,.16,.028),chrome,lens,[0,0,.01]));
 lens.add(tube([[-.36,.66,-.08],[0,.24,.04],[.38,.65,-.08]],.027,silver,24));
 lens.rotation.y=-.3;lens.rotation.z=-.08;
 const arcs=new T.Group();emblem.add(arcs);
 for(let k=0;k<2;k++){
  const pts=[];for(let i=0;i<=80;i++){const t=i/80;pts.push([(k?1:-1)*Math.sin(t*Math.PI*1.37)*1.13,-.48-t*4.4,Math.cos(t*Math.PI*2+k)*.4]);}
  arcs.add(tube(pts,.014,k?rose:chrome,160));
 }
 for(let i=0;i<3;i++){const m=mesh(new T.ConeGeometry(.028,.85,6),silver,emblem,[2.1+i*.38,2.3+i*.18,-1-i*.45]);m.rotation.z=-.7;}
 const satellite=torus(emblem,.36,.035,rose,[-3.9,2.2,-2]);satellite.rotation.x=1.15;

 function canvasTexture(width,height,draw){
  const canvas=documentRef.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');draw(ctx,canvas);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;textures.push(texture);return {canvas,ctx,texture};
 }
 const introTexture=canvasTexture(1536,1024,c=>{c.clearRect(0,0,1536,1024);c.fillStyle='#e2e9e5';c.font='200 188px "Segoe UI", sans-serif';['CODE','PLAY','CREATE'].forEach((s,i)=>c.fillText(s,26,235+i*216));});
 const intro=mesh(new T.PlaneGeometry(7.1,4.73),new T.MeshBasicMaterial({map:introTexture.texture,transparent:true,depthWrite:false,opacity:0}),world,[-1.3,.2,-1.7]);

 const gallery=new T.Group();gallery.position.y=-13;world.add(gallery);
 // Corrugated, twisted shell rather than a smooth tube: real silhouette and surface normals.
 const seg=mobile?40:64,rows=mobile?100:180,positions=[],indices=[];
 for(let j=0;j<=rows;j++)for(let i=0;i<=seg;i++){
  const y=(j/rows-.5)*8,a=i/seg*Math.PI*2+y*.62;
  const radius=.52+.13*Math.sin(y*5.2+a*3)+.13*Math.cos(a*5+y*2.4)+.065*Math.sin(a*11-y*3.1);
  positions.push(Math.cos(a)*radius*(1+.48*Math.sin(y*1.7))+.22*Math.sin(y*.91),y,Math.sin(a)*radius+.16*Math.cos(y*1.3));
 }
 for(let j=0;j<rows;j++)for(let i=0;i<seg;i++){const a=j*(seg+1)+i,b=a+seg+1;indices.push(a,b,a+1,b,b+1,a+1);}
 const shellGeo=new T.BufferGeometry();shellGeo.setAttribute('position',new T.Float32BufferAttribute(positions,3));shellGeo.setIndex(indices);shellGeo.computeVertexNormals();
 const spine=mesh(shellGeo,chrome,gallery);opaque.push(spine);
 // Irregular crystal fragments cling to the structure, rather than a uniform star background.
 const fragmentCount=mobile?260:780,fragments=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),chrome,fragmentCount),fragmentDummy=new T.Object3D(),rand=seededRandom(9087),tint=new T.Color();
 for(let i=0;i<fragmentCount;i++){
  const y=rand()*8-4,a=y*1.7+rand()*.8+(i%3)*2.094,r=.8+rand()*.35;
  fragmentDummy.position.set(Math.cos(a)*r+.22*Math.sin(y),y,Math.sin(a)*r);
  fragmentDummy.rotation.set(rand()*3,rand()*3,rand()*3);const s=.013+Math.pow(rand(),3)*.085;fragmentDummy.scale.set(s,s*(1+rand()),s);fragmentDummy.updateMatrix();fragments.setMatrixAt(i,fragmentDummy.matrix);
  tint.setHSL(.49+rand()*.36,.45,.25+rand()*.2);fragments.setColorAt(i,tint);
 }gallery.add(fragments);
 const tendrils=new T.Group();gallery.add(tendrils);
 for(let k=0;k<(mobile?4:7);k++){
  const pts=[];for(let j=0;j<=100;j++){const y=j/100*8-4,a=y*(.85+k*.07)+k*.9,r=.75+.22*Math.sin(y*2+k);pts.push([Math.cos(a)*r,y,Math.sin(a)*r]);}
  tendrils.add(tube(pts,k%2?.018:.046,k%3?chrome:silver,mobile?100:160));
 }
 for(let j=0;j<16;j++){
  const m=torus(gallery,.65+.14*Math.sin(j*1.5),.018,chrome,[.12*Math.sin(j),j*.48-3.6,0],true);m.rotation.z=.4*Math.sin(j*2);
 }
 const cardDeck=new T.Group();gallery.add(cardDeck);
 for(const spec of CARD_SPECS){
  const group=new T.Group();group.position.fromArray(spec.position);group.rotation.y=spec.rotation;cardDeck.add(group);
  const shape=roundedShape(3.5,2.3,.105),backMaterial=dark.clone();backMaterial.transparent=true;backMaterial.opacity=.25;backMaterial.depthWrite=false;
  const base=mesh(extruded(shape,.055,.018,mobile?8:16),backMaterial,group,[0,0,-.04]);
  const frameShape=roundedShape(3.55,2.35,.115);frameShape.holes.push(roundedShape(3.47,2.27,.08));
  const edge=mesh(extruded(frameShape,.035,.012,mobile?8:16),chrome.clone(),group,[0,0,-.07]);
  let cover;
  const draw=c=>{
   c.clearRect(0,0,1280,840);c.fillStyle='#122225';c.fillRect(0,0,1280,840);
   if(cover){const scale=Math.max(1280/cover.width,840/cover.height);c.globalAlpha=.7;c.drawImage(cover,(1280-cover.width*scale)/2,(840-cover.height*scale)/2,cover.width*scale,cover.height*scale);c.globalAlpha=1;}
   // Non-public HMI and planned work use honest typographic covers, never fabricated UI.
   if(!spec.image){c.strokeStyle=spec.id==='boe'?'#447b79':'#6a587b';c.lineWidth=1;for(let i=0;i<7;i++){c.beginPath();c.ellipse(940,410,110+i*45,160+i*27,-.3,0,Math.PI*2);c.stroke();}}
   const shade=c.createLinearGradient(0,0,0,840);shade.addColorStop(0,'rgba(4,10,14,.25)');shade.addColorStop(.43,'rgba(4,10,14,.22)');shade.addColorStop(1,'rgba(4,10,14,.96)');c.fillStyle=shade;c.fillRect(0,0,1280,840);
   c.fillStyle='#c3d5d1';c.font='24px "Segoe UI", sans-serif';c.fillText(spec.subtitle,66,86);
   c.fillStyle='#eff3ed';c.font='300 73px "Segoe UI", sans-serif';c.fillText(spec.title,64,657,1140);
   c.fillStyle='#b8cac7';c.font='25px "Microsoft YaHei", sans-serif';c.fillText(spec.note,68,728);
   c.strokeStyle='#aac7c066';c.strokeRect(24,24,1232,792);
  };
  const surface=canvasTexture(1280,840,draw);
  const face=mesh(setUV(new T.ShapeGeometry(shape,8),3.5,2.3),new T.MeshBasicMaterial({map:surface.texture,side:T.FrontSide,transparent:true,opacity:.9,depthWrite:false}),group,[0,0,.044]);
  face.userData.detail=spec.id;pickables.push(face);opaque.push(base,edge);
  cards.push({group,face,edge,base,spec,hover:0,home:group.position.clone()});
  if(spec.image){const img=new Image();img.onload=()=>{cover=img;draw(surface.ctx);surface.texture.needsUpdate=true;onTexture();};img.onerror=()=>console.warn('Gallery cover unavailable:',spec.image);img.src=spec.image;}
 }

 const machine=new T.Group();machine.position.set(0,-27,0);world.add(machine);
 const rotor=new T.Group();machine.add(rotor);
 for(const y of [-2.15,-1.93,1.8,2.08]){
  const plate=mesh(new T.CylinderGeometry(y>0?2.22:1.94,y>0?2.16:1.98,.12,80,1,false),y>0?rose:dark,rotor,[0,y,0]);opaque.push(plate);
  torus(rotor,y>0?2.22:1.98,.035,chrome,[0,y,0],true);torus(rotor,y>0?1.95:1.72,.018,glow,[0,y+.07,0],true);
 }
 for(let i=0;i<12;i++){
  const a=i*Math.PI/6,r=i%2?1.76:1.9;
  const support=mesh(new T.CylinderGeometry(.022,.028,3.7,6),i%3?rose:chrome,machine,[Math.cos(a)*r,-.05,Math.sin(a)*r]);opaque.push(support);
 }
 for(let i=0;i<(mobile?12:20);i++){
  const a=i*.53,r=1.45+i%3*.25;
  const pts=[[Math.cos(a)*r,2.1,Math.sin(a)*r],[Math.cos(a+.3)*(r+.6),.8,Math.sin(a+.3)*(r+.6)],[Math.cos(a-.2)*r,-.8,Math.sin(a-.2)*r],[Math.cos(a)*1.55,-1.9,Math.sin(a)*1.55]];
  machine.add(tube(pts,i%4===0?.027:.012,i%3?rose:silver,64));
 }
 const floorGeo=new T.CircleGeometry(4.3,96);const fp=floorGeo.attributes.position;for(let i=1;i<fp.count;i++){const x=fp.getX(i),y=fp.getY(i);fp.setZ(i,.025*Math.sin(x*4)*Math.cos(y*5));}floorGeo.computeVertexNormals();
 const floor=mesh(floorGeo,new T.MeshPhysicalMaterial({color:0x08040c,metalness:.85,roughness:.24,clearcoat:1,envMapIntensity:.25}),machine,[0,-2.27,0]);floor.rotation.x=-Math.PI/2;
 for(let i=0;i<5;i++){const r=2.65+i*.46;const pts=[];for(let j=0;j<=100;j++){const a=j/100*Math.PI*2;pts.push([Math.cos(a)*r,-2.25+.09*Math.sin(a*8+i),Math.sin(a)*r]);}machine.add(tube(pts,.016,i%2?rose:dark,100,true));}

 const lab=new T.Group();lab.position.set(0,-40,0);world.add(lab);
 const hex=new T.Shape(),hole=new T.Path(),r=.205;for(let i=0;i<=6;i++){const a=i/6*Math.PI*2;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?hex.lineTo(x,y):hex.moveTo(x,y);}for(let i=0;i<=6;i++){const a=-i/6*Math.PI*2;const x=Math.cos(a)*r*.83,y=Math.sin(a)*r*.83;i?hole.lineTo(x,y):hole.moveTo(x,y);}hex.holes.push(hole);
 const cells=[];for(let col=-12;col<=12;col++)for(let row=-6;row<=6;row++){
  const x=col*r*1.5,y=(row+(Math.abs(col)%2)*.5)*r*Math.sqrt(3);
  if(Math.hypot(x+3.5,y-.15)<.7)continue;
  cells.push([x,y,Math.cos(x*.8)*.17]);
 }
 const grid=new T.InstancedMesh(new T.ExtrudeGeometry(hex,{depth:.085,bevelEnabled:false,curveSegments:1}),dark.clone(),cells.length),dummy=new T.Object3D();
 cells.forEach((p,i)=>{dummy.position.fromArray(p);dummy.rotation.y=Math.sin(p[0]*.8)*.12;dummy.updateMatrix();grid.setMatrixAt(i,dummy.matrix);});lab.add(grid);opaque.push(grid);
 const frame=[];for(let i=0;i<=6;i++){const a=i/6*Math.PI*2;frame.push([Math.cos(a)*3.9,Math.sin(a)*2.5,-.05]);}lab.add(tube(frame,.06,chrome,72,true));
 torus(lab,.72,.045,chrome,[-3.5,.15,.04]);torus(lab,.8,.02,silver,[-3.5,.15,.05]);
 const disc=torus(lab,.37,.025,silver,[0,-.15,.28]);
 lab.add(tube([[0,-.4,.3],[0,.1,.3]],.023,silver,8));lab.add(tube([[-.25,-.15,.3],[.25,-.15,.3]],.023,silver,8));
 const backdrop=mesh(new T.PlaneGeometry(8,5),new T.MeshStandardMaterial({color:0x040a0d,metalness:.45,roughness:.5}),lab,[0,0,-.11]);
 lab.rotation.y=-.16;lab.rotation.z=.055;
 return {world,emblem,lens,arcs,intro,gallery,spine,tendrils,cardDeck,cards,machine,rotor,lab,pickables,opaque,textures,materials:{chrome,dark,rose},dispose(){world.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();});textures.forEach(t=>t.dispose());}};
}

export function particleField(count,mobile=false){
 const random=seededRandom(4202426),position=new Float32Array(count*3),color=new Float32Array(count*3),meta=new Float32Array(count*3);
 const c=new T.Color();
 for(let i=0;i<count;i++){
  const region=i%4,t=random(),a=random()*Math.PI*2,s=random(),j=i*3;
  let x,y,z;
  if(region===0){const radius=.65+Math.pow(s,2)*1.45;x=(mobile?.4:2)+Math.sin(t*8)*radius;y=-.7-t*4.6;z=Math.cos(t*8)*radius; c.setHSL(.97+random()*.14,.82,.3+random()*.32);}
  else if(region===1){const radius=.8+Math.pow(s,3)*1.6,theta=t*18+(i%3)*2.094+(a-3.14)*.19;x=Math.cos(theta)*radius+.22*Math.sin(t*8);y=-13+(t-.5)*8;z=Math.sin(theta)*radius;c.setHSL(.48+random()*.37,.58,.26+random()*.35);}
  else if(region===2){const radius=Math.pow(s,.5)*.95,theta=a+t*6;x=Math.cos(theta)*radius;y=-27+(t-.5)*2.6;z=Math.sin(theta)*radius;c.setHSL(.91+random()*.08,.85,.35+random()*.32);}
  else{const u=t*12-6;x=u;y=1.2+Math.sin(u*.7)*.4+(s-.5)*.15;z=-3+Math.cos(u*.3)*.8;c.setHSL(.88+random()*.08,.7,.35+random()*.2);}
  const scatter=region===1?.2:.09;x+=(random()-.5)*scatter;y+=(random()-.5)*scatter;z+=(random()-.5)*scatter;
  position.set([x,y,z],j);color.set([c.r,c.g,c.b],j);meta.set([random(),region,random()],j);
 }
 return {position,color,meta};
}
