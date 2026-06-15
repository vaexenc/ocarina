import fs from 'fs';
for(const name of ['nml_okarina_swing','nml_okarina_start','nml_okarina_end']){
 const b=fs.readFileSync('3d-stuff/adult-ocarina/'+name+'.csab');
 const v=new DataView(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
 const ac=v.getUint32(0x30,true),bc=v.getUint32(0x34,true);let at=((0x38+bc*2)+3)&~3;
 const flags=[];for(let i=0;i<ac;i++){const ao=0x18+v.getUint32(at+i*4,true);flags.push(v.getUint16(ao+6,true));}
 console.log(name,'isRotInt16 per anod:',flags.join(''));
}
