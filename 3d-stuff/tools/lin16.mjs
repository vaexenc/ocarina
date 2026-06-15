import fs from 'fs';
const b=fs.readFileSync('3d-stuff/adult-ocarina/nml_okarina_swing.csab');
const pad=new Uint8Array(b.byteLength+16);pad.set(b);const v=new DataView(pad.buffer);
const ac=v.getUint32(0x30,true),bc=v.getUint32(0x34,true);let at=((0x38+bc*2)+3)&~3;
const S=Math.PI/32768;
for(let i=0;i<ac;i++){const ao=0x18+v.getUint32(at+i*4,true);const bone=v.getUint16(ao+4,true);
 for(const [lab,ri] of [['rx',0xe],['ry',0x10],['rz',0x12]]){const rel=v.getUint16(ao+ri,true);if(!rel)continue;
  const o=ao+rel;const type=v.getUint32(o,true),n=v.getUint32(o+4,true);if(type!==1)continue;
  // try (u16 time, s16 value) stride4
  let p=o+0x10;const kf=[];for(let k=0;k<n;k++){kf.push(`t${v.getUint16(p,true)}=${(v.getInt16(p+2,true)*S).toFixed(3)}`);p+=4;}
  console.log(`bone${bone} ${lab} LINEAR n${n} as int16(stride4): ${kf.join(' ')}  [endOff 0x${(o+0x10+n*4).toString(16)}]`);
 }}
