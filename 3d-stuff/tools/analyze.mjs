import fs from 'fs';
const M={
  mul(a,b){const o=new Float64Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s;}return o;},
  srt(sx,sy,sz,rx,ry,rz,tx,ty,tz){const sX=Math.sin(rx),cX=Math.cos(rx),sY=Math.sin(ry),cY=Math.cos(ry),sZ=Math.sin(rz),cZ=Math.cos(rz);const o=new Float64Array(16);
    o[0]=sx*(cY*cZ);o[1]=sx*(sZ*cY);o[2]=sx*(-sY);o[3]=0;
    o[4]=sy*(sX*cZ*sY-cX*sZ);o[5]=sy*(sX*sZ*sY+cX*cZ);o[6]=sy*(sX*cY);o[7]=0;
    o[8]=sz*(cX*cZ*sY+sX*sZ);o[9]=sz*(cX*sZ*sY-sX*cZ);o[10]=sz*(cX*cY);o[11]=0;
    o[12]=tx;o[13]=ty;o[14]=tz;o[15]=1;return o;}
};
const pos=m=>[m[12],m[13],m[14]];const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);

// ---- cmb ----
const cmb=fs.readFileSync('3d-stuff/adult-ocarina/link_v2.cmb');
const sk=cmb.indexOf(Buffer.from('skl '));const boneCount=cmb.readUInt32LE(sk+8);const bones=[];
for(let i=0;i<boneCount;i++){const o=sk+0x10+i*0x28;bones.push({id:cmb.readUInt16LE(o)&0xfff,parent:cmb.readInt16LE(o+2),s:[cmb.readFloatLE(o+4),cmb.readFloatLE(o+8),cmb.readFloatLE(o+12)],r:[cmb.readFloatLE(o+16),cmb.readFloatLE(o+20),cmb.readFloatLE(o+24)],t:[cmb.readFloatLE(o+28),cmb.readFloatLE(o+32),cmb.readFloatLE(o+36)]});}
const cmbLocal={},cmbWorld={};
for(const b of bones)cmbLocal[b.id]=M.srt(...b.s,...b.r,...b.t);
for(const b of bones)cmbWorld[b.id]=b.parent<0?cmbLocal[b.id]:M.mul(cmbWorld[b.parent],cmbLocal[b.id]);

// ---- dae (robust attr parse) ----
const dae=fs.readFileSync('3d-stuff/link-adult/Adult Link.dae','utf8');
const vs=dae.slice(dae.indexOf('<visual_scene'),dae.indexOf('</visual_scene>'));
const re=/<node([^>]*)>|<matrix[^>]*>([^<]*)<\/matrix>|<\/node>/g;
let m,stack=[],dLocal={},dParent={},dSid={};
while((m=re.exec(vs))){
  if(m[1]!==undefined){const a=m[1];const id=(a.match(/id="([^"]*)"/)||[])[1];const sid=(a.match(/sid="([^"]*)"/)||[])[1];dParent[id]=stack.length?stack[stack.length-1]:null;dSid[id]=sid;stack.push(id);}
  else if(m[2]!==undefined){const t=m[2].trim().split(/\s+/).map(Number);const cm=new Float64Array(16);for(let r=0;r<4;r++)for(let c=0;c<4;c++)cm[c*4+r]=t[r*4+c];dLocal[stack[stack.length-1]]=cm;}
  else stack.pop();
}
const joints=Object.keys(dLocal).filter(k=>k.startsWith('Armature_nodes_'));
const dWorld={};const wc=id=>{let w=dLocal[id],p=dParent[id];while(p&&dLocal[p]){w=M.mul(dLocal[p],w);p=dParent[p];}return w;};
for(const id of joints)dWorld[id]=wc(id);
const daeRoot=joints.find(k=>dParent[k]==='Armature');
const G=dWorld[daeRoot]; // cmb root world == identity-ish, so G≈this

// ---- map cmb id -> dae joint by world position (expected=G*cmbWorld) ----
const map={};const used=new Set();let mapWarn=0;
for(const b of bones){const exp=pos(M.mul(G,cmbWorld[b.id]));let best=null,bd=1e18;for(const dj of joints){if(used.has(dj))continue;const d=dist(exp,pos(dWorld[dj]));if(d<bd){bd=d;best=dj;}}map[b.id]=best;used.add(best);if(bd>1){mapWarn++;console.log(`WARN id${b.id}->${best} dist=${bd.toFixed(2)}`);}}
console.log('mapping warnings:',mapWarn,' (0 = perfect position match)');

// ---- verify non-root local equality ----
let maxd=0,worst='';for(const b of bones){if(b.parent<0)continue;const dl=dLocal[map[b.id]],cl=cmbLocal[b.id];let d=0;for(let i=0;i<16;i++)d=Math.max(d,Math.abs(dl[i]-cl[i]));if(d>maxd){maxd=d;worst='id'+b.id+'->'+map[b.id];}}
console.log('MAX non-root |local_dae - local_cmb| =',maxd.toFixed(4),'@',worst);
const Gr=[...G].map(x=>Math.abs(x)<1e-5?0:+x.toFixed(6));
console.log('G(root) col-major:',JSON.stringify(Gr));

// ---- emit runtime skeleton json ----
const outMap={};for(const b of bones)outMap[b.id]=dSid[map[b.id]];
const skeleton={boneCount,bones:bones.map(b=>({id:b.id,parent:b.parent,s:b.s,r:b.r,t:b.t})),rootG:[...G],cmbToDaeSid:outMap};
fs.mkdirSync('public/models/link-adult/anim',{recursive:true});
fs.writeFileSync('public/models/link-adult/anim/skeleton.json',JSON.stringify(skeleton));
console.log('wrote skeleton.json; sample map id5->',outMap[5],' id1(root)->',outMap[bones.find(b=>b.parent<0).id]);

// ---- DECISIVE: full world-matrix equality G*Wcmb(b) vs Wdae(b) ----
let mw=0,ww='';for(const b of bones){const gw=M.mul(G,cmbWorld[b.id]);const dw=dWorld[map[b.id]];let d=0;for(let i=0;i<16;i++)d=Math.max(d,Math.abs(gw[i]-dw[i]));if(d>mw){mw=d;ww='id'+b.id;}}
console.log('\nDECISIVE MAX |G*Wcmb - Wdae| (full matrix) =',mw.toFixed(5),'@',ww);
console.log(mw<0.01?'==> WORLD MATCH: can drive skeleton via local=cmbLocal (root*G).':'==> world rotation mismatch, need per-bone basis fix.');
