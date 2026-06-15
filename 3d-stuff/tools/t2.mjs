import fs from 'fs';
const b=fs.readFileSync('3d-stuff/adult-ocarina/nml_okarina_swing.csab');
const v=new DataView(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
for(let o=0x1444;o<b.length;o+=4){console.log(`0x${o.toString(16)} u32=${v.getUint32(o,true)} f32=${v.getFloat32(o,true).toFixed(4)}`);}
console.log('len 0x'+b.length.toString(16));
