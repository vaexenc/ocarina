// Generate public/models/<model>/anim/skeleton.json for a model, mapping its
// cmb skeleton bones onto the joints of its exported Collada (.dae) by world
// position (same approach as emit.mjs/analyze.mjs, but parametrised and reading
// the cmb straight out of the GAR).
//
//   node tools/emit2.mjs <cmbFile> <daeFile> <outJson>
import fs from "fs";

const M = {
	mul(a, b) {
		const o = new Float64Array(16);
		for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
			let s = 0;
			for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
			o[c * 4 + r] = s;
		}
		return o;
	},
	srt(sx, sy, sz, rx, ry, rz, tx, ty, tz) {
		const sX = Math.sin(rx), cX = Math.cos(rx), sY = Math.sin(ry), cY = Math.cos(ry), sZ = Math.sin(rz), cZ = Math.cos(rz);
		const o = new Float64Array(16);
		o[0] = sx * (cY * cZ); o[1] = sx * (sZ * cY); o[2] = sx * -sY; o[3] = 0;
		o[4] = sy * (sX * cZ * sY - cX * sZ); o[5] = sy * (sX * sZ * sY + cX * cZ); o[6] = sy * (sX * cY); o[7] = 0;
		o[8] = sz * (cX * cZ * sY + sX * sZ); o[9] = sz * (cX * sZ * sY - sX * cZ); o[10] = sz * (cX * cY); o[11] = 0;
		o[12] = tx; o[13] = ty; o[14] = tz; o[15] = 1;
		return o;
	},
};
// 4x4 inverse (column-major), Gauss-Jordan.
M.inv = (m) => {
	const a = [...m],
		inv = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
	for (let i = 0; i < 4; i++) {
		let p = a[i * 4 + i];
		let pr = i;
		for (let r = i + 1; r < 4; r++) if (Math.abs(a[i * 4 + r]) > Math.abs(p)) { p = a[i * 4 + r]; pr = r; }
		if (pr !== i) for (let c = 0; c < 4; c++) {
			[a[c * 4 + i], a[c * 4 + pr]] = [a[c * 4 + pr], a[c * 4 + i]];
			[inv[c * 4 + i], inv[c * 4 + pr]] = [inv[c * 4 + pr], inv[c * 4 + i]];
		}
		const d = a[i * 4 + i];
		for (let c = 0; c < 4; c++) { a[c * 4 + i] /= d; inv[c * 4 + i] /= d; }
		for (let r = 0; r < 4; r++) {
			if (r === i) continue;
			const f = a[i * 4 + r];
			for (let c = 0; c < 4; c++) { a[c * 4 + r] -= f * a[c * 4 + i]; inv[c * 4 + r] -= f * inv[c * 4 + i]; }
		}
	}
	return inv;
};
const pos = (m) => [m[12], m[13], m[14]];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

const [, , cmbFile, daeFile, outJson] = process.argv;

// ---- cmb skeleton ----
const cmb = fs.readFileSync(cmbFile);
const sk = cmb.indexOf(Buffer.from("skl "));
const boneCount = cmb.readUInt32LE(sk + 8);
// MM3D bone stride is 0x2C (OoT3D was 0x28: MM appends a 4-byte field after T).
// Auto-detect: with the right stride, every non-root parent resolves to an id in
// the set and the root parent is negative.
const detectStride = () => {
	for (const stride of [0x2c, 0x28]) {
		const ids = new Set();
		let ok = true;
		for (let i = 0; i < boneCount; i++) ids.add(cmb.readUInt16LE(sk + 0x10 + i * stride) & 0xfff);
		for (let i = 0; i < boneCount; i++) {
			const p = cmb.readInt16LE(sk + 0x10 + i * stride + 2);
			if (p >= 0 && !ids.has(p)) { ok = false; break; }
		}
		if (ok && ids.size === boneCount) return stride;
	}
	return 0x2c;
};
const STRIDE = detectStride();
const bones = [];
for (let i = 0; i < boneCount; i++) {
	const o = sk + 0x10 + i * STRIDE;
	bones.push({
		id: cmb.readUInt16LE(o) & 0xfff,
		parent: cmb.readInt16LE(o + 2),
		s: [cmb.readFloatLE(o + 4), cmb.readFloatLE(o + 8), cmb.readFloatLE(o + 12)],
		r: [cmb.readFloatLE(o + 16), cmb.readFloatLE(o + 20), cmb.readFloatLE(o + 24)],
		t: [cmb.readFloatLE(o + 28), cmb.readFloatLE(o + 32), cmb.readFloatLE(o + 36)],
	});
}
console.log("bone stride", "0x" + STRIDE.toString(16));
const cmbLocal = {}, cmbWorld = {};
for (const b of bones) cmbLocal[b.id] = M.srt(...b.s, ...b.r, ...b.t);
const byId = Object.fromEntries(bones.map((b) => [b.id, b]));
const worldOf = (id) => {
	const b = byId[id];
	return cmbWorld[id] ?? (cmbWorld[id] = b.parent < 0 ? cmbLocal[id] : M.mul(worldOf(b.parent), cmbLocal[id]));
};
for (const b of bones) worldOf(b.id);

// ---- dae visual scene joints ----
const dae = fs.readFileSync(daeFile, "utf8");
const vs = dae.slice(dae.indexOf("<visual_scene"), dae.indexOf("</visual_scene>"));
const re = /<node([^>]*)>|<matrix[^>]*>([^<]*)<\/matrix>|<\/node>/g;
let m, stack = [], dLocal = {}, dParent = {};
while ((m = re.exec(vs))) {
	if (m[1] !== undefined) {
		const id = (m[1].match(/id="([^"]*)"/) || [])[1];
		dParent[id] = stack.length ? stack[stack.length - 1] : null;
		stack.push(id);
	} else if (m[2] !== undefined) {
		const t = m[2].trim().split(/\s+/).map(Number);
		const cm = new Float64Array(16);
		for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) cm[c * 4 + r] = t[r * 4 + c];
		dLocal[stack[stack.length - 1]] = cm;
	} else stack.pop();
}
const joints = Object.keys(dLocal).filter((k) => /^Armature_nodes_\d+_/.test(k));
const dWorld = {};
const wc = (id) => {
	let w = dLocal[id], p = dParent[id];
	while (p && dLocal[p]) {
		w = M.mul(dLocal[p], w);
		p = dParent[p];
	}
	return w;
};
for (const id of joints) dWorld[id] = wc(id);
const daeRoot = joints.find((k) => dParent[k] === "Armature") ?? joints[0];
const G = dWorld[daeRoot];

// ---- map cmb id -> dae joint by world position ----
const map = {}, used = new Set();
let mapWarn = 0;
for (const b of bones) {
	const exp = pos(M.mul(G, cmbWorld[b.id]));
	let best = null, bd = 1e18;
	for (const dj of joints) {
		if (used.has(dj)) continue;
		const d = dist(exp, pos(dWorld[dj]));
		if (d < bd) { bd = d; best = dj; }
	}
	map[b.id] = best;
	used.add(best);
	if (bd > 1) mapWarn++;
}
console.log("cmb bones", boneCount, "dae joints", joints.length, "mapping warnings(dist>1):", mapWarn);

// ---- DECISIVE world-match check ----
let mw = 0;
for (const b of bones) {
	const gw = M.mul(G, cmbWorld[b.id]);
	const dw = dWorld[map[b.id]];
	for (let i = 0; i < 16; i++) mw = Math.max(mw, Math.abs(gw[i] - dw[i]));
}
console.log(
	"MAX |G*Wcmb - Wdae| =",
	mw.toFixed(5),
	mw < 0.01 ? "==> dae bind matches cmb (K=identity)" : "==> dae bind reoriented; K/Dinv retarget compensates"
);

const cmbIdToDaeNum = {};
// Per-bone retarget matrices so the cmb-driven animation deforms the dae mesh
// even when the dae's bind orientation differs from the cmb's (as Zora's does):
//   boneInverse = Dinv = inverse(daeBindWorld)
//   boneMatrixWorld = Gp * cmbPosedWorld * K,  K = inverse(G*cmbBindWorld) * daeBindWorld
// For a dae whose bind == G*cmbBind (e.g. Adult), K = identity and Dinv equals the
// old cmb-derived bind inverse, so this is a no-op generalisation.
const K = {};
const Dinv = {};
for (const b of bones) {
	cmbIdToDaeNum[b.id] = parseInt(map[b.id].match(/nodes_(\d+)_/)[1]);
	const D = dWorld[map[b.id]];
	const GB = M.mul(G, cmbWorld[b.id]);
	K[b.id] = [...M.mul(M.inv(GB), D)];
	Dinv[b.id] = M.inv(D);
}
const out = { boneCount, bones: bones.map((b) => ({ id: b.id, parent: b.parent, s: b.s, r: b.r, t: b.t })), G: [...G], cmbIdToDaeNum, K, Dinv };
fs.mkdirSync(outJson.slice(0, outJson.lastIndexOf("/")), { recursive: true });
fs.writeFileSync(outJson, JSON.stringify(out));
console.log("wrote", outJson, "(with K + Dinv retarget matrices)");
