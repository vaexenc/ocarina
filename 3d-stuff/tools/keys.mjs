import fs from 'fs';
const dae=fs.readFileSync('3d-stuff/link-adult/Adult Link.dae','utf8');
const vs=dae.slice(dae.indexOf('<visual_scene'),dae.indexOf('</visual_scene>'));
const re=/<node([^>]*)>|<matrix[^>]*>([^<]*)<\/matrix>|<\/node>/g;
let m,stack=[],rows=[];
while((m=re.exec(vs))){
  if(m[1]!==undefined){const attrs=m[1];const id=(attrs.match(/id="([^"]*)"/)||[])[1];const type=(attrs.match(/type="([^"]*)"/)||[])[1];const parent=stack.length?stack[stack.length-1]:null;rows.push({id,type,parent,hasMatrix:false});stack.push(id);}
  else if(m[2]!==undefined){const last=rows.find(r=>r.id===stack[stack.length-1]);if(last)last.hasMatrix=true;}
  else stack.pop();
}
for(const r of rows)console.log(`${r.id}  type=${r.type}  parent=${r.parent}  matrix=${r.hasMatrix}`);
