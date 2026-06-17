import {useEffect, useRef, useState} from "react";
import {
	AmbientLight,
	BackSide,
	Box3,
	BoxGeometry,
	Color,
	DirectionalLight,
	DoubleSide,
	Group,
	Matrix3,
	Matrix4,
	Mesh,
	MeshBasicMaterial,
	PerspectiveCamera,
	Plane,
	Scene,
	SkinnedMesh,
	SRGBColorSpace,
	Texture,
	TextureLoader,
	Vector3,
	WebGLRenderer,
	type Bone,
	type Side,
	type Skeleton,
} from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import {ColladaLoader} from "three/examples/jsm/loaders/ColladaLoader.js";
import {calcBoneLocalMatrix, parseCSAB, type CSAB, type RestBone} from "./csab";

// Selectable face-expression ids (link_e00 … link_e07 / link_zora_e00 …).
const FACE_IDS = Array.from({length: 8}, (_, i) => String(i).padStart(2, "0"));

// Optional per-model face-swapping config. `dir` holds the link_e<NN>.png files,
// `node` is the model node whose material map is hot-swapped, `prefix` is the
// texture basename before the id (e.g. "link_e" or "link_zora_e").
interface FaceConfig {
	dir: string;
	prefix: string;
	node: string;
	default: string;
}

// A separate model (e.g. Zora's guitar) that the game draws parented to one of
// the main skeleton's bones. We load it and attach it to that bone so it rides
// the animation. `boneCmbId` is the cmb bone id of the holding limb; `offset` is
// an optional column-major-16 local transform applied between the bone and the
// attachment (for fine-positioning the grip).
interface Attachment {
	url: string;
	boneCmbId: number;
	offset?: number[];
}

interface ClipDef {
	key: string;
	label: string;
	url: string;
}

interface ModelDef {
	key: string;
	label: string;
	modelUrl: string;
	skeletonUrl: string;
	clips: ClipDef[];
	face?: FaceConfig;
	attachment?: Attachment;
}

// Switchable models. Each pairs a Collada mesh with the cmb-derived skeleton.json
// and one or more CSAB clips (OoT3D okarina swing for Adult, MM3D Zora guitar
// animations for Zora).
const MODELS: ModelDef[] = [
	{
		key: "adult",
		label: "Adult Link",
		modelUrl: "/models/link-adult/Adult Link.dae",
		skeletonUrl: "/models/link-adult/anim/skeleton.json",
		clips: [{key: "okarina", label: "Okarina", url: "/models/link-adult/anim/nml_okarina_swing.csab"}],
		face: {dir: "/models/link-adult", prefix: "link_e", node: "nodes_141_", default: "02"},
	},
	{
		key: "zora",
		label: "Zora Link",
		modelUrl: "/models/link-zora/Zora Link.dae",
		skeletonUrl: "/models/link-zora/anim/skeleton.json",
		clips: [
			{key: "play", label: "Play", url: "/models/link-zora/anim/pz_gakkiplay.csab"},
			{key: "start", label: "Start", url: "/models/link-zora/anim/pz_gakkistart.csab"},
			{key: "wait", label: "Wait", url: "/models/link-zora/anim/pz_gakkiwait.csab"},
			{key: "demo", label: "Demo", url: "/models/link-zora/anim/pz_gakki_demo.csab"},
		],
		// The guitar is a separate model the game holds in Zora's right hand
		// (skeleton bone 17, the right-arm leaf). It parents to that bone and rides
		// the strum animation.
		attachment: {url: "/models/link-zora/link_zora_gakki/link_zora_gakki.dae", boneCmbId: 17},
	},
	{
		key: "deku",
		label: "Deku Link",
		modelUrl: "/models/link-deku/Deku Link.dae",
		skeletonUrl: "/models/link-deku/anim/skeleton.json",
		clips: [
			{key: "play", label: "Play", url: "/models/link-deku/anim/pn_gakkiplay.csab"},
			{key: "start", label: "Start", url: "/models/link-deku/anim/pn_gakkistart.csab"},
			{key: "wait", label: "Wait", url: "/models/link-deku/anim/pn_gakkiwait.csab"},
		],
		// The Deku pipes are a separate model held up to the face. Like Zora's guitar
		// it parents to a hand leaf bone (skeleton bone 17) and rides the play clip.
		attachment: {url: "/models/link-deku/link_deknuts_gakki/link_deknuts_gakki.dae", boneCmbId: 17},
	},
];

const FPS = 30;

// Skybox built from public/models/skybox. The four side strips are 2:1 (twice as
// wide as tall), so the surrounding box is twice as wide as it is tall — a cube
// texture would squash them. We map the images onto a BoxGeometry's faces with
// BackSide so we see them from inside.
const SKY_DIR = "/models/skybox";
// One entry per BoxGeometry face, in three's fixed order [+X, -X, +Y, -Y, +Z, -Z].
// The four side strips wrap the vertical faces going around the box, top.png caps
// +Y, and the never-seen ground (-Y) is left as a flat color (null). If the
// panorama seams don't line up, rotate the four side names within this array.
const SKY_FACES: (string | null)[] = ["side2", "side4", "top", null, "side1", "side3"];
const SKY_GROUND_COLOR = 0x14161d;
// How far below eye level the mirror split sits, as a fraction of the skybox's
// (camera-following) scale. 0 = eye level / horizon centered; larger drops it.
const SKY_SPLIT_DROP = 0.22;

// --- cinematic camera path -------------------------------------------------
// A scripted fly-in: opens way zoomed out directly behind the character and
// dramatically zooms in to a close behind-the-back shot, then orbits around so
// the side comes into view and finally the front.
//
// Keyframes are authored in spherical coordinates around a look-at target, so
// both the zoom-in and the orbit are just azimuth/elevation/distance
// interpolation (a straight position lerp would cut through the model on the
// orbit). Orientation has two tunables: if the shot opens facing the character
// instead of their back, add 180 to BACK_AZIMUTH; if it circles to the right
// instead of the left, flip ORBIT_DIR.
const DEG = Math.PI / 180;
const BACK_AZIMUTH = 180; // azimuth in degrees (0 = +Z) at which the camera sits behind the character
const ORBIT_DIR = -1; // +1 / -1: which way to circle from behind toward the front

interface CamKey {
	t: number; // seconds from the start of the shot
	azimuth: number; // degrees around Y (0 = +Z), authored continuously so the orbit direction is explicit
	elevation: number; // degrees above the horizon; camera looks down when > 0
	radius: number; // distance from the look-at target, in model radii
	look: [number, number, number]; // look-at offset from the model center, in model radii
	// Where the subject sits in frame, roughly in screen halves from center
	// (+x right, +y up). [0,0] = centered. Shifts only the aim, not the position,
	// so the subject can ride toward a corner. Defaults to [0,0].
	screen?: [number, number];
}

const CAMERA_PATH: CamKey[] = [
	// Establishing: high above and behind, angled down and to the left so the
	// character first appears at the top-right corner. The camera then descends.
	{t: 0, azimuth: BACK_AZIMUTH, elevation: 30, radius: 40, look: [0, 0.1, 0], screen: [0.6, 0.4]},
	// Dramatic descent + zoom in to a close behind-the-back shot, recentering him.
	{t: 3.5, azimuth: BACK_AZIMUTH, elevation: 9, radius: 2.3, look: [0, 0.2, 0], screen: [0, 0]},
	// One continuous orbit from behind, past the side, around to the front (no
	// intermediate keyframe, so it doesn't decelerate to a stop at the side).
	{t: 8.5, azimuth: BACK_AZIMUTH + ORBIT_DIR * 180, elevation: 6, radius: 2.5, look: [0, 0.17, 0]},
];

// Editable axes for the debug camera panel. Target offsets and zoom are authored
// in model radii (matching CamKey.look / CamKey.radius), and az/el use the same
// convention as the path (azimuth 0 = +Z, elevation above the horizon), so values
// read off the sliders can be pasted straight into a CAMERA_PATH keyframe.
const CAM_FIELDS = [
	{key: "tx", label: "target x", min: -3, max: 3, step: 0.01, digits: 2},
	{key: "ty", label: "target y", min: -3, max: 3, step: 0.01, digits: 2},
	{key: "tz", label: "target z", min: -3, max: 3, step: 0.01, digits: 2},
	{key: "az", label: "yaw°", min: 0, max: 360, step: 0.5, digits: 1},
	{key: "el", label: "pitch°", min: -89, max: 89, step: 0.5, digits: 1},
	{key: "roll", label: "roll°", min: -180, max: 180, step: 0.5, digits: 1},
	{key: "dist", label: "dist (r)", min: 0.3, max: 40, step: 0.05, digits: 2},
	{key: "zoom", label: "zoom×", min: 0.2, max: 8, step: 0.05, digits: 2},
	{key: "fov", label: "fov°", min: 15, max: 90, step: 1, digits: 0},
] as const;
type CamField = (typeof CAM_FIELDS)[number]["key"];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
// Smoothstep: eases in and out of every segment so accel/decel feels natural.
const easeInOut = (t: number) => t * t * (3 - 2 * t);

// Sample the path at time tSec. Writes the camera position into outPos, the
// framing point we orbit/center on into outTarget, and the actual look-at point
// (outTarget shifted by the keyframe's screen offset) into outAim. Returns true
// once the shot has reached its final frame.
const _camDir = new Vector3();
const _view = new Vector3();
const _right = new Vector3();
const _up = new Vector3();
const _WORLD_UP = new Vector3(0, 1, 0);
function sampleCameraPath(
	tSec: number,
	center: Vector3,
	radius: number,
	outPos: Vector3,
	outTarget: Vector3,
	outAim: Vector3
): boolean {
	let i = 0;
	while (i < CAMERA_PATH.length - 1 && tSec > CAMERA_PATH[i + 1].t) i++;
	const a = CAMERA_PATH[i];
	const b = CAMERA_PATH[Math.min(i + 1, CAMERA_PATH.length - 1)];
	const span = b.t - a.t;
	const u = easeInOut(span > 0 ? Math.min(Math.max((tSec - a.t) / span, 0), 1) : 1);

	const az = lerp(a.azimuth, b.azimuth, u) * DEG;
	const el = lerp(a.elevation, b.elevation, u) * DEG;
	const dist = lerp(a.radius, b.radius, u) * radius;
	outTarget.set(
		center.x + lerp(a.look[0], b.look[0], u) * radius,
		center.y + lerp(a.look[1], b.look[1], u) * radius,
		center.z + lerp(a.look[2], b.look[2], u) * radius
	);
	const ce = Math.cos(el);
	_camDir.set(ce * Math.sin(az), Math.sin(el), ce * Math.cos(az));
	outPos.copy(outTarget).addScaledVector(_camDir, dist);

	// Screen offset: aim away from the subject by (sx,sy) of the view plane so it
	// renders toward the opposite corner. Scaled by distance so it stays put in
	// frame as the camera dollies in.
	const sx = lerp(a.screen?.[0] ?? 0, b.screen?.[0] ?? 0, u);
	const sy = lerp(a.screen?.[1] ?? 0, b.screen?.[1] ?? 0, u);
	if (sx === 0 && sy === 0) {
		outAim.copy(outTarget);
	} else {
		_view.copy(outTarget).sub(outPos).normalize();
		_right.crossVectors(_view, _WORLD_UP).normalize();
		_up.crossVectors(_right, _view).normalize();
		outAim
			.copy(outTarget)
			.addScaledVector(_right, -sx * dist)
			.addScaledVector(_up, -sy * dist);
	}
	return tSec >= CAMERA_PATH[CAMERA_PATH.length - 1].t;
}

// Label a mesh by its texture filename (the only meaningful identifier the rip
// carries), e.g. "link_e00", "p_tex08". Falls back to the node name.
function meshLabel(mesh: SkinnedMesh): string {
	const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as {
		map?: {image?: {src?: string}; name?: string} | null;
	};
	const src = mat?.map?.image?.src ?? mat?.map?.name ?? "";
	const m = src.match(/([^/\\]+?)\.png/i);
	return m ? m[1] : mesh.name || "mesh";
}

// Link's head/body is built from separate pieces (face, hair, ears…), each with
// its own material. Where two pieces meet, their coincident vertices carry
// independent normals computed only from their own faces, so lighting breaks
// across the seam. This welds normals across pieces — for every group of
// vertices sharing a position (in bind-pose world space), it averages their
// normals and writes the result back into each piece. Same effect as Blender's
// "Merge by Distance + Shade Smooth", but geometry and materials stay separate.
// Requires the meshes' world matrices to be up to date (call after a bind pose +
// scene.updateMatrixWorld).
function weldNormals(meshes: SkinnedMesh[]) {
	const pos = new Vector3();
	const nrm = new Vector3();
	const min = new Vector3(Infinity, Infinity, Infinity);
	const max = new Vector3(-Infinity, -Infinity, -Infinity);

	const usable = meshes.filter((m) => m.geometry.attributes.position && m.geometry.attributes.normal);
	for (const mesh of usable) {
		const p = mesh.geometry.attributes.position;
		for (let i = 0; i < p.count; i++) {
			pos.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld);
			min.min(pos);
			max.max(pos);
		}
	}
	// Quantize positions to a grid fine enough to only catch truly coincident
	// vertices, scaled to the model so it works regardless of unit size.
	const inv = 1 / (max.distanceTo(min) * 1e-4 || 1);
	const key = (v: Vector3) => `${Math.round(v.x * inv)},${Math.round(v.y * inv)},${Math.round(v.z * inv)}`;

	// World-space normal matrices (and their inverses, to map averaged normals
	// back into each mesh's local space).
	const normalMat = new Map<SkinnedMesh, Matrix3>();
	const invNormalMat = new Map<SkinnedMesh, Matrix3>();
	for (const mesh of usable) {
		const nm = new Matrix3().getNormalMatrix(mesh.matrixWorld);
		normalMat.set(mesh, nm);
		invNormalMat.set(mesh, nm.clone().invert());
	}

	const buckets = new Map<string, {sum: Vector3; recs: {mesh: SkinnedMesh; i: number}[]}>();
	for (const mesh of usable) {
		const p = mesh.geometry.attributes.position;
		const n = mesh.geometry.attributes.normal;
		const nm = normalMat.get(mesh)!;
		for (let i = 0; i < p.count; i++) {
			pos.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld);
			nrm.fromBufferAttribute(n, i).applyMatrix3(nm).normalize();
			const k = key(pos);
			let b = buckets.get(k);
			if (!b) buckets.set(k, (b = {sum: new Vector3(), recs: []}));
			b.sum.add(nrm);
			b.recs.push({mesh, i});
		}
	}

	const out = new Vector3();
	for (const b of buckets.values()) {
		if (b.recs.length < 2 || b.sum.lengthSq() === 0) continue;
		b.sum.normalize();
		for (const {mesh, i} of b.recs) {
			out.copy(b.sum).applyMatrix3(invNormalMat.get(mesh)!).normalize();
			const n = mesh.geometry.attributes.normal;
			n.setXYZ(i, out.x, out.y, out.z);
			n.needsUpdate = true;
		}
	}
}

// Parts are sorted into organizational categories. The category is just a tag —
// it does not affect visibility, which is toggled independently per part.
type PartCategory = "active" | "safe" | "deleted";
// Display order of the category groups in the Parts panel.
const CATEGORIES: PartCategory[] = ["safe", "active", "deleted"];

interface Layer {
	key: string;
	count: number;
	visible: boolean;
	category: PartCategory;
}

// Parts visibility/category persistence is namespaced per model so switching
// models keeps each one's toggles separate.
const partsKey = (modelKey: string) => `ocarina.animPartsVisibility.${modelKey}`;
const categoryKey = (modelKey: string) => `ocarina.animPartsCategory.${modelKey}`;

function loadJsonRecord<T>(storageKey: string): Record<string, T> {
	const raw = localStorage.getItem(storageKey);
	if (!raw) return {};
	try {
		return JSON.parse(raw) as Record<string, T>;
	} catch {
		return {};
	}
}

function savePartsState(layers: Layer[], modelKey: string) {
	const visibility: Record<string, boolean> = {};
	const category: Record<string, PartCategory> = {};
	for (const l of layers) {
		visibility[l.key] = l.visible;
		if (l.category !== "active") category[l.key] = l.category;
	}
	localStorage.setItem(partsKey(modelKey), JSON.stringify(visibility));
	localStorage.setItem(categoryKey(modelKey), JSON.stringify(category));
}

const PARTS_FILE_TYPE = "ocarina-anim-parts";

interface PartEntry {
	key: string;
	visible: boolean;
	category: PartCategory;
	// Legacy field from earlier exports; mapped to category "deleted" on import.
	deleted?: boolean;
}

// JSON dump of the current visibility + category state, for saving/sharing and
// re-importing later.
function partsToJson(layers: Layer[]): string {
	const parts: PartEntry[] = layers.map((l) => ({key: l.key, visible: l.visible, category: l.category}));
	return JSON.stringify({type: PARTS_FILE_TYPE, version: 2, parts}, null, 2);
}

// Pull a key -> entry map out of an imported file. Accepts both the wrapped
// {type, parts} shape and a bare array of part entries.
function parsePartsJson(text: string): Map<string, Partial<PartEntry>> {
	const data = JSON.parse(text) as unknown;
	const parts = Array.isArray(data) ? data : (data as {parts?: unknown})?.parts;
	if (!Array.isArray(parts)) throw new Error("no parts array found");
	const map = new Map<string, Partial<PartEntry>>();
	for (const p of parts as Partial<PartEntry>[]) {
		if (p && typeof p.key === "string") map.set(p.key, p);
	}
	return map;
}

interface SkeletonData {
	boneCount: number;
	bones: RestBone[];
	G: number[];
	cmbIdToDaeNum: Record<string, number>;
	// Optional per-cmb-bone retarget matrices (column-major 16). Present when the
	// dae's bind orientation differs from G*cmbBind (e.g. Zora): K post-multiplies
	// the posed bone world matrix and Dinv replaces the cmb-derived bind inverse.
	// Absent for models whose dae bind already matches (Adult), where K would be I.
	K?: Record<string, number[]>;
	Dinv?: Record<string, number[]>;
}

export default function AnimPage() {
	const containerRef = useRef<HTMLDivElement>(null);
	const [status, setStatus] = useState("Loading model…");
	const [playing, setPlaying] = useState(true);
	const [speed, setSpeed] = useState(0.5);
	const [layers, setLayers] = useState<Layer[]>([]);
	const [exported, setExported] = useState(false);
	const [modelKey, setModelKey] = useState(MODELS[0].key);
	const model = MODELS.find((m) => m.key === modelKey) ?? MODELS[0];
	const [clipKey, setClipKey] = useState(model.clips[0].key);
	const [face, setFace] = useState(model.face?.default ?? FACE_IDS[0]);
	const [camPlaying, setCamPlaying] = useState(false);

	// Swaps the active CSAB clip without rebuilding the scene; set inside the main
	// effect, called by the clip-selection effect below.
	const loadClipRef = useRef<(url: string) => void>(() => {});

	// Current model's face config, refreshed when the scene (re)loads, so applyFace
	// targets the right textures/material regardless of which model is showing.
	const faceCfgRef = useRef<FaceConfig | undefined>(model.face);

	// Start time (performance.now timebase) of the running cinematic shot, or null
	// when OrbitControls is in charge. Read by the render loop without restarting it.
	const camStartRef = useRef<number | null>(null);

	// Editable camera panel. The slider inputs and their value labels are driven
	// directly through these refs (no per-frame React re-render): the render loop
	// writes the live camera values into them, and dragging a slider calls back
	// into the effect via applyCamRef to move the camera. editingCamRef suppresses
	// the loop's write-back while a slider is being dragged so it doesn't fight the
	// drag.
	const camInputsRef = useRef<Partial<Record<CamField, HTMLInputElement | null>>>({});
	const camNumbersRef = useRef<Partial<Record<CamField, HTMLInputElement | null>>>({});
	const editingCamRef = useRef(false);
	const editCamRef = useRef<(key: CamField, raw: string) => void>(() => {});
	const resetCamRef = useRef<() => void>(() => {});

	// Live values the animation loop reads without restarting the effect.
	const playingRef = useRef(true);
	playingRef.current = playing;
	const speedRef = useRef(0.5);
	speedRef.current = speed;

	// Texture-keyed groups of meshes, populated after the model loads.
	const groupsRef = useRef<Map<string, SkinnedMesh[]>>(new Map());

	// Face material(s) whose texture map we hot-swap, plus the original (e00)
	// texture to copy color/wrap settings from. The last swapped-in texture is
	// tracked so it can be disposed when replaced.
	type FaceMat = {map: Texture | null; needsUpdate: boolean};
	const faceMaterialsRef = useRef<{mat: FaceMat; base: Texture | null}[]>([]);
	const swappedFaceTexRef = useRef<Texture | null>(null);

	const applyFace = (id: string) => {
		const entries = faceMaterialsRef.current;
		const cfg = faceCfgRef.current;
		if (!entries.length || !cfg) return;
		new TextureLoader().load(`${cfg.dir}/${cfg.prefix}${id}.png`, (tex) => {
			const base = entries[0].base;
			tex.colorSpace = base?.colorSpace ?? SRGBColorSpace;
			tex.flipY = base?.flipY ?? false;
			if (base) {
				tex.wrapS = base.wrapS;
				tex.wrapT = base.wrapT;
			}
			tex.needsUpdate = true;
			for (const {mat} of entries) {
				mat.map = tex;
				mat.needsUpdate = true;
			}
			swappedFaceTexRef.current?.dispose();
			swappedFaceTexRef.current = tex;
		});
	};

	const setLayerVisible = (key: string, visible: boolean) => {
		groupsRef.current.get(key)?.forEach((m) => (m.visible = visible));
		setLayers((prev) => prev.map((l) => (l.key === key ? {...l, visible} : l)));
	};
	const setAllVisible = (visible: boolean) => {
		groupsRef.current.forEach((ms) => ms.forEach((m) => (m.visible = visible)));
		setLayers((prev) => prev.map((l) => ({...l, visible})));
	};
	// Move a part into another category (purely organizational; does not affect
	// visibility).
	const setLayerCategory = (key: string, category: PartCategory) => {
		setLayers((prev) => prev.map((l) => (l.key === key ? {...l, category} : l)));
	};

	// Persist visibility + deleted state whenever it changes (skips the initial
	// empty state).
	useEffect(() => {
		if (layers.length > 0) savePartsState(layers, modelKey);
	}, [layers, modelKey]);

	const exportToggles = () => {
		const json = partsToJson(layers);
		const ok = () => {
			setExported(true);
			setTimeout(() => setExported(false), 1500);
		};
		navigator.clipboard?.writeText(json).then(ok, () => window.prompt("Parts JSON:", json));
	};

	const importToggles = async () => {
		try {
			const text = await navigator.clipboard.readText();
			const incoming = parsePartsJson(text);
			setLayers((prev) =>
				prev.map((l) => {
					const p = incoming.get(l.key);
					if (!p) return l;
					const visible = p.visible ?? l.visible;
					const category = p.category ?? (p.deleted ? "deleted" : l.category);
					groupsRef.current.get(l.key)?.forEach((m) => (m.visible = visible));
					return {...l, visible, category};
				})
			);
		} catch (e) {
			window.alert("Import failed: " + (e instanceof Error ? e.message : String(e)));
		}
	};

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		// Resolve the selected model inside the effect so the closure isn't stale;
		// the effect re-runs (tearing down + rebuilding the scene) when modelKey
		// changes. faceCfgRef lets the out-of-effect applyFace find this model's config.
		const model = MODELS.find((m) => m.key === modelKey) ?? MODELS[0];
		faceCfgRef.current = model.face;
		// Reset transient UI for the incoming model (parts rebuild once it loads).
		setStatus("Loading model…");
		setLayers([]);
		setFace(model.face?.default ?? FACE_IDS[0]);

		let disposed = false;
		const renderer = new WebGLRenderer({antialias: true});
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.localClippingEnabled = true; // for the skybox split plane
		const scene = new Scene();
		scene.background = new Color(0x14161d);
		const camera = new PerspectiveCamera(45, 1, 1, 100000);
		const controls = new OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;

		scene.add(new AmbientLight(0xffffff, 1.4));
		const key = new DirectionalLight(0xffffff, 2.0);
		key.position.set(1, 2, 1.5);
		scene.add(key);
		const fill = new DirectionalLight(0xbfd4ff, 0.8);
		fill.position.set(-1.5, 0.5, -1);
		scene.add(fill);

		// --- skybox ----------------------------------------------------------------
		// Unlit box (twice as wide as tall) viewed from the inside. It rides with the
		// camera each frame and is scaled to sit just inside the far plane, so it reads
		// as an infinitely distant background you can never reach.
		//
		// A horizontal plane splits it at its vertical center — which, because the box
		// is centered on the camera, is always eye level. The real box fills the half
		// above the plane; a vertically-flipped copy fills the half below it. Since a
		// skybox depends only on view direction, the flipped copy is an exact mirror
		// of the top half, so the lower half of the view reflects the upper half.
		const skyLoader = new TextureLoader();
		const skyTextures: Texture[] = [];
		const skyTexByName = new Map<string, Texture>();
		const skyTexture = (name: string) => {
			let tex = skyTexByName.get(name);
			if (!tex) {
				tex = skyLoader.load(`${SKY_DIR}/${name}.png`);
				tex.colorSpace = SRGBColorSpace;
				skyTexByName.set(name, tex);
				skyTextures.push(tex);
			}
			return tex;
		};
		// Clipping planes (world space; their constants track eye level each frame).
		const clipTop = new Plane(new Vector3(0, 1, 0), 0); // keeps geometry above eye level
		const clipBottom = new Plane(new Vector3(0, -1, 0), 0); // keeps geometry below it
		const makeSkyMaterials = (side: Side, clip: Plane) =>
			SKY_FACES.map((name) =>
				name
					? new MeshBasicMaterial({map: skyTexture(name), side, depthWrite: false, clippingPlanes: [clip]})
					: new MeshBasicMaterial({color: SKY_GROUND_COLOR, side, depthWrite: false, clippingPlanes: [clip]})
			);

		const skyGeo = new BoxGeometry(1, 0.5, 1);
		const skyMaterials = makeSkyMaterials(BackSide, clipTop);
		// Mirror copy is flipped on Y (scale.y < 0), which reverses winding, so it
		// uses DoubleSide to stay visible from inside.
		const skyMirrorMaterials = makeSkyMaterials(DoubleSide, clipBottom);
		const skybox = new Mesh(skyGeo, skyMaterials);
		const skyMirror = new Mesh(skyGeo, skyMirrorMaterials);
		for (const m of [skybox, skyMirror]) {
			m.frustumCulled = false;
			m.renderOrder = -1;
			scene.add(m);
		}

		container.appendChild(renderer.domElement);

		const resize = () => {
			const w = container.clientWidth;
			const h = container.clientHeight;
			renderer.setSize(w, h);
			camera.aspect = w / h || 1;
			camera.updateProjectionMatrix();
		};
		resize();
		window.addEventListener("resize", resize);

		// --- skinning driven from the CMB skeleton + CSAB clips ----------------
		const G = new Matrix4();
			// G with the model's Z-up → three Y-up rotation baked in, used only to
			// build the posed bone world matrices (NOT the bind inverses). Applying
			// the rotation on just one side makes each skin matrix R·(original),
			// which rigidly rotates the whole result upright without distorting the
			// deformation. The world then stays Y-up so OrbitControls behaves normally.
			const Gp = new Matrix4();
		let restBones: RestBone[] = [];
		let daeNumToCmb = new Map<number, number>();
		const skeletons: Skeleton[] = [];
		const skinnedMeshes: SkinnedMesh[] = [];
		let clip: CSAB | null = null;
		// Model framing bounds, set once it loads: used to keep the camera's
		// near/far planes wrapped snugly around the model and to anchor the
		// cinematic camera path. Reused scratch vectors for the scripted shot.
		let modelRadius = 1;
		const modelCenter = new Vector3();
		const camPos = new Vector3();
		const camTarget = new Vector3();
		const camAim = new Vector3();
		const dbgDir = new Vector3(); // scratch for the camera panel readout
		// Default framing captured once the model loads, restored by the panel's reset.
		const defaultCamPos = new Vector3();
		const defaultCamTarget = new Vector3();
		let defaultFov = camera.fov;
		let defaultZoom = camera.zoom;

		// --- editable camera panel <-> camera plumbing -------------------------
		// Current camera state expressed in the panel's editable axes.
		const readCamParams = (): Record<CamField, number> => {
			dbgDir.copy(camera.position).sub(controls.target);
			const dist = dbgDir.length();
			return {
				tx: (controls.target.x - modelCenter.x) / modelRadius,
				ty: (controls.target.y - modelCenter.y) / modelRadius,
				tz: (controls.target.z - modelCenter.z) / modelRadius,
				az: (Math.atan2(dbgDir.x, dbgDir.z) / DEG + 360) % 360,
				el: dist > 0 ? Math.asin(dbgDir.y / dist) / DEG : 0,
				// Roll is applied as a post-rotation each frame (OrbitControls/lookAt
				// always level the camera), so it's panel-owned: echo the input back.
				roll: num("roll"),
				dist: dist / modelRadius,
				zoom: camera.zoom,
				fov: camera.fov,
			};
		};
		const num = (key: CamField) => parseFloat(camInputsRef.current[key]?.value ?? "0");
		// Mirror the (full-precision) slider values into the editable number boxes,
		// rounded for legibility.
		const writeNumbers = () => {
			for (const f of CAM_FIELDS) {
				const inp = camNumbersRef.current[f.key];
				if (inp) inp.value = num(f.key).toFixed(f.digits);
			}
		};
		// Push the live camera into the sliders + number boxes (used while the user
		// is not editing the panel, so orbit/cinematic motion stays reflected).
		const syncPanelFromCam = () => {
			const v = readCamParams();
			for (const f of CAM_FIELDS) {
				const inp = camInputsRef.current[f.key];
				if (inp) inp.value = String(v[f.key]);
			}
			writeNumbers();
		};
		// Drive the camera from the current slider values. No-op during the cinematic
		// shot, which owns the camera.
		const applyCamFromPanel = () => {
			if (camStartRef.current !== null) return;
			controls.target.set(
				modelCenter.x + num("tx") * modelRadius,
				modelCenter.y + num("ty") * modelRadius,
				modelCenter.z + num("tz") * modelRadius
			);
			const az = num("az") * DEG;
			const el = num("el") * DEG;
			const ce = Math.cos(el);
			dbgDir.set(ce * Math.sin(az), Math.sin(el), ce * Math.cos(az));
			camera.position.copy(controls.target).addScaledVector(dbgDir, num("dist") * modelRadius);
			const fov = num("fov");
			const zoom = num("zoom");
			if (camera.fov !== fov || camera.zoom !== zoom) {
				camera.fov = fov;
				camera.zoom = zoom;
				camera.updateProjectionMatrix();
			}
			controls.update();
			writeNumbers();
		};
		// Edit a single field from either its slider or its number box: clamp, write
		// the slider (the source of truth applyCamFromPanel reads), then apply.
		editCamRef.current = (key, raw) => {
			const f = CAM_FIELDS.find((x) => x.key === key);
			const v = parseFloat(raw);
			if (!f || Number.isNaN(v)) return;
			const inp = camInputsRef.current[key];
			if (inp) inp.value = String(Math.min(f.max, Math.max(f.min, v)));
			applyCamFromPanel();
		};
		// Restore the camera to the framing captured when the model loaded.
		resetCamRef.current = () => {
			if (camStartRef.current !== null) return; // cinematic owns the camera
			controls.target.copy(defaultCamTarget);
			camera.position.copy(defaultCamPos);
			if (camera.fov !== defaultFov || camera.zoom !== defaultZoom) {
				camera.fov = defaultFov;
				camera.zoom = defaultZoom;
				camera.updateProjectionMatrix();
			}
			// Roll isn't part of the captured framing; clear it explicitly.
			const rollInp = camInputsRef.current.roll;
			if (rollInp) rollInp.value = "0";
			controls.update();
			syncPanelFromCam();
		};

		// Per-cmb-id scratch matrices.
		const localM: Matrix4[] = [];
		const worldM: Matrix4[] = [];
		const gWorldBind: Matrix4[] = []; // G * restWorld
		const invBind: Matrix4[] = []; // inverse(G * restWorld)
		// Optional per-bone retarget matrices from skeleton.json (Zora). When present,
		// Km post-multiplies the posed bone world and Dm replaces invBind, so the
		// cmb-driven animation deforms a dae whose bind orientation differs from the
		// cmb's. Empty for models where the dae bind already matches (Adult).
		const Km: Matrix4[] = [];
		const Dm: Matrix4[] = []; // inverse(daeBindWorld)
		let useRetarget = false;
		const tmp = new Matrix4();

		const cmbIdOf = (bone: Bone): number | undefined => {
			const m = bone.name.match(/\d+/);
			if (!m) return undefined;
			return daeNumToCmb.get(parseInt(m[0], 10));
		};

		const computeRest = (sk: SkeletonData) => {
			restBones = sk.bones.slice().sort((a, b) => a.id - b.id);
			G.fromArray(sk.G);
			Gp.copy(G).premultiply(new Matrix4().makeRotationX(-Math.PI / 2));
			daeNumToCmb = new Map();
			for (const [cmbId, daeNum] of Object.entries(sk.cmbIdToDaeNum))
				daeNumToCmb.set(daeNum, parseInt(cmbId, 10));
			const Kj = sk.K;
			const Dinvj = sk.Dinv;
			useRetarget = !!(Kj && Dinvj);
			for (const b of restBones) {
				localM[b.id] = new Matrix4();
				worldM[b.id] = new Matrix4();
				gWorldBind[b.id] = new Matrix4();
				invBind[b.id] = new Matrix4();
				if (Kj && Dinvj) {
					Km[b.id] = new Matrix4().fromArray(Kj[b.id]);
					Dm[b.id] = new Matrix4().fromArray(Dinvj[b.id]);
				}
			}
			// Rest (bind) world matrices in CMB space, then G * that and its inverse.
			for (const b of restBones) {
				calcBoneLocalMatrix(localM[b.id], b, null, 0);
				if (b.parent < 0) worldM[b.id].copy(localM[b.id]);
				else worldM[b.id].multiplyMatrices(worldM[b.parent], localM[b.id]);
				gWorldBind[b.id].multiplyMatrices(G, worldM[b.id]);
				invBind[b.id].copy(gWorldBind[b.id]).invert();
			}
		};

		// Pose every skeleton for the given clip/frame.
		const pose = (csab: CSAB | null, frame: number) => {
			for (const b of restBones) {
				calcBoneLocalMatrix(localM[b.id], b, csab, frame);
				if (b.parent < 0) worldM[b.id].copy(localM[b.id]);
				else worldM[b.id].multiplyMatrices(worldM[b.parent], localM[b.id]);
			}
			for (const mesh of skinnedMeshes) {
				const bones = mesh.skeleton.bones;
				for (const bone of bones) {
					const cmbId = cmbIdOf(bone);
					if (cmbId === undefined) continue;
					// bone.matrixWorld = R * G * animatedWorld (Y-up world); pairs with
					// the plain-G bind inverses to give skin = R·(original deformation).
					bone.matrixWorld.multiplyMatrices(Gp, worldM[cmbId]);
					// Retarget (Zora): post-multiply by K so the cmb-space deformation is
					// re-expressed onto the dae's differently-oriented bind pose.
					if (useRetarget) bone.matrixWorld.multiply(Km[cmbId]);
				}
			}
			for (const sk of skeletons) sk.update();
		};

		const applyBoneInverses = () => {
			for (const mesh of skinnedMeshes) {
				const sk = mesh.skeleton;
				for (let j = 0; j < sk.bones.length; j++) {
					const cmbId = cmbIdOf(sk.bones[j]);
					if (cmbId === undefined) continue;
					// Dm = inverse(dae bind world) when retargeting; otherwise the
					// cmb-derived inverse(G*cmbBind), which equals it for Adult.
					sk.boneInverses[j].copy(useRetarget ? Dm[cmbId] : invBind[cmbId]);
				}
			}
		};

		// Load (or hot-swap) the active CSAB clip. Driven by the clip-selection
		// effect, so changing the animation doesn't rebuild the whole scene. The
		// render loop keeps its current frame, wrapped to the new clip's duration.
		loadClipRef.current = (url: string) => {
			void fetch(url)
				.then((r) => r.arrayBuffer())
				.then((buf) => {
					if (!disposed) clip = parseCSAB(buf);
				});
		};

		// --- load everything ---------------------------------------------------
		const start = async () => {
			const skJson: SkeletonData = await fetch(model.skeletonUrl).then((r) => r.json());
			computeRest(skJson);

			const collada = await new Promise<{scene: Scene}>((resolve, reject) => {
				new ColladaLoader().load(model.modelUrl, (c) => resolve(c as unknown as {scene: Scene}), undefined, reject);
			});
			if (disposed) return;

			const modelScene = collada.scene;
			modelScene.traverse((obj) => {
				if ((obj as SkinnedMesh).isSkinnedMesh) {
					const mesh = obj as SkinnedMesh;
					mesh.frustumCulled = false;
					skinnedMeshes.push(mesh);
					if (!skeletons.includes(mesh.skeleton)) skeletons.push(mesh.skeleton);
					// We set bone world matrices ourselves; stop three.js recomputing them.
					for (const bone of mesh.skeleton.bones) {
						bone.matrixAutoUpdate = false;
						bone.matrixWorldAutoUpdate = false;
					}
				}
			});
			scene.add(modelScene);
			applyBoneInverses();
			pose(null, 0); // bind pose

			// Held attachment (Zora's guitar): load the separate model and parent it to
			// the holding limb. three.js then rides it on that bone's posed matrixWorld
			// each frame — no extra per-frame bookkeeping needed. Its own skeleton stays
			// at bind pose (the strum clip only drives the body), so it renders rigidly.
			if (model.attachment) {
				const att = model.attachment;
				const attColl = await new Promise<{scene: Scene}>((resolve, reject) => {
					new ColladaLoader().load(att.url, (c) => resolve(c as unknown as {scene: Scene}), undefined, reject);
				});
				if (disposed) return;
				let handBone: Bone | undefined;
				for (const mesh of skinnedMeshes) {
					for (const bone of mesh.skeleton.bones) {
						if (cmbIdOf(bone) === att.boneCmbId) handBone = bone;
					}
				}
				attColl.scene.traverse((obj) => {
					if ((obj as SkinnedMesh).isSkinnedMesh) (obj as SkinnedMesh).frustumCulled = false;
				});
				if (handBone) {
					const holder = new Group();
					if (att.offset) {
						holder.matrix.fromArray(att.offset);
						holder.matrixAutoUpdate = false;
					}
					holder.add(attColl.scene);
					handBone.add(holder);
				}
			}

			// Smooth shading across the seams between separate head/body pieces by
			// averaging normals at coincident vertices (needs world matrices posed).
			scene.updateMatrixWorld(true);
			weldNormals(skinnedMeshes);

			// Group meshes by texture for the show/hide toggles, restoring any
			// previously saved visibility from localStorage.
			const groups = groupsRef.current;
			groups.clear();
			for (const mesh of skinnedMeshes) {
				const label = meshLabel(mesh);
				const arr = groups.get(label);
				if (arr) arr.push(mesh);
				else groups.set(label, [mesh]);
			}
			// Grab the face mesh's material (model.face.node, textured with e00) so the
			// expression dropdown can swap its map. Only models with a face config
			// (Adult) participate; matching by node name is reliable here since the
			// texture's image.src isn't populated yet.
			const faceMats: {mat: FaceMat; base: Texture | null}[] = [];
			if (model.face) {
				for (const mesh of skinnedMeshes) {
					if (mesh.name !== model.face.node) continue;
					const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as unknown as FaceMat;
					faceMats.push({mat, base: mat.map});
				}
			}
			faceMaterialsRef.current = faceMats;
			if (model.face && model.face.default !== FACE_IDS[0]) applyFace(model.face.default);

			const stored = loadJsonRecord<boolean>(partsKey(modelKey));
			const storedCategory = loadJsonRecord<PartCategory>(categoryKey(modelKey));
			setLayers(
				[...groups.entries()]
					.map(([key, ms]) => {
						const visible = stored[key] ?? true;
						const category = storedCategory[key] ?? "active";
						for (const m of ms) m.visible = visible;
						return {key, count: ms.length, visible, category};
					})
					.sort((a, b) => a.key.localeCompare(b.key))
			);

			// Frame the camera on the bind-pose bounds.
			scene.updateMatrixWorld(true);
			const box = new Box3();
			for (const mesh of skinnedMeshes) box.expandByObject(mesh);
			const size = box.getSize(new Vector3());
			const center = box.getCenter(new Vector3());
			const radius = Math.max(size.x, size.y, size.z) * 0.5 || 1;
			modelRadius = radius;
			modelCenter.copy(center);
			controls.target.copy(center);
			camera.position.set(center.x + radius * 0.4, center.y + radius * 0.2, center.z + radius * 3);
			// near/far are kept fitted to the camera distance every frame (see tick);
			// just seed them here so the first render is sane.
			camera.near = radius * 0.05;
			camera.far = radius * 50;
			camera.updateProjectionMatrix();
			controls.update();
			// Remember this framing so the panel's reset button can return to it.
			defaultCamTarget.copy(controls.target);
			defaultCamPos.copy(camera.position);
			defaultFov = camera.fov;
			defaultZoom = camera.zoom;

			setStatus("");
		};

		start().catch((e) => {
			console.error(e);
			setStatus("Failed to load: " + (e?.message ?? e));
		});

		// --- render loop -------------------------------------------------------
		let raf = 0;
		let frame = 0;
		let last = performance.now();
		const tick = (now: number) => {
			raf = requestAnimationFrame(tick);
			const dt = (now - last) / 1000;
			last = now;
			if (clip && restBones.length) {
				if (playingRef.current) {
					frame += dt * FPS * speedRef.current;
					frame %= clip.duration;
				}
				pose(clip, frame);
			}
			if (camStartRef.current !== null) {
				// Scripted shot owns the camera; OrbitControls is suspended until it ends.
				if (controls.enabled) controls.enabled = false;
				const done = sampleCameraPath(
					(now - camStartRef.current) / 1000,
					modelCenter,
					modelRadius,
					camPos,
					camTarget,
					camAim
				);
				camera.position.copy(camPos);
				controls.target.copy(camTarget);
				camera.lookAt(camAim);
				if (done) {
					// Resync OrbitControls to the final framing, then hand control back.
					camStartRef.current = null;
					controls.enabled = true;
					controls.update();
					setCamPlaying(false);
				}
			} else {
				controls.update();
			}
			// Roll the camera around its view axis. OrbitControls/lookAt above always
			// level the camera, so this re-applies the panel's roll from scratch each
			// frame (no accumulation). Camera looks down local -Z, so that's the axis.
			const roll = num("roll") * DEG;
			if (roll) camera.rotateZ(roll);
			// Fit the near/far planes to the current camera distance so the model never
			// clips against the far plane when zoomed out (which made it pop in/out).
			// Far stays well beyond the model so the camera-centered skybox always wraps
			// it; near hugs the model without going non-positive when zoomed in close.
			const dist = camera.position.distanceTo(controls.target);
			const far = (dist + modelRadius) * 4;
			const near = Math.max(dist - modelRadius * 2, modelRadius * 0.01);
			if (camera.far !== far || camera.near !== near) {
				camera.far = far;
				camera.near = near;
				camera.updateProjectionMatrix();
			}
			// Keep the skybox centered on the camera and sized to sit just inside the
			// far plane (box is 1×0.5×1, so uniform scale preserves its 2:1 walls). The
			// mirror copy is the same but flipped on Y. The split plane tracks eye level.
			const s = camera.far * 0.8;
			const splitY = camera.position.y - SKY_SPLIT_DROP * s; // world height of the split
			skybox.scale.setScalar(s);
			skybox.position.copy(camera.position);
			// Flip on Y and reflect about splitY (so the seam stays continuous): a point
			// at world y maps to 2*splitY - y, i.e. center moves to 2*splitY - cam.y.
			skyMirror.scale.set(s, -s, s);
			skyMirror.position.set(camera.position.x, 2 * splitY - camera.position.y, camera.position.z);
			clipTop.constant = -splitY; // original keeps geometry above splitY
			clipBottom.constant = splitY; // mirror keeps geometry below it

			// Keep the editable camera panel in sync with the live camera, except
			// while a slider is being dragged (the drag would fight a write-back).
			if (!editingCamRef.current) syncPanelFromCam();
			renderer.render(scene, camera);
		};
		raf = requestAnimationFrame(tick);

		return () => {
			disposed = true;
			cancelAnimationFrame(raf);
			window.removeEventListener("resize", resize);
			controls.dispose();
			renderer.dispose();
			renderer.domElement.remove();
			skyGeo.dispose();
			skyMaterials.forEach((m) => m.dispose());
			skyMirrorMaterials.forEach((m) => m.dispose());
			skyTextures.forEach((t) => t.dispose());
				swappedFaceTexRef.current?.dispose();
				swappedFaceTexRef.current = null;
				faceMaterialsRef.current = [];
			tmp.identity();
		};
	}, [modelKey]);

	// Swap the active clip when the selection (or model) changes, without tearing
	// down the scene. Runs after the main effect has (re)assigned loadClipRef, so
	// it also performs the initial load for the current model.
	useEffect(() => {
		const m = MODELS.find((x) => x.key === modelKey) ?? MODELS[0];
		const c = m.clips.find((x) => x.key === clipKey) ?? m.clips[0];
		loadClipRef.current(c.url);
	}, [modelKey, clipKey]);

	return (
		<div className="relative h-screen w-screen overflow-hidden bg-[#14161d] text-white">
			<div ref={containerRef} className="absolute inset-0" />

			{status && <p className="absolute left-4 top-4 text-sm text-amber-300">{status}</p>}

			<div className="absolute bottom-4 left-4 w-80 rounded-md bg-black/50 px-3 py-3 font-mono text-xs text-emerald-300 backdrop-blur">
					{CAM_FIELDS.map((f) => (
						<div key={f.key} className="flex items-center gap-2 py-1.5">
							<span className="w-16 shrink-0 text-white/60">{f.label}</span>
							<input
								type="range"
								min={f.min}
								max={f.max}
								step={f.step}
								ref={(el) => {
									camInputsRef.current[f.key] = el;
								}}
								onPointerDown={() => (editingCamRef.current = true)}
								onPointerUp={() => (editingCamRef.current = false)}
								onPointerLeave={() => (editingCamRef.current = false)}
								onInput={(e) => editCamRef.current(f.key, e.currentTarget.value)}
								className="h-1 flex-1 cursor-pointer accent-emerald-400"
							/>
							<input
								type="number"
								min={f.min}
								max={f.max}
								step={f.step}
								ref={(el) => {
									camNumbersRef.current[f.key] = el;
								}}
								onFocus={() => (editingCamRef.current = true)}
								onBlur={() => (editingCamRef.current = false)}
								onChange={(e) => editCamRef.current(f.key, e.currentTarget.value)}
								className="w-14 shrink-0 rounded bg-white/10 px-1 py-0.5 text-right tabular-nums text-emerald-300 [appearance:textfield] focus:bg-white/20 focus:outline-none"
							/>
						</div>
					))}
					<button
						onClick={() => resetCamRef.current()}
						className="mt-2 w-full rounded bg-white/10 py-1 text-xs text-white/70 hover:bg-white/20 hover:text-white"
					>
						reset
					</button>
				</div>

			{layers.length > 0 && (
				<div className="absolute right-4 top-4 flex max-h-[85vh] w-80 flex-col rounded-lg bg-black/50 text-sm backdrop-blur">
					<div className="flex items-center justify-between px-3 py-2">
						<span className="font-semibold">Parts</span>
						<span className="flex gap-1">
							<button
								onClick={() => setAllVisible(true)}
								className="rounded bg-white/10 px-2 py-0.5 text-xs hover:bg-white/20"
							>
								all
							</button>
							<button
								onClick={() => setAllVisible(false)}
								className="rounded bg-white/10 px-2 py-0.5 text-xs hover:bg-white/20"
							>
								none
							</button>
							<button
								onClick={exportToggles}
								className="rounded bg-white/10 px-2 py-0.5 text-xs hover:bg-white/20"
							>
								{exported ? "saved!" : "export"}
							</button>
							<button
								onClick={importToggles}
								className="rounded bg-white/10 px-2 py-0.5 text-xs hover:bg-white/20"
							>
								import
							</button>
						</span>
					</div>
					<div className="flex flex-col overflow-y-auto px-3 pb-2">
						{CATEGORIES.map((cat) => ({cat, items: layers.filter((l) => l.category === cat)}))
							.filter(({items}) => items.length > 0)
							.map(({cat, items}, i) => (
								<div key={cat} className={i === 0 ? "" : "mt-2 border-t border-white/10 pt-2"}>
									<div className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/50">
										{cat}
									</div>
									{items.map((l) => (
										<div key={l.key} className="flex items-center gap-2 py-0.5">
											<label className="flex flex-1 cursor-pointer items-center gap-2 truncate hover:text-white/70">
												<input
													type="checkbox"
													checked={l.visible}
													onChange={(e) => setLayerVisible(l.key, e.target.checked)}
												/>
												<span className="truncate">
													{l.key}
													{l.count > 1 ? ` (${l.count})` : ""}
												</span>
											</label>
											<span className="flex gap-1">
												{CATEGORIES.filter((c) => c !== l.category).map((c) => (
													<button
														key={c}
														onClick={() => setLayerCategory(l.key, c)}
														title={`move to ${c}`}
														className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/60 hover:bg-white/20 hover:text-white"
													>
														{c}
													</button>
												))}
											</span>
										</div>
									))}
								</div>
							))}
					</div>
				</div>
			)}

			<div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/50 px-3 py-2 backdrop-blur">
				<label className="flex items-center gap-2 pl-1 pr-1 text-xs">
					<span className="text-white/70">Model</span>
					<select
						value={modelKey}
						onChange={(e) => {
							const next = MODELS.find((m) => m.key === e.target.value) ?? MODELS[0];
							setModelKey(next.key);
							setClipKey(next.clips[0].key);
						}}
						className="cursor-pointer rounded bg-white/10 px-1.5 py-1 text-xs hover:bg-white/20"
					>
						{MODELS.map((m) => (
							<option key={m.key} value={m.key}>
								{m.label}
							</option>
						))}
					</select>
				</label>
				{model.clips.length > 1 && (
					<label className="flex items-center gap-2 pr-1 text-xs">
						<span className="text-white/70">Anim</span>
						<select
							value={clipKey}
							onChange={(e) => setClipKey(e.target.value)}
							className="cursor-pointer rounded bg-white/10 px-1.5 py-1 text-xs hover:bg-white/20"
						>
							{model.clips.map((c) => (
								<option key={c.key} value={c.key}>
									{c.label}
								</option>
							))}
						</select>
					</label>
				)}
				<button
					onClick={() => setPlaying((p) => !p)}
					className="rounded-full bg-white/10 px-5 py-1.5 text-sm hover:bg-white/20"
				>
					{playing ? "Pause" : "Play"}
				</button>
				<button
					onClick={() => {
						camStartRef.current = performance.now();
						setCamPlaying(true);
					}}
					className="rounded-full bg-white/10 px-4 py-1.5 text-sm hover:bg-white/20"
				>
					{camPlaying ? "Replay" : "Cinematic"}
				</button>
				<label className="flex items-center gap-2 pl-1 pr-2 text-xs">
					<input
						type="range"
						min={0}
						max={2}
						step={0.05}
						value={speed}
						onChange={(e) => setSpeed(Number(e.target.value))}
						className="w-28 cursor-pointer"
					/>
					<span className="w-10 tabular-nums text-white/70">{speed.toFixed(2)}×</span>
				</label>
				{model.face && (
					<label className="flex items-center gap-2 pr-1 text-xs">
						<span className="text-white/70">Face</span>
						<select
							value={face}
							onChange={(e) => {
								setFace(e.target.value);
								applyFace(e.target.value);
							}}
							className="cursor-pointer rounded bg-white/10 px-1.5 py-1 text-xs hover:bg-white/20"
						>
							{FACE_IDS.map((id) => (
								<option key={id} value={id}>
									{id}
								</option>
							))}
						</select>
					</label>
				)}
			</div>
		</div>
	);
}
