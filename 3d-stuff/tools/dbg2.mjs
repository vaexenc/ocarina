import fs from 'fs';
const b=fs.readFileSync('3d-stuff/adult-ocarina/nml_okarina_swing.csab');
const len=b.length;
const v=new DataView(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
const ac=v.getUint32(0x30,true),bc=v.getUint32(0x34,true);
let at=((0x38+bc*2)+3)&~3;
for(let i=0;i<ac;i++){
  const ao=0x18+v.getUint32(at+i*4,true);
  for(let k=0;k<9;k++){const rel=v.getUint16(ao+8+k*2,true);if(!rel)continue;const o=ao+rel;
    const type=v.getUint32(o,true),n=v.getUint32(o+4,true);
    const stride=type===1?8:type===2?16:-1;
    const end=o+0x10+n*stride;
    const bad=(type!==1&&type!==2)||end>len||n>10000;
    if(bad)console.log(`BAD anod${i} k${k} off=0x${o.toString(16)} type=${type} n=${n} end=0x${end.toString(16)} len=0x${len.toString(16)}`);
  }
}
console.log('done scan');
