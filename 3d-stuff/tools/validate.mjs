import fs from 'fs';
const S=Math.PI/32768;
function parseTrack(v,o,int16){const type=v.getUint32(o,true),n=v.getUint32(o+4,true),te=v.getUint32(o+0xc,true)+1;let p=o+0x10;const fr=[];
 if(type===1){for(let i=0;i<n;i++){if(int16){fr.push({t:v.getUint16(p,true),val:v.getInt16(p+2,true)*S});p+=4;}else{fr.push({t:v.getUint32(p,true),val:v.getFloat32(p+4,true)});p+=8;}}return{type,fr};}
 if(type===2){for(let i=0;i<n;i++){if(int16){fr.push({t:v.getUint16(p,true),val:v.getInt16(p+2,true)*S,ti:v.getInt16(p+4,true)*S,to:v.getInt16(p+6,true)*S});p+=8;}else{fr.push({t:v.getUint32(p,true),val:v.getFloat32(p+4,true),ti:v.getFloat32(p+8,true),to:v.getFloat32(p+12,true)});p+=16;}}return{type,te,fr};}
 throw new Error('type '+type);}
function parseAnod(v,o){const i16=v.getUint16(o+6,true)!==0;const T=(rel,b)=>rel?parseTrack(v,o+rel,b):null;
 return{bi:v.getUint16(o+4,true),tx:T(v.getUint16(o+8,true),false),ty:T(v.getUint16(o+0xa,true),false),tz:T(v.getUint16(o+0xc,true),false),
 rx:T(v.getUint16(o+0xe,true),i16),ry:T(v.getUint16(o+0x10,true),i16),rz:T(v.getUint16(o+0x12,true),i16),
 sx:T(v.getUint16(o+0x14,true),false),sy:T(v.getUint16(o+0x16,true),false),sz:T(v.getUint16(o+0x18,true),false)};}
function parse(buf){const v=new DataView(buf);const dur=v.getUint32(0x28,true)+1,ac=v.getUint32(0x30,true),bc=v.getUint32(0x34,true);
 let at=((0x38+bc*2)+3)&~3;const nodes=[];for(let i=0;i<ac;i++){nodes.push(parseAnod(v,0x18+v.getUint32(at,true)));at+=4;}return{dur,nodes};}
const mod=(a,b)=>((a%b)+b)%b,lerp=(a,b,t)=>a+(b-a)*t;
function sLin(tr,f){const F=tr.fr;const i1=F.findIndex(k=>f<k.t);if(i1===0)return F[0].val;if(i1<0)return F[F.length-1].val;const k0=F[i1-1],k1=F[i1];return lerp(k0.val,k1.val,(f-k0.t)/(k1.t-k0.t));}
function gph(p0,p1,s0,s1,t){const a=p0*2-p1*2+s0+s1,b=-3*p0+3*p1-2*s0-s1;return((a*t+b)*t+s0)*t+p0;}
function sHer(tr,f){const F=tr.fr;const i1=F.findIndex(k=>f<k.t);let k0,k1;if(i1<=0){k0=F[F.length-1];k1=F[0];}else{k0=F[i1-1];k1=F[i1];}const L=mod(k1.t-k0.t,tr.te);const t=L?(f-k0.t)/L:0;return gph(k0.val,k1.val,k0.to*L,k1.ti*L,t);}
const samp=(tr,f)=>tr.type===1?sLin(tr,f):sHer(tr,f);
const labels=['tx','ty','tz','rx','ry','rz','sx','sy','sz'];
for(const name of ['nml_okarina_swing','nml_okarina_start','nml_okarina_end']){
 const b=fs.readFileSync('3d-stuff/adult-ocarina/'+name+'.csab');const pad=new Uint8Array(b.byteLength+16);pad.set(b);
 const c=parse(pad.buffer);
 let bad=0,maxRot=0,maxTrans=0,maxScale=0;
 for(const nd of c.nodes){for(const k of labels){const tr=nd[k];if(!tr)continue;
  for(let s=0;s<=12;s++){const f=(s/12)*(c.dur-1);const val=samp(tr,f);
   if(!Number.isFinite(val)){bad++;continue;}
   if(k[0]==='r')maxRot=Math.max(maxRot,Math.abs(val));else if(k[0]==='t')maxTrans=Math.max(maxTrans,Math.abs(val));else maxScale=Math.max(maxScale,Math.abs(val));
  }}}
 console.log(`${name}: dur=${c.dur} nodes=${c.nodes.length} NaN/Inf=${bad}  maxRot=${maxRot.toFixed(2)}rad maxTrans=${maxTrans.toFixed(1)} maxScale=${maxScale.toFixed(2)}`);
}

// find offenders in swing
{
 const b=fs.readFileSync('3d-stuff/adult-ocarina/nml_okarina_swing.csab');const pad=new Uint8Array(b.byteLength+16);pad.set(b);
 const c=parse(pad.buffer);
 for(const nd of c.nodes){for(const k of labels){const tr=nd[k];if(!tr||tr.type!==2)continue;
  for(let s=0;s<=12;s++){const f=(s/12)*(c.dur-1);const val=samp(tr,f);
   if(Math.abs(val)>100){console.log(`bone${nd.bi} ${k} f=${f.toFixed(1)} val=${val.toExponential(2)} firstKeyT=${tr.fr[0].t} lastKeyT=${tr.fr[tr.fr.length-1].t} te=${tr.te} nKeys=${tr.fr.length}`);break;}
  }}}
}
