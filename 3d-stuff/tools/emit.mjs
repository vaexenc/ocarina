import fs from 'fs';
const M={mul(a,b){const o=new Float64Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s;}return o;},
 srt(sx,sy,sz,rx,ry,rz,tx,ty,tz){const sX=Math.sin(rx),cX=Math.cos(rx),sY=Math.sin(ry),cY=Math.cos(ry),sZ=Math.sin(rz),cZ=Math.cos(rz);const o=new Float64Array(16);
  o[0]=sx*(cY*cZ);o[1]=sx*(sZ*cY);o[2]=sx*(-sY);o[3]=0;o[4]=sy*(sX*cZ*sY-cX*sZ);o[5]=sy*(sX*sZ*sY+cX*cZ);o[6]=sy*(sX*cY);o[7]=0;
  o[8]=sz*(cX*cZ*sY+sX*sZ);o[9]=sz*(cX*sZ*sY-sX*cZ);o[10]=sz*(cX*cY);o[11]=0;o[12]=tx;o[13]=ty;o[14]=tz;o[15]=1;return o;}};
const pos=m=>[m[12],m[13],m[14]];const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const cmb=fs.readFileSync('3d-stuff/adult-ocarina/link_v2.cmb');
const sk=cmb.indexOf(Buffer.from('skl '));const boneCount=cmb.readUInt32LE(sk+8);const bones=[];
for(let i=0;i<boneCount;i++){const o=sk+0x10+i*0x28;bones.push({id:cmb.readUInt16LE(o)&0xfff,parent:cmb.readInt16LE(o+2),s:[cmb.readFloatLE(o+4),cmb.readFloatLE(o+8),cmb.readFloatLE(o+12)],r:[cmb.readFloatLE(o+16),cmb.readFloatLE(o+20),cmb.readFloatLE(o+24)],t:[cmb.readFloatLE(o+28),cmb.readFloatLE(o+32),cmb.readFloatLE(o+36)]});}
const cmbLocal={},cmbWorld={};for(const b of bones)cmbLocal[b.id]=M.srt(...b.s,...b.r,...b.t);
for(const b of bones)cmbWorld[b.id]=b.parent<0?cmbLocal[b.id]:M.mul(cmbWorld[b.parent],cmbLocal[b.id]);
const dae=fs.readFileSync('3d-stuff/link-adult/Adult Link.dae','utf8');
const vs=dae.slice(dae.indexOf('<visual_scene'),dae.indexOf('</visual_scene>'));
const re=/<node([^>]*)>|<matrix[^>]*>([^<]*)<\/matrix>|<\/node>/g;let m,stack=[],dLocal={},dParent={};
while((m=re.exec(vs))){if(m[1]!==undefined){const a=m[1];const id=(a.match(/id="([^"]*)"/)||[])[1];dParent[id]=stack.length?stack[stack.length-1]:null;stack.push(id);}
 else if(m[2]!==undefined){const t=m[2].trim().split(/\s+/).map(Number);const cm=new Float64Array(16);for(let r=0;r<4;r++)for(let c=0;c<4;c++)cm[c*4+r]=t[r*4+c];dLocal[stack[stack.length-1]]=cm;}else stack.pop();}
const joints=Object.keys(dLocal).filter(k=>k.startsWith('Armature_nodes_'));
const dWorld={};const wc=id=>{let w=dLocal[id],p=dParent[id];while(p&&dLocal[p]){w=M.mul(dLocal[p],w);p=dParent[p];}return w;};
for(const id of joints)dWorld[id]=wc(id);
const daeRoot=joints.find(k=>dParent[k]==='Armature');const G=dWorld[daeRoot];
const map={},used=new Set();for(const b of bones){const exp=pos(M.mul(G,cmbWorld[b.id]));let best=null,bd=1e18;for(const dj of joints){if(used.has(dj))continue;const d=dist(exp,pos(dWorld[dj]));if(d<bd){bd=d;best=dj;}}map[b.id]=best;used.add(best);}
const cmbIdToDaeNum={};for(const b of bones){cmbIdToDaeNum[b.id]=parseInt(map[b.id].match(/nodes_(\d+)_/)[1]);}
const out={boneCount,bones:bones.map(b=>({id:b.id,parent:b.parent,s:b.s,r:b.r,t:b.t})),G:[...G],cmbIdToDaeNum};
fs.mkdirSync('public/models/link-adult/anim',{recursive:true});
fs.writeFileSync('public/models/link-adult/anim/skeleton.json',JSON.stringify(out));
console.log('skeleton.json written. boneCount',boneCount);
console.log('cmbIdToDaeNum',JSON.stringify(cmbIdToDaeNum));
