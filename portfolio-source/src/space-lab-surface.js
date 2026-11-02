import * as T from 'three';

const fract=v=>v-Math.floor(v);
const hash=(x,y)=>fract(Math.sin(x*127.1+y*311.7)*43758.5453);
function noise(x,y){
 const ix=Math.floor(x),iy=Math.floor(y),u=fract(x),v=fract(y),a=u*u*(3-2*u),b=v*v*(3-2*v);
 return (1-a)*(1-b)*hash(ix,iy)+a*(1-b)*hash(ix+1,iy)+(1-a)*b*hash(ix,iy+1)+a*b*hash(ix+1,iy+1);
}

// Real PBR surface response: fine stamped-metal relief and variable polish.
// Shared small textures keep the mobile upload and texture sampling bounded.
export function createLabFinish(){
 const size=128,bump=new Uint8Array(size*size*4),polish=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=y/size,k=(y*size+x)*4;
  const grain=noise(u*23,v*23),hammer=noise(u*7.5,v*7.5),scratch=Math.pow(.5+.5*Math.sin(u*460+noise(u*3,v*8)*8),20);
  const height=Math.round(112+hammer*33+grain*10-scratch*5),rough=Math.round(155+hammer*63+grain*22);
  bump.set([height,height,height,255],k);polish.set([rough,rough,rough,255],k);
 }
 const textures=[bump,polish].map(data=>{const map=new T.DataTexture(data,size,size);map.wrapS=map.wrapT=T.RepeatWrapping;map.magFilter=T.LinearFilter;map.minFilter=T.LinearMipmapLinearFilter;map.generateMipmaps=true;map.needsUpdate=true;return map;});
 const material=new T.MeshPhysicalMaterial({color:0x9ba49f,metalness:.88,roughness:.36,clearcoat:.23,clearcoatRoughness:.32,iridescence:0,envMapIntensity:.5,bumpMap:textures[0],bumpScale:.065,roughnessMap:textures[1],side:T.DoubleSide});
 return {material,textures};
}

// A dedicated reflection field for the graphite LAB. Narrow broken light panels
// produce localized silver / pale gold / green reflections instead of flat cyan.
// This is original procedural lighting, not pixels taken from the reference.
export function createLabEnvironment(renderer){
 const width=512,height=256,data=new Float32Array(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const u=x/width,v=y/height,k=(y*width+x)*4;
  const grain=noise(u*76,v*45)*.55+noise(u*153,v*94)*.25+noise(u*21,v*17)*.2;
  const columns=20,rows=11,cx=Math.floor(u*columns),cy=Math.floor(v*rows),fx=fract(u*columns),fy=fract(v*rows);
  const window=(fx>.1&&fx<.92&&fy>.1&&fy<.94)?1:0;
  const fractured=.15+grain*grain*1.4;
  const silver=Math.exp(-(((u-.61)/.075)**2)-((v-.48)/.32)**2)*window*(.5+hash(cx,cy)*1.8)*fractured;
  const amber=Math.exp(-(((u-.24)/.13)**2)-((v-.35)/.3)**2)*window*(.3+hash(cx+6,cy)*.8)*fractured;
  const mint=Math.exp(-(((u-.47)/.016)**2)-((v-.5)/.23)**2)*(.3+grain)*1.5;
  const rim=Math.exp(-(((u-.83)/.012)**2)-((v-.38)/.32)**2)*(.2+grain)*1.2;
  const ceiling=Math.exp(-(((v-.17)/.035)**2))*(.2+.8*noise(u*28,1));
  data[k]=.004+silver*3.9+amber*1.2+mint*.12+rim*1.05+ceiling*.48;
  data[k+1]=.006+silver*4.05+amber*.91+mint*.4+rim*.65+ceiling*.45;
  data[k+2]=.006+silver*3.75+amber*.48+mint*.3+rim*.81+ceiling*.38;
  data[k+3]=1;
 }
 const texture=new T.DataTexture(data,width,height,T.RGBAFormat,T.FloatType);texture.mapping=T.EquirectangularReflectionMapping;texture.needsUpdate=true;
 const generator=new T.PMREMGenerator(renderer),target=generator.fromEquirectangular(texture);
 texture.dispose();generator.dispose();return target;
}

export async function loadLabEnvironment(renderer){
 const {labEnvironmentData}=await import('./lab-environment-data.js');
 const packed=Uint8Array.from(atob(labEnvironmentData),char=>char.charCodeAt(0));
 const stream=new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'));
 const rgbe=new Uint8Array(await new Response(stream).arrayBuffer()),data=new Float32Array(512*256*4);
 if(rgbe.length!==data.length)throw new Error('LAB environment payload has an invalid size');
 for(let i=0;i<rgbe.length;i+=4){const scale=2**(rgbe[i+3]-128)/256,peak=Math.max(rgbe[i],rgbe[i+1],rgbe[i+2])*scale,exposure=.8/(1+peak/4);for(let c=0;c<3;c++)data[i+c]=rgbe[i+c]*scale*exposure;data[i+3]=1;}
 const texture=new T.DataTexture(data,512,256,T.RGBAFormat,T.FloatType);texture.mapping=T.EquirectangularReflectionMapping;texture.needsUpdate=true;
 const generator=new T.PMREMGenerator(renderer),target=generator.fromEquirectangular(texture);
 texture.dispose();generator.dispose();return target;
}
