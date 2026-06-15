import fs from 'fs';
const b=fs.readFileSync('3d-stuff/adult-ocarina/nml_okarina_swing.csab');
const v=new DataView(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
const size=v.getUint32(4,true);
console.log('fileLen',b.length,'sizeField',size,'sub',v.getUint32(8,true));
const dur=v.getUint32(0x28,true)+1,ac=v.getUint32(0x30,true),bc=v.getUint32(0x34,true);
console.log('dur',dur,'anodCount',ac,'boneCount',bc);
let p=0x38+bc*2; let at=(p+3)&~3;
console.log('anodTableIdx',at.toString(16));
for(let i=0;i<ac;i++){
  const off=v.getUint32(at+i*4,true);
  const ao=0x18+off;
  const magic=String.fromCharCode(v.getUint8(ao),v.getUint8(ao+1),v.getUint8(ao+2),v.getUint8(ao+3));
  const bi=v.getUint16(ao+4,true);
  const rels=[];for(let k=0;k<9;k++)rels.push(v.getUint16(ao+8+k*2,true));
  console.log(`anod${i} off=${off}(0x${ao.toString(16)}) magic=${magic} bone=${bi} rels=[${rels}] anodEndGuess(maxrel)=${Math.max(...rels)}`);
}
