import fs from 'fs';
const b=fs.readFileSync('3d-stuff/adult-ocarina/nml_okarina_swing.csab');
const v=new DataView(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
// inspect anod0 tx track (n>1) to learn stride, and anod20 tracks
function hdr(o){return {type:v.getUint32(o,true),n:v.getUint32(o+4,true),tStart:v.getUint32(o+8,true),tEnd:v.getUint32(o+0xc,true)};}
const a0=0xc0;
console.log('anod0 tx@0xdc',hdr(a0+28));
console.log('anod0 ty@',(a0+156).toString(16),hdr(a0+156));
console.log('  gap tx->ty =',156-28,'bytes; header16 => kf bytes',156-28-16);
console.log('anod0 tz@',(a0+332).toString(16),hdr(a0+332));
console.log('  gap ty->tz =',332-156,'bytes; kf bytes',332-156-16);
// dump anod0 tx keyframes assuming stride 16 (hermite) vs 8
const txo=a0+28, txh=hdr(txo);
console.log('\nanod0 tx type',txh.type,'n',txh.n);
let p=txo+0x10;
for(let i=0;i<txh.n;i++){console.log(`  kf${i} t=${v.getUint32(p,true)} val=${v.getFloat32(p+4,true).toFixed(3)} tin=${v.getFloat32(p+8,true).toFixed(4)} tout=${v.getFloat32(p+12,true).toFixed(4)}`);p+=16;}
console.log('  (stride16 end=0x'+(txo+0x10+txh.n*16).toString(16)+', ty starts 0x'+(a0+156).toString(16)+')');
