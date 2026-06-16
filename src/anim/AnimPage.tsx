import {useEffect, useRef, useState} from "react";
import {
	AmbientLight,
	BackSide,
	Box3,
	BoxGeometry,
	Color,
	DirectionalLight,
	DoubleSide,
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

const MODEL_URL = "/models/link-adult/Adult Link.dae";
const SKELETON_URL = "/models/link-adult/anim/skeleton.json";
const CLIP_URL = "/models/link-adult/anim/nml_okarina_swing.csab";

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

// Selectable face-expression textures (link_e00.png … link_e07.png). Only e00 is
// baked into the model; the rest are swapped onto the face material at runtime.
const FACE_DIR = "/models/link-adult";
const FACE_IDS = Array.from({length: 8}, (_, i) => String(i).padStart(2, "0"));
// The model node carrying the face (link_e00) material; its material map is what
// the expression dropdown swaps.
const FACE_NODE = "nodes_141_";

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

const PARTS_KEY = "ocarina.animPartsVisibility";
const CATEGORY_KEY = "ocarina.animPartsCategory";

function loadJsonRecord<T>(storageKey: string): Record<string, T> {
	const raw = localStorage.getItem(storageKey);
	if (!raw) return {};
	try {
		return JSON.parse(raw) as Record<string, T>;
	} catch {
		return {};
	}
}

function savePartsState(layers: Layer[]) {
	const visibility: Record<string, boolean> = {};
	const category: Record<string, PartCategory> = {};
	for (const l of layers) {
		visibility[l.key] = l.visible;
		if (l.category !== "active") category[l.key] = l.category;
	}
	localStorage.setItem(PARTS_KEY, JSON.stringify(visibility));
	localStorage.setItem(CATEGORY_KEY, JSON.stringify(category));
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
}

export default function AnimPage() {
	const containerRef = useRef<HTMLDivElement>(null);
	const [status, setStatus] = useState("Loading model…");
	const [playing, setPlaying] = useState(true);
	const [speed, setSpeed] = useState(0.5);
	const [layers, setLayers] = useState<Layer[]>([]);
	const [exported, setExported] = useState(false);
	const [face, setFace] = useState(FACE_IDS[0]);

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
		if (!entries.length) return;
		new TextureLoader().load(`${FACE_DIR}/link_e${id}.png`, (tex) => {
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
		if (layers.length > 0) savePartsState(layers);
	}, [layers]);

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

		// Per-cmb-id scratch matrices.
		const localM: Matrix4[] = [];
		const worldM: Matrix4[] = [];
		const gWorldBind: Matrix4[] = []; // G * restWorld
		const invBind: Matrix4[] = []; // inverse(G * restWorld)
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
			for (const b of restBones) {
				localM[b.id] = new Matrix4();
				worldM[b.id] = new Matrix4();
				gWorldBind[b.id] = new Matrix4();
				invBind[b.id] = new Matrix4();
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
					sk.boneInverses[j].copy(invBind[cmbId]);
				}
			}
		};

		// --- load everything ---------------------------------------------------
		const start = async () => {
			const skJson: SkeletonData = await fetch(SKELETON_URL).then((r) => r.json());
			computeRest(skJson);

			clip = parseCSAB(await fetch(CLIP_URL).then((r) => r.arrayBuffer()));

			const collada = await new Promise<{scene: Scene}>((resolve, reject) => {
				new ColladaLoader().load(MODEL_URL, (c) => resolve(c as unknown as {scene: Scene}), undefined, reject);
			});
			if (disposed) return;

			const model = collada.scene;
			model.traverse((obj) => {
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
			scene.add(model);
			applyBoneInverses();
			pose(null, 0); // bind pose

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
			// Grab the face mesh's material (node FACE_NODE, textured with link_e00)
			// so the expression dropdown can swap its map. Matching by node name is
			// reliable; the texture's image.src isn't populated yet at this point.
			const faceMats: {mat: FaceMat; base: Texture | null}[] = [];
			for (const mesh of skinnedMeshes) {
				if (mesh.name !== FACE_NODE) continue;
				const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as unknown as FaceMat;
				faceMats.push({mat, base: mat.map});
			}
			faceMaterialsRef.current = faceMats;

			const stored = loadJsonRecord<boolean>(PARTS_KEY);
			const storedCategory = loadJsonRecord<PartCategory>(CATEGORY_KEY);
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
			controls.target.copy(center);
			camera.position.set(center.x + radius * 0.4, center.y + radius * 0.2, center.z + radius * 3);
			camera.near = radius * 0.05;
			camera.far = radius * 50;
			camera.updateProjectionMatrix();
			controls.update();

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
			controls.update();
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
	}, []);

	return (
		<div className="relative h-screen w-screen overflow-hidden bg-[#14161d] text-white">
			<div ref={containerRef} className="absolute inset-0" />

			{status && <p className="absolute left-4 top-4 text-sm text-amber-300">{status}</p>}

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
				<button
					onClick={() => setPlaying((p) => !p)}
					className="rounded-full bg-white/10 px-5 py-1.5 text-sm hover:bg-white/20"
				>
					{playing ? "Pause" : "Play"}
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
			</div>
		</div>
	);
}
