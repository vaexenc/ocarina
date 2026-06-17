// CSAB (CTR Skeletal Animation Binary) parser for Ocarina of Time 3D.
//
// This is a faithful port of the OoT3D-specific path of noclip.website's csab.ts,
// trimmed to the "Ocarina" (not Majora/Luigi's Mansion) format that this game uses.
// It parses bone animation tracks and samples them on demand. See AnimPage.tsx for
// how the sampled local transforms are turned into a posed three.js skeleton.

import {Matrix4} from "three";

enum AnimationTrackType {
	CONSTANT = 0x00,
	LINEAR = 0x01,
	HERMITE = 0x02,
}

interface KeyframeLinear {
	time: number;
	value: number;
}

interface KeyframeHermite {
	time: number;
	value: number;
	tangentIn: number;
	tangentOut: number;
}

interface TrackLinear {
	type: AnimationTrackType.LINEAR;
	frames: KeyframeLinear[];
}

interface TrackHermite {
	type: AnimationTrackType.HERMITE;
	timeEnd: number;
	frames: KeyframeHermite[];
}

type AnimationTrack = TrackLinear | TrackHermite;

interface AnimationNode {
	boneIndex: number;
	translationX: AnimationTrack | null;
	translationY: AnimationTrack | null;
	translationZ: AnimationTrack | null;
	rotationX: AnimationTrack | null;
	rotationY: AnimationTrack | null;
	rotationZ: AnimationTrack | null;
	scaleX: AnimationTrack | null;
	scaleY: AnimationTrack | null;
	scaleZ: AnimationTrack | null;
}

export interface CSAB {
	duration: number; // in frames
	animationNodes: AnimationNode[];
	boneToAnimationTable: Int16Array; // bone id -> index into animationNodes, or -1
}

// 3DS binary-angle unit: a full turn is 65536, so an int16 maps to [-π, π).
const ANGLE_SCALE = Math.PI / 32768;

// `int16` is true for rotation tracks flagged isRotationInt16: their HERMITE
// keyframes pack (u16 time, s16 value, s16 tangentIn, s16 tangentOut) and the
// value/tangents are binary angles. Translation/scale tracks are always float.
function parseTrack(view: DataView, offs: number, int16: boolean): AnimationTrack {
	const type = view.getUint32(offs + 0x00, true);
	const numKeyframes = view.getUint32(offs + 0x04, true);
	// timeStart at +0x08 (unused), timeEnd at +0x0C.
	const timeEnd = view.getUint32(offs + 0x0c, true) + 1;
	let p = offs + 0x10;

	if (type === AnimationTrackType.LINEAR) {
		const frames: KeyframeLinear[] = [];
		for (let i = 0; i < numKeyframes; i++) {
			if (int16) {
				const time = view.getUint16(p + 0x00, true);
				const value = view.getInt16(p + 0x02, true) * ANGLE_SCALE;
				p += 0x04;
				frames.push({time, value});
			} else {
				const time = view.getUint32(p + 0x00, true);
				const value = view.getFloat32(p + 0x04, true);
				p += 0x08;
				frames.push({time, value});
			}
		}
		return {type, frames};
	} else if (type === AnimationTrackType.HERMITE) {
		const frames: KeyframeHermite[] = [];
		for (let i = 0; i < numKeyframes; i++) {
			if (int16) {
				const time = view.getUint16(p + 0x00, true);
				const value = view.getInt16(p + 0x02, true) * ANGLE_SCALE;
				const tangentIn = view.getInt16(p + 0x04, true) * ANGLE_SCALE;
				const tangentOut = view.getInt16(p + 0x06, true) * ANGLE_SCALE;
				p += 0x08;
				frames.push({time, value, tangentIn, tangentOut});
			} else {
				const time = view.getUint32(p + 0x00, true);
				const value = view.getFloat32(p + 0x04, true);
				const tangentIn = view.getFloat32(p + 0x08, true);
				const tangentOut = view.getFloat32(p + 0x0c, true);
				p += 0x10;
				frames.push({time, value, tangentIn, tangentOut});
			}
		}
		return {type, timeEnd, frames};
	} else {
		throw new Error(`csab: unsupported track type ${type}`);
	}
}

// Majora's Mask 3D (CSAB subversion 0x05) track format. Differs from Ocarina:
// the header is u8 type, u8 isBaked, u16 keyframeCount, then either a
// scale/bias-quantised value list (LINEAR / baked) or full float hermite frames.
// Values (including rotations, in radians) are decoded straight from scale/bias,
// so there is no int16-angle path here.
function parseTrackMajora(view: DataView, offs: number): AnimationTrack {
	let type = view.getUint8(offs + 0x00);
	const isBaked = view.getUint8(offs + 0x01) !== 0;
	const numKeyframes = view.getUint16(offs + 0x02, true);

	if (isBaked || type === AnimationTrackType.LINEAR) {
		type = AnimationTrackType.LINEAR;
		const scale = view.getFloat32(offs + 0x04, true);
		const bias = view.getFloat32(offs + 0x08, true);
		const frames: KeyframeLinear[] = [];
		let p = offs + 0x0c;
		for (let i = 0; i < numKeyframes; i++) {
			frames.push({time: i, value: view.getUint16(p, true) * scale - bias});
			p += 0x02;
		}
		return {type, frames};
	} else if (type === AnimationTrackType.HERMITE) {
		const timeEnd = view.getInt16(offs + 0x06, true) + 1;
		const frames: KeyframeHermite[] = [];
		let p = offs + 0x10;
		for (let i = 0; i < numKeyframes; i++) {
			frames.push({
				time: view.getUint32(p + 0x00, true),
				value: view.getFloat32(p + 0x04, true),
				tangentIn: view.getFloat32(p + 0x08, true),
				tangentOut: view.getFloat32(p + 0x0c, true),
			});
			p += 0x10;
		}
		return {type, timeEnd, frames};
	} else {
		throw new Error(`csab: unsupported majora track type ${type}`);
	}
}

function parseAnod(
	view: DataView,
	offs: number,
	parseOne: (rel: number, int16: boolean) => AnimationTrack | null
): AnimationNode {
	// magic 'anod' at +0x00
	const boneIndex = view.getUint16(offs + 0x04, true);
	const isRotationInt16 = view.getUint16(offs + 0x06, true) !== 0;
	const translationX = parseOne(view.getUint16(offs + 0x08, true), false);
	const translationY = parseOne(view.getUint16(offs + 0x0a, true), false);
	const translationZ = parseOne(view.getUint16(offs + 0x0c, true), false);
	const rotationX = parseOne(view.getUint16(offs + 0x0e, true), isRotationInt16);
	const rotationY = parseOne(view.getUint16(offs + 0x10, true), isRotationInt16);
	const rotationZ = parseOne(view.getUint16(offs + 0x12, true), isRotationInt16);
	const scaleX = parseOne(view.getUint16(offs + 0x14, true), false);
	const scaleY = parseOne(view.getUint16(offs + 0x16, true), false);
	const scaleZ = parseOne(view.getUint16(offs + 0x18, true), false);
	return {
		boneIndex,
		translationX,
		translationY,
		translationZ,
		rotationX,
		rotationY,
		rotationZ,
		scaleX,
		scaleY,
		scaleZ,
	};
}

export function parseCSAB(buffer: ArrayBuffer): CSAB {
	// Some clips truncate the final keyframe's trailing (zero) bytes right at EOF.
	// Pad with a few zero bytes so near-end reads stay in-bounds.
	const padded = new Uint8Array(buffer.byteLength + 16);
	padded.set(new Uint8Array(buffer));
	const view = new DataView(padded.buffer);
	const magic = String.fromCharCode(
		view.getUint8(0),
		view.getUint8(1),
		view.getUint8(2),
		view.getUint8(3)
	);
	if (magic !== "csab") throw new Error(`csab: bad magic '${magic}'`);

	// subversion 0x03 = Ocarina of Time 3D, 0x05 = Majora's Mask 3D. The two have
	// different header layouts, anod-table base offsets, and per-track encodings.
	const subversion = view.getUint32(0x08, true);
	const majora = subversion === 0x05;
	const durationOffs = majora ? 0x34 : 0x28;
	const anodCountOffs = majora ? 0x3c : 0x30;
	const boneCountOffs = majora ? 0x40 : 0x34;
	const boneTableOffs = majora ? 0x44 : 0x38;
	const anodBase = majora ? 0x24 : 0x18;

	const duration = view.getUint32(durationOffs, true) + 1;
	const anodCount = view.getUint32(anodCountOffs, true);
	const boneCount = view.getUint32(boneCountOffs, true);

	const boneToAnimationTable = new Int16Array(boneCount);
	let p = boneTableOffs;
	for (let i = 0; i < boneCount; i++) {
		boneToAnimationTable[i] = view.getInt16(p, true);
		p += 0x02;
	}

	// anod offset table is 4-byte aligned; offsets are relative to anodBase.
	let anodTableIdx = (p + 3) & ~3;
	const animationNodes: AnimationNode[] = [];
	for (let i = 0; i < anodCount; i++) {
		const offs = anodBase + view.getUint32(anodTableIdx, true);
		const parseOne = (rel: number, int16: boolean): AnimationTrack | null =>
			rel !== 0 ? (majora ? parseTrackMajora(view, offs + rel) : parseTrack(view, offs + rel, int16)) : null;
		animationNodes.push(parseAnod(view, offs, parseOne));
		anodTableIdx += 0x04;
	}

	return {duration, animationNodes, boneToAnimationTable};
}

// ---- sampling -------------------------------------------------------------

function mod(a: number, b: number): number {
	return ((a % b) + b) % b;
}

function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

const TAU = Math.PI * 2;
function lerpAngle(v0: number, v1: number, t: number): number {
	const da = mod(v1 - v0, TAU);
	const dist = mod(2 * da, TAU) - da;
	return v0 + dist * t;
}

function getPointHermite(p0: number, p1: number, s0: number, s1: number, t: number): number {
	const cf0 = p0 * 2 + p1 * -2 + s0 * 1 + s1 * 1;
	const cf1 = p0 * -3 + p1 * 3 + s0 * -2 + s1 * -1;
	const cf2 = s0;
	const cf3 = p0;
	return ((cf0 * t + cf1) * t + cf2) * t + cf3;
}

function sampleLinear(track: TrackLinear, frame: number, angle: boolean): number {
	const f = track.frames;
	const idx1 = f.findIndex((k) => frame < k.time);
	if (idx1 === 0) return f[0].value;
	if (idx1 < 0) return f[f.length - 1].value;
	const k0 = f[idx1 - 1];
	const k1 = f[idx1];
	const t = (frame - k0.time) / (k1.time - k0.time);
	return angle ? lerpAngle(k0.value, k1.value, t) : lerp(k0.value, k1.value, t);
}

function sampleHermite(track: TrackHermite, frame: number): number {
	const f = track.frames;
	const idx1 = f.findIndex((k) => frame < k.time);
	let k0: KeyframeHermite;
	let k1: KeyframeHermite;
	if (idx1 <= 0) {
		k0 = f[f.length - 1];
		k1 = f[0];
	} else {
		k0 = f[idx1 - 1];
		k1 = f[idx1];
	}
	const length = mod(k1.time - k0.time, track.timeEnd);
	const t = length === 0 ? 0 : (frame - k0.time) / length;
	const s0 = k0.tangentOut * length;
	const s1 = k1.tangentIn * length;
	return getPointHermite(k0.value, k1.value, s0, s1, t);
}

function sample(track: AnimationTrack, frame: number, angle: boolean): number {
	return track.type === AnimationTrackType.LINEAR
		? sampleLinear(track, frame, angle)
		: sampleHermite(track, frame);
}

export interface RestBone {
	id: number;
	parent: number;
	s: [number, number, number];
	r: [number, number, number];
	t: [number, number, number];
}

// Fills `dst` with the bone's animated *local* matrix in CMB space, matching
// noclip's calcBoneMatrix: start from the rest TRS, override any component that
// the animation drives, then build an SRT matrix (rotation order matches the
// game / the values baked into the DAE).
export function calcBoneLocalMatrix(
	dst: Matrix4,
	bone: RestBone,
	csab: CSAB | null,
	frame: number
): void {
	let [sx, sy, sz] = bone.s;
	let [rx, ry, rz] = bone.r;
	let [tx, ty, tz] = bone.t;

	if (csab) {
		const animIndex = csab.boneToAnimationTable[bone.id];
		if (animIndex >= 0) {
			const n = csab.animationNodes[animIndex];
			if (n.scaleX) sx = sample(n.scaleX, frame, false);
			if (n.scaleY) sy = sample(n.scaleY, frame, false);
			if (n.scaleZ) sz = sample(n.scaleZ, frame, false);
			if (n.rotationX) rx = sample(n.rotationX, frame, true);
			if (n.rotationY) ry = sample(n.rotationY, frame, true);
			if (n.rotationZ) rz = sample(n.rotationZ, frame, true);
			if (n.translationX) tx = sample(n.translationX, frame, false);
			if (n.translationY) ty = sample(n.translationY, frame, false);
			if (n.translationZ) tz = sample(n.translationZ, frame, false);
		}
	}

	const sX = Math.sin(rx),
		cX = Math.cos(rx);
	const sY = Math.sin(ry),
		cY = Math.cos(ry);
	const sZ = Math.sin(rz),
		cZ = Math.cos(rz);

	const e = dst.elements; // column-major
	e[0] = sx * (cY * cZ);
	e[1] = sx * (sZ * cY);
	e[2] = sx * -sY;
	e[3] = 0;
	e[4] = sy * (sX * cZ * sY - cX * sZ);
	e[5] = sy * (sX * sZ * sY + cX * cZ);
	e[6] = sy * (sX * cY);
	e[7] = 0;
	e[8] = sz * (cX * cZ * sY + sX * sZ);
	e[9] = sz * (cX * sZ * sY - sX * cZ);
	e[10] = sz * (cX * cY);
	e[11] = 0;
	e[12] = tx;
	e[13] = ty;
	e[14] = tz;
	e[15] = 1;
}
