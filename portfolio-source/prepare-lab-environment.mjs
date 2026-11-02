import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {FloatType} from 'three';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';
const raw=fs.readFileSync('../../peppermint_powerplant_1k.hdr');
const expected='91cc57b66855f7dd6d4119953e4c2752';
if(createHash('md5').update(raw).digest('hex')!==expected)throw Error('HDR source checksum differs');
const source=new RGBELoader().setDataType(FloatType).parse(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));
const width=512,height=256,rgbe=new Uint8Array(width*height*4);
for(let y=0;y<height;y++)for(let x=0;x<width;x++){
 const channels=[0,0,0];
 for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++)for(let c=0;c<3;c++)channels[c]+=source.data[((y*2+dy)*source.width+x*2+dx)*4+c]/4;
 const max=Math.max(...channels),exponent=Math.ceil(Math.log2(max||1e-12)),scale=256/2**exponent,k=(y*width+x)*4;
 for(let c=0;c<3;c++)rgbe[k+c]=Math.min(255,Math.round(channels[c]*scale));rgbe[k+3]=exponent+128;
}
const packed=gzipSync(rgbe,{level:9}).toString('base64');
fs.writeFileSync('src/lab-environment-data.js',`// Peppermint Powerplant by Andreas Mischok / Poly Haven, CC0.\n// https://polyhaven.com/a/peppermint_powerplant\n// 512 x 256 linear-light downsample, RGBE, gzip/base64.\nexport const labEnvironmentData='${packed}';\n`);
console.log(JSON.stringify({width,height,compressedBytes:Buffer.from(packed,'base64').length,sourceMD5:expected}));
