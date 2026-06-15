import fs from 'fs';
const b=fs.readFileSync('3d-stuff/adult-ocarina/nml_okarina_end.csab');
const v=new DataView(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
const bc=v.getUint32(0x34,true);let at=((0x38+bc*2)+3)&~3;
const ao=0x18+v.getUint32(at+1*4,true); // anod1 bone2
const rels=[0,28,0,52,108,148,0,0,0];
const S=Math.PI/32768; // binary angle -> radians
for(const [lab,rel] of [['rx',52],['ry',108],['rz',148]]){
 const o=ao+rel;const type=v.getUint32(o,true),n=v.getUint32(o+4,true),te=v.getUint32(o+0xc,true);
 process.stdout.write(`${lab} type${type} n${n} te${te}:`);
 let p=o+0x10;for(let i=0;i<n;i++){const t=v.getUint16(p,true),val=v.getInt16(p+2,true),ti=v.getInt16(p+4,true),to=v.getInt16(p+6,true);process.stdout.write(` [t${t} v${(val*S).toFixed(3)}rad raw${val} ti${ti} to${to}]`);p+=8;}
 console.log();
}
