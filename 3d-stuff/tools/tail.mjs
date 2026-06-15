import fs from 'fs';
const b=fs.readFileSync('3d-stuff/adult-ocarina/nml_okarina_swing.csab');
const v=new DataView(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
const start=0x1450;
for(let o=start;o<b.length;o+=4){
  const u=v.getUint32(o,true), f=v.getFloat32(o,true);
  console.log(`0x${o.toString(16)}: u32=${u}  f32=${f.toFixed(4)}  i16=[${v.getInt16(o,true)},${v.getInt16(o+2,true)}]`);
}
console.log('len=0x'+b.length.toString(16));
// the track in question:
const o=0x145c;
console.log('\ntrack@0x145c: type',v.getUint32(o,true),'n',v.getUint32(o+4,true),'tStart',v.getUint32(o+8,true),'tEnd',v.getUint32(o+0xc,true));
