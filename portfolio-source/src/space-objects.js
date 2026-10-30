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

export async function buildWorld({mobile=false,documentRef=document,onTexture=()=>{},yieldControl=()=>Promise.resolve()}={}){
 const world=new T.Group(),pickables=[],opaque=[],textures=[],cards=[];
 const chrome=new T.MeshPhysicalMaterial({color:0xa7b8bd,metalness:.8,roughness:.27,clearcoat:1,clearcoatRoughness:.18,iridescence:.9,iridescenceIOR:1.4,iridescenceThicknessRange:[180,520],envMapIntensity:1.5});
 const dark=new T.MeshStandardMaterial({color:0x10191c,metalness:.92,roughness:.3,envMapIntensity:1.1});
 const rose=new T.MeshPhysicalMaterial({color:0x531227,metalness:.9,roughness:.24,clearcoat:1,envMapIntensity:1.6});
 const silver=new T.MeshStandardMaterial({color:0xb3c5c3,metalness:.96,roughness:.24});
 const glow=new T.MeshBasicMaterial({color:0x842447,toneMapped:true});
 const glass=new T.MeshPhysicalMaterial({color:0x78979f,metalness:.62,roughness:.23,transmission:0,thickness:.3,ior:1.46,clearcoat:1,iridescence:1,iridescenceIOR:1.35,iridescenceThicknessRange:[180,460],envMapIntensity:1.8});
 const emblem=new T.Group();emblem.position.set(2,0,0);world.add(emblem);
 const lens=new T.Group();emblem.add(lens);
 // Elliptical tube cross section: changing normals create a narrow, angle-dependent highlight.
 const ringGeo=new T.TorusGeometry(1.12,.108,20,128);ringGeo.scale(1,1,1.5);
 const rim=mesh(ringGeo,glass,lens);opaque.push(rim);
 torus(lens,1.21,.012,silver,[0,0,.12]);torus(lens,1.045,.01,rose,[0,0,.13]);
 // Original ZY monogram, not the reference studio's trademark.
 // Z follows one rounded, folding stroke. Varying depth reveals a continuous chrome surface.
 const zCurve=new T.CatmullRomCurve3([[-.49,.4,.03],[.04,.43,.12],[.47,.37,.04],[.25,.12,-.05],[-.3,-.28,.07],[-.43,-.4,.17],[.02,-.45,.2],[.49,-.36,.05]].map(p=>new T.Vector3(...p)),false,'centripetal');
 const zGeo=new T.TubeGeometry(zCurve,96,.079,12,false);zGeo.scale(1,1,1.45);const zMark=mesh(zGeo,chrome,lens);opaque.push(zMark);
 lens.add(tube([[-.36,.68,-.08],[0,.28,.06],[.38,.67,-.08]],.03,silver,30));
 lens.rotation.y=-.3;lens.rotation.z=-.08;
 const arcs=new T.Group();emblem.add(arcs);
 for(let k=0;k<2;k++){
  const pts=[];for(let i=0;i<=80;i++){const t=i/80;pts.push([(k?1:-1)*Math.sin(t*Math.PI*1.37)*1.13,-.48-t*4.4,Math.cos(t*Math.PI*2+k)*.4]);}
  arcs.add(tube(pts,.014,k?rose:chrome,160));
 }
 const jellyfish=[];
 for(let j=0;j<2;j++){
  const jelly=new T.Group();jelly.position.set(j?3.05:-2.25,j?-1.45:mobile?-.7:2.2,j?-2.5:-1.9);jelly.scale.setScalar(mobile?.46:j?.55:.72);jelly.rotation.z=j?-.24:.14;emblem.add(jelly);
  const profile=[];for(let n=0;n<=24;n++){const a=n/24*Math.PI*.51;profile.push(new T.Vector2(.55*Math.sin(a)*(1+.025*Math.sin(a*8)),.72*Math.cos(a)));}
  const membrane=new T.MeshPhysicalMaterial({color:j?0x6dbbbf:0x8c254e,metalness:.5,roughness:.2,clearcoat:1,iridescence:1,iridescenceThicknessRange:[220,480],transparent:true,opacity:.36,depthWrite:false,side:T.DoubleSide,envMapIntensity:1.15});
  const bell=mesh(new T.LatheGeometry(profile,mobile?24:40),membrane,jelly);torus(jelly,.55,.014,j?chrome:rose,[0,0,0],true);
  const strands=new T.Group();jelly.add(strands);
  for(let k=0;k<(mobile?6:10);k++){const a=k/10*Math.PI*2,r=.2+(k%3)*.12,pts=[];for(let n=0;n<=20;n++){const t=n/20;pts.push([Math.cos(a)*r+Math.sin(t*6+k)*.07*t,-t*(1.5+(k%3)*.32),Math.sin(a)*r+Math.cos(t*5+k)*.07*t]);}strands.add(tube(pts,k%3===0?.009:.004,j?chrome:rose,40));}
  jellyfish.push({group:jelly,bell,strands,base:jelly.position.clone(),scale:jelly.scale.x,phase:j*2.4});
 }
 const flowUniforms={uTime:{value:0},uEnergy:{value:0},uColor:{value:new T.Color(0xb3d8d9)}};
 const flowMaterial=new T.ShaderMaterial({uniforms:flowUniforms,transparent:true,depthWrite:false,vertexShader:'varying float vAlong;void main(){vAlong=uv.x;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform float uTime,uEnergy;uniform vec3 uColor;varying float vAlong;void main(){float p=fract(vAlong-uTime*.16);float a=pow(1.-p,16.);gl_FragColor=vec4(uColor*(.7+a*.7),(.08+a*.65)*(1.+uEnergy*.3));\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'});
 const streamers=new T.Group();emblem.add(streamers);
 for(let k=0;k<(mobile?5:11);k++){const x=2.6+k*.22,y=1.4+k*.13,z=-1-k*.45;streamers.add(tube([[x+1.8,y+2,z-3],[x+.9,y+.7,z-1.5],[x,y,z],[x-.6,y-1.2,z+1]],k%3?.006:.013,flowMaterial,42));}
 await yieldControl();

 function canvasTexture(width,height,draw){
  const canvas=documentRef.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');draw(ctx,canvas);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;textures.push(texture);return {canvas,ctx,texture};
 }
 const introTexture=canvasTexture(1536,1024,c=>{c.clearRect(0,0,1536,1024);c.fillStyle='#e2e9e5';c.font='200 188px "Segoe UI", sans-serif';['CODE','PLAY','CREATE'].forEach((s,i)=>c.fillText(s,26,235+i*216));});
 const intro=mesh(new T.PlaneGeometry(4.8,3.2),new T.MeshBasicMaterial({map:introTexture.texture,transparent:true,depthWrite:false,opacity:0}),world,[-.8,.5,-3]);

 const gallery=new T.Group();gallery.position.y=-13;world.add(gallery);
 const coverLoaders=[];let coversLoaded=false;
 // Corrugated, twisted shell rather than a smooth tube: real silhouette and surface normals.
 const seg=mobile?40:64,rows=mobile?100:180,positions=[],indices=[];
 for(let j=0;j<=rows;j++)for(let i=0;i<=seg;i++){
  const y=(j/rows-.5)*8,a=i/seg*Math.PI*2+y*.62;
  const radius=.72+.19*Math.sin(y*2.7+a*3)+.2*Math.cos(a*4+y*1.6)+.085*Math.sin(a*7-y*2.1);
  positions.push(Math.cos(a)*radius*(1+.35*Math.sin(y*1.6))+.22*Math.sin(y*.91),y*1.2,Math.sin(a)*radius+.18*Math.cos(y*1.3));
 }
 for(let j=0;j<rows;j++)for(let i=0;i<seg;i++){const a=j*(seg+1)+i,b=a+seg+1;indices.push(a,b,a+1,b,b+1,a+1);}
 const shellGeo=new T.BufferGeometry();shellGeo.setAttribute('position',new T.Float32BufferAttribute(positions,3));shellGeo.setIndex(indices);shellGeo.computeVertexNormals();
 const coreMaterial=chrome.clone();coreMaterial.metalness=.64;coreMaterial.roughness=.29;coreMaterial.envMapIntensity=1.8;coreMaterial.color.set(0x718a93);
 const spine=mesh(shellGeo,coreMaterial,gallery);opaque.push(spine);
 // Irregular crystal fragments cling to the structure, rather than a uniform star background.
 const fragmentCount=mobile?260:780,fragments=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),chrome,fragmentCount),fragmentDummy=new T.Object3D(),rand=seededRandom(9087),tint=new T.Color();
 for(let i=0;i<fragmentCount;i++){
  const y=rand()*8-4,a=y*1.7+rand()*.8+(i%3)*2.094,r=.8+rand()*.35;
  fragmentDummy.position.set(Math.cos(a)*r+.22*Math.sin(y),y,Math.sin(a)*r);
  fragmentDummy.rotation.set(rand()*3,rand()*3,rand()*3);const s=.013+Math.pow(rand(),3)*.085;fragmentDummy.scale.set(s,s*(1+rand()),s);fragmentDummy.updateMatrix();fragments.setMatrixAt(i,fragmentDummy.matrix);
  tint.setHSL(.49+rand()*.36,.45,.25+rand()*.2);fragments.setColorAt(i,tint);
 }gallery.add(fragments);
 const tendrils=new T.Group();gallery.add(tendrils);
 for(let k=0;k<3;k++){
  const pts=[];for(let j=0;j<=100;j++){const y=j/100*8-4,a=y*(.85+k*.07)+k*.9,r=.75+.22*Math.sin(y*2+k);pts.push([Math.cos(a)*r,y,Math.sin(a)*r]);}
  tendrils.add(tube(pts,k%2?.013:.028,k%3?dark:chrome,mobile?80:120));
 }
 for(let j=0;j<6;j++){
  const m=torus(gallery,.65+.14*Math.sin(j*1.5),.018,chrome,[.12*Math.sin(j),j*.48-3.6,0],true);m.rotation.z=.4*Math.sin(j*2);
 }
 const cardDeck=new T.Group();gallery.add(cardDeck);
 for(const spec of CARD_SPECS){
  const group=new T.Group();group.position.fromArray(spec.position);group.rotation.y=spec.rotation;group.scale.setScalar(.92);cardDeck.add(group);
  const shape=roundedShape(3.5,2.3,.105),backMaterial=dark.clone();backMaterial.transparent=true;backMaterial.opacity=.25;backMaterial.depthWrite=false;
  const base=mesh(extruded(shape,.055,.018,mobile?8:16),backMaterial,group,[0,0,-.04]);
  const frameShape=roundedShape(3.55,2.35,.115);frameShape.holes.push(roundedShape(3.47,2.27,.08));
  const edge=mesh(extruded(frameShape,.035,.012,mobile?8:16),chrome.clone(),group,[0,0,-.07]);
  let cover;
  const draw=c=>{
   c.clearRect(0,0,1280,840);c.fillStyle='rgba(15,28,33,.54)';c.fillRect(0,0,1280,840);
   if(cover){const scale=Math.max(1280/cover.width,840/cover.height);c.globalAlpha=.63;c.drawImage(cover,(1280-cover.width*scale)/2,(840-cover.height*scale)/2,cover.width*scale,cover.height*scale);c.globalAlpha=1;}
   // Non-public HMI and planned work use honest typographic covers, never fabricated UI.
   if(!spec.image){c.strokeStyle=spec.id==='boe'?'#447b79':'#6a587b';c.lineWidth=1;for(let i=0;i<7;i++){c.beginPath();c.ellipse(940,410,110+i*45,160+i*27,-.3,0,Math.PI*2);c.stroke();}}
   const shade=c.createLinearGradient(0,0,0,840);shade.addColorStop(0,'rgba(4,10,14,.12)');shade.addColorStop(.5,'rgba(4,10,14,.42)');shade.addColorStop(1,'rgba(4,10,14,.45)');c.fillStyle=shade;c.fillRect(0,0,1280,840);
   c.textAlign='center';c.fillStyle='#d1dfdb';c.font='27px "Segoe UI", sans-serif';c.fillText(spec.subtitle,640,240);
   c.fillStyle='#eff3ed';c.font='300 100px "Segoe UI", sans-serif';
   const lines=spec.id==='tower'?['TOWER','DEFENSE']:spec.id==='boe'?['HUMAN','MACHINE']:spec.id==='ae'?['MOTION','& FILM']:['THE LAB'];
   lines.forEach((line,i)=>c.fillText(line,640,lines.length===1?455:390+i*115,1120));
   c.fillStyle='#c3d5d1';c.font='28px "Microsoft YaHei", sans-serif';c.fillText(spec.note,640,650,1120);c.textAlign='left';
   c.strokeStyle='#aac7c066';c.strokeRect(24,24,1232,792);
  };
  const surface=canvasTexture(1280,840,draw);
  const face=mesh(setUV(new T.ShapeGeometry(shape,8),3.5,2.3),new T.MeshBasicMaterial({map:surface.texture,side:T.FrontSide,transparent:true,opacity:.86,depthWrite:false}),group,[0,0,.044]);
  face.userData.detail=spec.id;pickables.push(face);opaque.push(base,edge);
  cards.push({group,face,edge,base,spec,hover:0,home:group.position.clone()});
  if(spec.image)coverLoaders.push(()=>{const img=new Image();img.decoding='async';img.onload=()=>{cover=img;draw(surface.ctx);surface.texture.needsUpdate=true;onTexture();};img.onerror=()=>console.warn('Gallery cover unavailable:',spec.image);img.src=spec.image;});
  await yieldControl();
 }

 await yieldControl();
 const machine=new T.Group();machine.position.set(0,-27,0);world.add(machine);
 const rotor=new T.Group();machine.add(rotor);
 for(const y of [-2.15,-1.93,1.8,2.08]){
  const plate=mesh(extruded(ringShape(y>0?2.22:1.98,y>0?1.84:1.62),.09,.015,48),y>0?rose:dark,rotor,[0,y,0]);plate.rotation.x=-Math.PI/2;opaque.push(plate);
  torus(rotor,y>0?2.22:1.98,.035,chrome,[0,y,0],true);torus(rotor,y>0?1.95:1.72,.018,glow,[0,y+.07,0],true);
 }
 for(let i=0;i<12;i++){
  const a=i*Math.PI/6,r=i%2?1.76:1.9;
  const support=mesh(new T.BoxGeometry(i%3?.036:.065,3.7,.055),i%6?rose:dark,machine,[Math.cos(a)*r,-.05,Math.sin(a)*r]);support.rotation.y=-a;opaque.push(support);
 }
 for(let i=0;i<(mobile?12:20);i++){
  const a=i*.53,r=1.45+i%3*.25;
  const pts=[[Math.cos(a)*r,2.1,Math.sin(a)*r],[Math.cos(a+.3)*(r+.6),.8,Math.sin(a+.3)*(r+.6)],[Math.cos(a-.2)*r,-.8,Math.sin(a-.2)*r],[Math.cos(a)*1.55,-1.9,Math.sin(a)*1.55]];
  machine.add(tube(pts,i%4===0?.027:.012,i%3?rose:silver,64));
 }
 const floorGeo=new T.CircleGeometry(4.3,96);const fp=floorGeo.attributes.position;for(let i=1;i<fp.count;i++){const x=fp.getX(i),y=fp.getY(i);fp.setZ(i,.025*Math.sin(x*4)*Math.cos(y*5));}floorGeo.computeVertexNormals();
 const floor=mesh(floorGeo,new T.MeshPhysicalMaterial({color:0x08040c,metalness:.85,roughness:.24,clearcoat:1,envMapIntensity:.25}),machine,[0,-2.27,0]);floor.rotation.x=-Math.PI/2;
 for(let i=0;i<5;i++){const r=2.65+i*.46;const pts=[];for(let j=0;j<=100;j++){const a=j/100*Math.PI*2;pts.push([Math.cos(a)*r,-2.25+.09*Math.sin(a*8+i),Math.sin(a)*r]);}machine.add(tube(pts,.016,i%2?rose:dark,100,true));}

 await yieldControl();
 const lab=new T.Group();lab.position.set(0,-40,0);world.add(lab);
 const hex=new T.Shape(),hole=new T.Path(),r=.205;for(let i=0;i<=6;i++){const a=i/6*Math.PI*2;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?hex.lineTo(x,y):hex.moveTo(x,y);}for(let i=0;i<=6;i++){const a=-i/6*Math.PI*2;const x=Math.cos(a)*r*.8,y=Math.sin(a)*r*.8;i?hole.lineTo(x,y):hole.moveTo(x,y);}hex.holes.push(hole);
 const cells=[];for(let col=-12;col<=12;col++)for(let row=-6;row<=6;row++){
  const x=col*r*1.5,y=(row+(Math.abs(col)%2)*.5)*r*Math.sqrt(3);
  if(Math.hypot(x+3.5,y-.15)<.7)continue;
  cells.push([x,y,.68*Math.cos(x*.65)]);
 }
 const gridMaterial=new T.MeshPhysicalMaterial({color:0x233438,metalness:.68,roughness:.32,clearcoat:1,iridescence:.65,iridescenceThicknessRange:[240,410],envMapIntensity:1.2});
 const grid=new T.InstancedMesh(new T.ExtrudeGeometry(hex,{depth:.16,bevelEnabled:false,curveSegments:1}),gridMaterial,cells.length),dummy=new T.Object3D();
 cells.forEach((p,i)=>{dummy.position.fromArray(p);dummy.rotation.y=Math.atan(.442*Math.sin(p[0]*.65));dummy.updateMatrix();grid.setMatrixAt(i,dummy.matrix);});lab.add(grid);opaque.push(grid);
 const frame=[];for(let i=0;i<=6;i++){const a=i/6*Math.PI*2;frame.push([Math.cos(a)*3.9,Math.sin(a)*2.5,-.05]);}lab.add(tube(frame,.06,chrome,72,true));
 torus(lab,.72,.045,chrome,[-3.5,.15,.04]);torus(lab,.8,.02,silver,[-3.5,.15,.05]);
 const disc=torus(lab,.37,.025,silver,[0,-.15,.28]);
 lab.add(tube([[0,-.4,.3],[0,.1,.3]],.023,silver,8));lab.add(tube([[-.25,-.15,.3],[.25,-.15,.3]],.023,silver,8));
 const backdropGeo=new T.PlaneGeometry(7.8,4.8,48,1),backPos=backdropGeo.attributes.position;for(let i=0;i<backPos.count;i++)backPos.setZ(i,.68*Math.cos(backPos.getX(i)*.65)-.13);backdropGeo.computeVertexNormals();
 const backdrop=mesh(backdropGeo,new T.MeshStandardMaterial({color:0x040a0d,metalness:.45,roughness:.5}),lab);
 lab.rotation.y=-.16;lab.rotation.z=.055;
 return {world,emblem,lens,arcs,jellyfish,streamers,flowUniforms,intro,gallery,spine,tendrils,cardDeck,cards,machine,rotor,lab,pickables,opaque,textures,loadCovers(){if(!coversLoaded){coversLoaded=true;coverLoaders.forEach(load=>load());}},materials:{chrome,dark,rose},dispose(){world.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();});textures.forEach(t=>t.dispose());}};
}

export function particleField(count,mobile=false){
 const random=seededRandom(4202426),position=new Float32Array(count*3),color=new Float32Array(count*3),meta=new Float32Array(count*3);
 const c=new T.Color();
 for(let i=0;i<count;i++){
  const region=i%4,t=random(),a=random()*Math.PI*2,s=random(),j=i*3;
  let x,y,z;
  if(region===0){const radius=.8+Math.pow(s,2)*1.3,branch=i%2?1:-1;x=(mobile?.4:2)+branch*Math.sin(t*5.7)*radius;y=-.75-t*4.9;z=Math.cos(t*5.7)*radius+.25;c.setHSL(.035+random()*.075,.75,.32+random()*.38);}
  else if(region===1){const radius=1.05+Math.pow(s,3)*1.15,theta=t*13+(i%3)*2.094+(a-3.14)*.12;x=Math.cos(theta)*radius+.22*Math.sin(t*8);y=-13+(t-.5)*9.6;z=Math.sin(theta)*radius;c.setHSL(.47+random()*.31,.42,.28+random()*.4);}
  else if(region===2){const cy=(t-.5)*2.65,radius=(.28+.48*Math.sin(t*Math.PI)**2+.24*Math.exp(-(((t-.22)*6)**2)))*Math.pow(s,.32),theta=a+t*7;x=Math.cos(theta)*radius+.16*Math.sin(t*5);y=-27+cy;z=Math.sin(theta)*radius;c.setHSL(.97+random()*.045,.92,.28+random()*.33);}
  else{const theta=t*Math.PI*1.65-.6,radius=1.8+(s-.5)*.24;x=(mobile?.4:2)+Math.sin(theta)*radius;y=.1+Math.cos(theta)*radius;z=-1.3+(random()-.5)*.35;c.setHSL(.47+random()*.34,.38,.26+random()*.3);}
  const scatter=region===1?.2:.09;x+=(random()-.5)*scatter;y+=(random()-.5)*scatter;z+=(random()-.5)*scatter;
  position.set([x,y,z],j);color.set([c.r,c.g,c.b],j);meta.set([random(),region,random()],j);
 }
 return {position,color,meta};
}
