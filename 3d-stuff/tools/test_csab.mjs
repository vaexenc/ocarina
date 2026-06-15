import fs from 'fs';
function parseTrack(v,o){const type=v.getUint32(o,true),n=v.getUint32(o+4,true);let p=o+0x10;const fr=[];
 if(type===1){for(let i=0;i<n;i++){fr.push({t:v.getUint32(p,true),val:v.getFloat32(p+4,true)});p+=8;}return{type,fr};}
 if(type===2){const te=v.getUint32(o+0xc,true)+1;for(let i=0;i<n;i++){fr.push({t:v.getUint32(p,true),val:v.getFloat32(p+4,true),ti:v.getFloat32(p+8,true),to:v.getFloat32(p+12,true)});p+=16;}return{type,te,fr};}
 throw new Error('type '+type);}
function parseAnod(v,o){const bi=v.getUint16(o+4,true);const T=r=>r?parseTrack(v,o+r):null;
 return{bi,tx:T(v.getUint16(o+8,true)),ty:T(v.getUint16(o+0xa,true)),tz:T(v.getUint16(o+0xc,true)),
 rx:T(v.getUint16(o+0xe,true)),ry:T(v.getUint16(o+0x10,true)),rz:T(v.getUint16(o+0x12,true)),
 sx:T(v.getUint16(o+0x14,true)),sy:T(v.getUint16(o+0x16,true)),sz:T(v.getUint16(o+0x18,true))};}
function parse(buf){const v=new DataView(buf);const dur=v.getUint32(0x28,true)+1;const ac=v.getUint32(0x30,true);const bc=v.getUint32(0x34,true);
 const tbl=new Int16Array(bc);let p=0x38;for(let i=0;i<bc;i++){tbl[i]=v.getInt16(p,true);p+=2;}
 let at=(p+3)&~3;const nodes=[];for(let i=0;i<ac;i++){nodes.push(parseAnod(v,0x18+v.getUint32(at,true)));at+=4;}
 return{dur,ac,bc,tbl,nodes};}
const mod=(a,b)=>((a%b)+b)%b,lerp=(a,b,t)=>a+(b-a)*t;
function sLin(tr,f){const F=tr.fr;const i1=F.findIndex(k=>f<k.t);if(i1===0)return F[0].val;if(i1<0)return F[F.length-1].val;const k0=F[i1-1],k1=F[i1];return lerp(k0.val,k1.val,(f-k0.t)/(k1.t-k0.t));}
function gph(p0,p1,s0,s1,t){const a=p0*2-p1*2+s0+s1,b=-3*p0+3*p1-2*s0-s1;return((a*t+b)*t+s0)*t+p0;}
function sHer(tr,f){const F=tr.fr;const i1=F.findIndex(k=>f<k.t);let k0,k1;if(i1<=0){k0=F[F.length-1];k1=F[0];}else{k0=F[i1-1];k1=F[i1];}const L=mod(k1.t-k0.t,tr.te);const t=L?(f-k0.t)/L:0;return gph(k0.val,k1.val,k0.to*L,k1.ti*L,t);}
const samp=(tr,f)=>tr.type===1?sLin(tr,f):sHer(tr,f);

for(const name of ['nml_okarina_swing','nml_okarina_start','nml_okarina_end']){
  const b=fs.readFileSync('3d-stuff/adult-ocarina/'+name+'.csab');
  const pad=new Uint8Array(b.byteLength+16);pad.set(b);const c=parse(pad.buffer);
  const animated=[...c.tbl].filter(x=>x>=0).length;
  console.log(`\n${name}: duration=${c.dur}f  anodCount=${c.ac}  boneCount=${c.bc}  animatedBones=${animated}`);
  // pick a node that has a rotation track; sample across frames
  const node=c.nodes.find(n=>n.rx||n.ry||n.rz);
  const tr=node.rx||node.ry||node.rz;
  const vals=[0,0.25,0.5,0.75].map(fr=>samp(tr,fr*(c.dur-1)));
  const finite=vals.every(Number.isFinite);
  console.log(`  sample bone#${node.bi} rot track type=${tr.type} keys=${tr.fr.length}  @[0,.25,.5,.75]=`,vals.map(x=>+x.toFixed(4)),' finite=',finite);
}
