import fs from 'fs';
const dir='3d-stuff/adult-ocarina/';
function hex(buf,off,n){return [...buf.slice(off,off+n)].map(b=>b.toString(16).padStart(2,'0')).join(' ');}

// ---- CMB skeleton ----
const cmb=fs.readFileSync(dir+'link_v2.cmb');
console.log('CMB magic:',cmb.toString('ascii',0,4),'size',cmb.readUInt32LE(4));
// find 'skl ' chunk
let sk=cmb.indexOf(Buffer.from('skl '));
console.log('skl offset',sk);
console.log('skl hdr bytes:',hex(cmb,sk,32));
const sklSize=cmb.readUInt32LE(sk+4);
const boneCount=cmb.readUInt32LE(sk+8);
console.log('skl size',sklSize,'boneCount',boneCount,'extra',cmb.readUInt32LE(sk+12));
// dump first 3 bones assuming 0x28 stride starting at sk+0x10
let bo=sk+0x10;
for(let i=0;i<Math.min(3,boneCount);i++){
  const o=bo+i*0x28;
  console.log(`bone${i}: id=${cmb.readUInt16LE(o)&0xfff} parent=${cmb.readInt16LE(o+2)} `+
    `S(${cmb.readFloatLE(o+4).toFixed(3)},${cmb.readFloatLE(o+8).toFixed(3)},${cmb.readFloatLE(o+12).toFixed(3)}) `+
    `R(${cmb.readFloatLE(o+16).toFixed(3)},${cmb.readFloatLE(o+20).toFixed(3)},${cmb.readFloatLE(o+24).toFixed(3)}) `+
    `T(${cmb.readFloatLE(o+28).toFixed(2)},${cmb.readFloatLE(o+32).toFixed(2)},${cmb.readFloatLE(o+36).toFixed(2)})`);
}

// ---- CSAB ----
for(const f of ['nml_okarina_swing.csab']){
  const c=fs.readFileSync(dir+f);
  console.log('\nCSAB',f,'magic',c.toString('ascii',0,4),'size',c.readUInt32LE(4));
  console.log('hdr 0x00..0x40:',hex(c,0,0x40));
}
