import fs from 'fs';
const name=process.argv[2];
const b=fs.readFileSync('3d-stuff/adult-ocarina/'+name+'.csab');
const v=new DataView(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
const ac=v.getUint32(0x30,true),bc=v.getUint32(0x34,true);
console.log(name,'dur',v.getUint32(0x28,true)+1,'anod',ac,'bone',bc,'len',b.length);
let at=((0x38+bc*2)+3)&~3;
// anod1 (bone2)
const ao=0x18+v.getUint32(at+1*4,true);
console.log('anod1 abs 0x'+ao.toString(16),'magic',String.fromCharCode(v.getUint8(ao),v.getUint8(ao+1),v.getUint8(ao+2),v.getUint8(ao+3)),'bone',v.getUint16(ao+4,true));
const rels=[];for(let k=0;k<9;k++)rels.push(v.getUint16(ao+8+k*2,true));
console.log('rels',rels);
// rotationX is index 3
const labels=['tx','ty','tz','rx','ry','rz','sx','sy','sz'];
for(let k=0;k<9;k++){if(!rels[k])continue;const o=ao+rels[k];const type=v.getUint32(o,true),n=v.getUint32(o+4,true),ts=v.getUint32(o+8,true),te=v.getUint32(o+0xc,true);
 process.stdout.write(`${labels[k]} type=${type} n=${n} tStart=${ts} tEnd=${te} kf:`);
 let p=o+0x10;const stride=type===2?16:8;for(let i=0;i<n;i++){if(type===2)process.stdout.write(` [t${v.getUint32(p,true)} v${v.getFloat32(p+4,true).toFixed(3)} i${v.getFloat32(p+8,true).toFixed(3)} o${v.getFloat32(p+12,true).toFixed(3)}]`);else process.stdout.write(` [t${v.getUint32(p,true)} v${v.getFloat32(p+4,true).toFixed(3)}]`);p+=stride;}
 console.log();}
