import * as T from 'three';
import {CARD_SPECS} from './space-path.js';
import {seededRandom} from './weave-math.js';
import {vertebraeGeometry,createDrapedGrid,drapePoint,membraneGeometry,flowingRibbonGeometry} from './space-forms.js';

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
function torus(parent,r,t,mat,pos=[0,0,0],horizontal=false){const m=mesh(new T.TorusGeometry(r,t,6,64),mat,parent,pos);if(horizontal)m.rotation.x=Math.PI/2;return m;}
function roundedShape(w,h,r){const s=new T.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;}
function setUV(geo,w,h){const p=geo.attributes.position,uv=new Float32Array(p.count*2);for(let i=0;i<p.count;i++){uv[i*2]=p.getX(i)/w+.5;uv[i*2+1]=p.getY(i)/h+.5;}geo.setAttribute('uv',new T.BufferAttribute(uv,2));return geo;}
function cardLines(spec){
 if(Array.isArray(spec.lines)&&spec.lines.length)return spec.lines;
 const title=spec.title||spec.id,words=title.split(/\s+/);
 if(title.length<=13||words.length<2)return [title];
 let split=1,balance=Infinity;
 for(let i=1;i<words.length;i++){const difference=Math.abs(words.slice(0,i).join(' ').length-words.slice(i).join(' ').length);if(difference<balance){balance=difference;split=i;}}
 return [words.slice(0,split).join(' '),words.slice(split).join(' ')];
}

export async function buildWorld({mobile=false,documentRef=document,onTexture=()=>{},yieldControl=()=>Promise.resolve()}={}){
 const world=new T.Group(),pickables=[],opaque=[],textures=[],cards=[];
 const chrome=new T.MeshPhysicalMaterial({color:0xa7b8bd,metalness:.8,roughness:.27,clearcoat:1,clearcoatRoughness:.18,iridescence:.9,iridescenceIOR:1.4,iridescenceThicknessRange:[180,520],envMapIntensity:1.5});
 const dark=new T.MeshStandardMaterial({color:0x10191c,metalness:.92,roughness:.3,envMapIntensity:1.1});
 const rose=new T.MeshPhysicalMaterial({color:0x531227,metalness:.9,roughness:.24,clearcoat:1,envMapIntensity:1.6});
 const silver=new T.MeshStandardMaterial({color:0xb3c5c3,metalness:.96,roughness:.24});
 const glow=new T.MeshBasicMaterial({color:0x842447,toneMapped:true});
 const glass=new T.MeshPhysicalMaterial({color:0x9eadaa,metalness:.61,roughness:.16,transmission:0,thickness:.3,ior:1.46,clearcoat:1,clearcoatRoughness:.1,iridescence:.85,iridescenceIOR:1.35,iridescenceThicknessRange:[180,460],envMapIntensity:1.65});
 const emblem=new T.Group();emblem.position.set(2,0,0);world.add(emblem);
 const lens=new T.Group();emblem.add(lens);
 // A rounded rectangular section gives the ring a broad reflective face and a fine bevel.
 // Reuse the existing vertex budget; the sheen does not require another transmission pass.
 const ringGeo=new T.TorusGeometry(1.12,.108,20,128),ringPosition=ringGeo.attributes.position;
 for(let i=0;i<ringPosition.count;i++){
  const u=i%129/128*Math.PI*2,v=Math.floor(i/129)/20*Math.PI*2;
  const radial=1.12+.118*Math.sign(Math.cos(v))*Math.abs(Math.cos(v))**.43;
  ringPosition.setXYZ(i,Math.cos(u)*radial,Math.sin(u)*radial,.158*Math.sign(Math.sin(v))*Math.abs(Math.sin(v))**.43);
 }
 ringGeo.computeVertexNormals();
 const rim=mesh(ringGeo,glass,lens);opaque.push(rim);
 torus(lens,1.225,.007,silver,[0,0,.125]);torus(lens,1.018,.006,rose,[0,0,.125]);
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
 const introTexture=canvasTexture(1536,1024,c=>{c.clearRect(0,0,1536,1024);c.fillStyle='#e2e9e5';c.font='300 188px "Consolas", "Courier New", monospace';['CODE','PLAY','CREATE'].forEach((s,i)=>c.fillText(s,26,235+i*216));});
 const intro=mesh(new T.PlaneGeometry(5.8,3.87),new T.MeshBasicMaterial({map:introTexture.texture,transparent:true,depthWrite:false,opacity:0}),world,[-.8,.5,-3]);

 const gallery=new T.Group();gallery.position.y=-13;world.add(gallery);
 const coverLoaders=[];let coversLoaded=false;
 const coreMaterial=chrome.clone();coreMaterial.metalness=.87;coreMaterial.roughness=.23;coreMaterial.envMapIntensity=1.8;coreMaterial.color.set(0x829aa3);
 const spine=mesh(vertebraeGeometry(mobile),coreMaterial,gallery);opaque.push(spine);
 // Irregular crystal fragments cling to the structure, rather than a uniform star background.
 const fragmentCount=mobile?260:780,fragments=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),chrome,fragmentCount),fragmentDummy=new T.Object3D(),rand=seededRandom(9087),tint=new T.Color();
 for(let i=0;i<fragmentCount;i++){
  const y=rand()*8-4,a=y*1.7+rand()*.8+(i%3)*2.094,r=.8+rand()*.35;
  fragmentDummy.position.set(Math.cos(a)*r+.22*Math.sin(y),y,Math.sin(a)*r);
  fragmentDummy.rotation.set(rand()*3,rand()*3,rand()*3);const s=.013+Math.pow(rand(),3)*.085;fragmentDummy.scale.set(s,s*(1+rand()),s);fragmentDummy.updateMatrix();fragments.setMatrixAt(i,fragmentDummy.matrix);
  tint.setHSL(.49+rand()*.36,.45,.25+rand()*.2);fragments.setColorAt(i,tint);
 }gallery.add(fragments);
 const chainCount=mobile?64:112,chain=new T.InstancedMesh(new T.TorusGeometry(.105,.022,5,12),chrome,chainCount);
 for(let i=0;i<chainCount;i++){
  const y=(i/(chainCount-1)-.5)*9,a=y*.72;
  fragmentDummy.position.set(Math.cos(a)*1.05,y,Math.sin(a)*1.05);fragmentDummy.rotation.set(.2,a+(i%2)*Math.PI/2,.15);fragmentDummy.scale.set(1,1.5,1);fragmentDummy.updateMatrix();chain.setMatrixAt(i,fragmentDummy.matrix);
 }gallery.add(chain);
 const tendrils=new T.Group();gallery.add(tendrils);
 for(let k=0;k<3;k++){
  const pts=[];for(let j=0;j<=100;j++){const y=j/100*8-4,a=y*(.85+k*.07)+k*.9,r=.75+.22*Math.sin(y*2+k);pts.push([Math.cos(a)*r,y,Math.sin(a)*r]);}
  tendrils.add(tube(pts,k%2?.013:.028,k%3?dark:chrome,mobile?80:120));
 }
 for(let j=0;j<6;j++){
  const m=torus(gallery,.65+.14*Math.sin(j*1.5),.018,chrome,[.12*Math.sin(j),j*.48-3.6,0],true);m.rotation.z=.4*Math.sin(j*2);
 }
 const cardDeck=new T.Group();gallery.add(cardDeck);
 const cardTints=[0x63536e,0x496767,0x6e5544,0x455665,0x586751,0x67546b,0x4b6265];
 for(const [cardIndex,spec] of CARD_SPECS.entries()){
  const group=new T.Group();group.position.fromArray(spec.position);group.rotation.y=spec.rotation;group.scale.setScalar(mobile?1.05:1.22);cardDeck.add(group);
  if(mobile&&spec.id==='tower')group.position.set(0,.6,3.2);
  const shape=roundedShape(3.5,2.3,.115),backMaterial=new T.MeshPhysicalMaterial({color:cardTints[cardIndex%cardTints.length],metalness:.24,roughness:.36,clearcoat:.85,clearcoatRoughness:.22,iridescence:.18,transparent:true,opacity:.31,depthWrite:false,envMapIntensity:.7});
  const base=mesh(extruded(shape,.055,.012,8),backMaterial,group,[0,0,-.04]);
  const frameShape=roundedShape(3.526,2.326,.128);frameShape.holes.push(roundedShape(3.5,2.3,.115));
  const edgeMaterial=chrome.clone();edgeMaterial.roughness=.34;edgeMaterial.metalness=.68;edgeMaterial.envMapIntensity=.85;
  const edge=mesh(extruded(frameShape,.032,.005,8),edgeMaterial,group,[0,0,-.05]);
  let cover;
  const draw=c=>{
   c.clearRect(0,0,1280,840);c.fillStyle='rgba(25,35,43,.23)';c.fillRect(0,0,1280,840);
   if(cover){const scale=Math.max(1280/cover.width,840/cover.height);c.globalAlpha=.3;c.drawImage(cover,(1280-cover.width*scale)/2,(840-cover.height*scale)/2,cover.width*scale,cover.height*scale);c.globalAlpha=1;}
   // Non-public HMI and planned work use honest typographic covers, never fabricated UI.
   if(!spec.image){c.strokeStyle=spec.id==='boe'?'#447b79':'#6a587b';c.lineWidth=1;for(let i=0;i<7;i++){c.beginPath();c.ellipse(940,410,110+i*45,160+i*27,-.3,0,Math.PI*2);c.stroke();}}
   const shade=c.createLinearGradient(0,0,0,840);shade.addColorStop(0,'rgba(4,10,14,.08)');shade.addColorStop(.48,'rgba(4,10,14,.48)');shade.addColorStop(1,'rgba(4,10,14,.15)');c.fillStyle=shade;c.fillRect(0,0,1280,840);
   c.textAlign='center';c.fillStyle='#c9d8d4';c.font='24px "Consolas", "Courier New", monospace';c.fillText(spec.subtitle||'',640,250,1100);
   c.fillStyle='#eff3ed';c.font='300 92px "Consolas", "Courier New", monospace';
   const lines=cardLines(spec),lineHeight=105,firstLine=445-(lines.length-1)*lineHeight/2;
   c.shadowColor='rgba(4,10,14,.7)';c.shadowBlur=14;
   lines.forEach((line,i)=>c.fillText(line,640,firstLine+i*lineHeight,1090));
   c.shadowBlur=0;c.fillStyle='#c3d5d1';c.font='25px "Microsoft YaHei", sans-serif';c.fillText(spec.note||'',640,637,1080);c.textAlign='left';
  };
  const surface=canvasTexture(1280,840,draw);
  const face=mesh(setUV(new T.ShapeGeometry(shape,8),3.5,2.3),new T.MeshBasicMaterial({map:surface.texture,side:T.FrontSide,transparent:true,opacity:.96,depthWrite:false}),group,[0,0,.044]);
  face.userData.detail=spec.id;pickables.push(face);opaque.push(base,edge);
  cards.push({group,face,edge,base,spec,hover:0,home:group.position.clone()});
  if(spec.image)coverLoaders.push(()=>{const img=new Image();img.crossOrigin='anonymous';img.decoding='async';img.onload=()=>{cover=img;draw(surface.ctx);surface.texture.needsUpdate=true;onTexture();};img.onerror=()=>console.warn('Gallery cover unavailable:',spec.image);img.src=spec.image;});
  await yieldControl();
 }

 await yieldControl();
 const machine=new T.Group();machine.position.set(0,-24,0);world.add(machine);
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
  machine.add(tube(pts,i%4===0?.027:.012,i%3?rose:silver,mobile?32:44));
 }
 // Loose cables sag away from the upper assembly at different lengths and heights.
 for(let i=0;i<(mobile?5:8);i++){
  const side=i<3?-1:1,reach=2.55+(i%3)*.35,anchorY=1.65-(i%4)*.22,z=-.25+(i%3)*.37;
  machine.add(tube([[side*1.55,anchorY,z],[side*2.05,anchorY-.62,z+.18],[side*reach,anchorY-.75+(i%2)*.16,z-.14],[side*(reach+.35),anchorY-.12+(i%3)*.17,z-.35]],i%3===0?.017:.009,i%3?rose:silver,mobile?20:28));
 }
 const floor=mesh(membraneGeometry(),new T.MeshPhysicalMaterial({color:0x142023,metalness:.94,roughness:.27,clearcoat:1,iridescence:.45,envMapIntensity:.8,side:T.DoubleSide}),machine,[0,-2.8,0]);floor.rotation.x=-Math.PI/2;floor.name="machine-membrane";
 for(let i=0;i<5;i++){const r=2.65+i*.46;const pts=[];for(let j=0;j<=100;j++){const a=j/100*Math.PI*2;pts.push([Math.cos(a)*r,-2.25+.09*Math.sin(a*8+i),Math.sin(a)*r]);}machine.add(tube(pts,.016,i%2?rose:dark,100,true));}

 await yieldControl();
 const lab=new T.Group();lab.position.set(0,-34,0);world.add(lab);
 const gridMaterial=new T.MeshPhysicalMaterial({color:0xd2dbd5,metalness:.87,roughness:.38,clearcoat:1,iridescence:.3,iridescenceThicknessRange:[240,410],envMapIntensity:.65});
 const grid=createDrapedGrid(gridMaterial,mobile);lab.add(grid);opaque.push(grid);
 // Keep the complete marker in front of the relief, including the bevels.
 grid.computeBoundingBox();
 const labMarker=new T.Group();labMarker.name='lab-marker';
 labMarker.position.set(0,-.05,grid.boundingBox.max.z+.25);lab.add(labMarker);
 torus(labMarker,.59,.025,silver);
 labMarker.add(tube([[0,-.39,.02],[0,.39,.02]],.035,silver,8));labMarker.add(tube([[-.39,0,.02],[.39,0,.02]],.035,silver,8));
 const backdropGeo=new T.PlaneGeometry(8.2,4.9,48,24),backPos=backdropGeo.attributes.position,sample=new T.Vector3();for(let i=0;i<backPos.count;i++){drapePoint(backPos.getX(i),backPos.getY(i),sample);backPos.setXYZ(i,sample.x,sample.y,sample.z-.09);}backdropGeo.computeVertexNormals();
 const backdrop=mesh(backdropGeo,new T.MeshStandardMaterial({color:0x040a0d,metalness:.45,roughness:.5}),lab);
 lab.rotation.y=-.16;lab.rotation.z=.055;
 const ribbonUniforms={uTime:{value:0},uOpacity:{value:0}};
 const ribbonMaterial=new T.ShaderMaterial({uniforms:ribbonUniforms,transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,vertexShader:'uniform float uTime;varying vec2 vUv;void main(){vUv=uv;vec3 p=position;p.y+=sin(uv.x*18.-uTime*.7)*.12;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',fragmentShader:'uniform float uTime,uOpacity;varying vec2 vUv;void main(){float edge=pow(sin(vUv.y*3.14159),3.);float vein=pow(max(0.,1.-abs(vUv.y-.5-sin(vUv.x*25.-uTime*.4)*.15)*5.),5.);float fade=sin(vUv.x*3.14159);float fibers=pow(.5+.5*sin(vUv.y*92.+sin(vUv.x*12.)*5.),14.);vec3 col=mix(vec3(.32,.008,.055),vec3(.95,.68,.61),max(vein*.85,fibers));gl_FragColor=vec4(col,edge*fade*uOpacity*(.52+vein*.35+fibers*.3));\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'});
 const ribbons=new T.Group();emblem.add(ribbons);for(let k=0;k<2;k++)ribbons.add(new T.Mesh(flowingRibbonGeometry(k*.8),ribbonMaterial));
 return {world,emblem,lens,arcs,jellyfish,streamers,flowUniforms,ribbons,ribbonUniforms,intro,gallery,spine,tendrils,cardDeck,cards,machine,rotor,lab,pickables,opaque,textures,loadCovers(){if(!coversLoaded){coversLoaded=true;coverLoaders.forEach(load=>load());}},materials:{chrome,dark,rose},dispose(){world.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();});textures.forEach(t=>t.dispose());}};
}

export function particleField(count,mobile=false){
 const random=seededRandom(4202426),position=new Float32Array(count*3),color=new Float32Array(count*3),meta=new Float32Array(count*3);
 const c=new T.Color();
 for(let i=0;i<count;i++){
  const region=i%4,t=random(),a=random()*Math.PI*2,s=random(),j=i*3;
  let x,y,z;
  if(region===0){const radius=.8+Math.pow(s,2)*1.3,branch=i%2?1:-1;x=(mobile?.4:2)+branch*Math.sin(t*5.7)*radius;y=-.75-t*4.9;z=Math.cos(t*5.7)*radius+.25;c.setHSL(.015+random()*.085,.75,.3+random()*.38);}
  else if(region===1){const cluster=Math.floor(t*7),v=(cluster+.5)/7+(random()+random()+random()-1.5)*.12;const radius=2.25+Math.sin(v*15)*.6+(s-.5)*1.3,theta=v*13+(i%3)*2.094+(a-3.14)*.19;x=Math.cos(theta)*radius;y=-13+(v-.5)*10;z=Math.sin(theta)*radius-1.15;c.setHSL(.47+random()*.42,.5,.25+random()*.4);}
  else if(region===2){
   const lobe=t<.57?0:1,v=lobe?(t-.57)/.43:t/.57,latitude=v*Math.PI;
   const centerX=lobe?.35:-.3,centerY=lobe?.25:-.16,theta=a+v*2.8;
   const shape=1+.16*Math.sin(theta*3+v*8)+.09*Math.sin(theta*7-v*11);
   const radius=Math.sin(latitude)*Math.pow(s,.32)*shape;
   x=centerX+Math.cos(theta)*radius*(lobe?.63:.77);
   y=-24+centerY+Math.cos(latitude)*(lobe?.88:.68)+.12*Math.sin(theta*2)*radius;
   z=Math.sin(theta)*radius*(lobe?.63:.72)+.08*Math.sin(v*9);
   c.setHSL(.87+random()*.115,.84,.27+random()*.31);
  }
  else{const theta=t*Math.PI*2,radius=2.4+Math.sin(t*17)*.6+(s-.5)*1.1;x=(mobile?.4:2)+Math.cos(theta)*radius;y=-1+Math.sin(theta)*radius;z=-1+(random()-.5)*1.9;c.setHSL(.005+Math.pow(random(),2)*.09,.8,.24+random()*.32);}
  const scatter=region===1?.2:.09;x+=(random()-.5)*scatter;y+=(random()-.5)*scatter;z+=(random()-.5)*scatter;
  position.set([x,y,z],j);color.set([c.r,c.g,c.b],j);meta.set([random(),region,random()],j);
 }
 return {position,color,meta};
}

