import {useEffect, useRef, useState} from "react";
import {
	AmbientLight,
	Box3,
	Color,
	DirectionalLight,
	Matrix4,
	PerspectiveCamera,
	Scene,
	SkinnedMesh,
	Vector3,
	WebGLRenderer,
	type Bone,
	type Skeleton,
} from "three";
import {ColladaLoader} from "three/examples/jsm/loaders/ColladaLoader.js";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import {calcBoneLocalMatrix, parseCSAB, type CSAB, type RestBone} from "./csab";

const MODEL_URL = "/models/link-adult/Adult Link.dae";
const SKELETON_URL = "/models/link-adult/anim/skeleton.json";
const CLIP_URL = "/models/link-adult/anim/nml_okarina_swing.csab";

const FPS = 30;

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

interface Layer {
	key: string;
	count: number;
	visible: boolean;
}

const PARTS_KEY = "ocarina.animPartsVisibility";

function loadPartsVisibility(): Record<string, boolean> {
	const raw = localStorage.getItem(PARTS_KEY);
	if (!raw) return {};
	try {
		return JSON.parse(raw) as Record<string, boolean>;
	} catch {
		return {};
	}
}

function savePartsVisibility(layers: Layer[]) {
	const map: Record<string, boolean> = {};
	for (const l of layers) map[l.key] = l.visible;
	localStorage.setItem(PARTS_KEY, JSON.stringify(map));
}

// Human-readable text dump of the current visibility, e.g. for sharing/saving.
function partsToText(layers: Layer[]): string {
	const shown = layers.filter((l) => l.visible).map((l) => l.key);
	const hidden = layers.filter((l) => !l.visible).map((l) => l.key);
	const fmt = (list: string[]) => (list.length ? list.map((k) => `  ${k}`).join("\n") : "  (none)");
	return `# Link ocarina — part visibility\nshown:\n${fmt(shown)}\nhidden:\n${fmt(hidden)}\n`;
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
	const [layers, setLayers] = useState<Layer[]>([]);
	const [copied, setCopied] = useState(false);

	// Live value the animation loop reads without restarting the effect.
	const playingRef = useRef(true);
	playingRef.current = playing;

	// Texture-keyed groups of meshes, populated after the model loads.
	const groupsRef = useRef<Map<string, SkinnedMesh[]>>(new Map());

	const setLayerVisible = (key: string, visible: boolean) => {
		groupsRef.current.get(key)?.forEach((m) => (m.visible = visible));
		setLayers((prev) => prev.map((l) => (l.key === key ? {...l, visible} : l)));
	};
	const setAllVisible = (visible: boolean) => {
		groupsRef.current.forEach((ms) => ms.forEach((m) => (m.visible = visible)));
		setLayers((prev) => prev.map((l) => ({...l, visible})));
	};

	// Persist visibility whenever it changes (skips the initial empty state).
	useEffect(() => {
		if (layers.length > 0) savePartsVisibility(layers);
	}, [layers]);

	const exportToggles = () => {
		const text = partsToText(layers);
		const ok = () => {
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		};
		navigator.clipboard?.writeText(text).then(ok, () => window.prompt("Parts visibility:", text));
	};

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		let disposed = false;
		const renderer = new WebGLRenderer({antialias: true});
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
					// bone.matrixWorld = G * animatedWorld (CMB space)
					bone.matrixWorld.multiplyMatrices(G, worldM[cmbId]);
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
			const stored = loadPartsVisibility();
			setLayers(
				[...groups.entries()]
					.map(([key, ms]) => {
						const visible = stored[key] ?? true;
						for (const m of ms) m.visible = visible;
						return {key, count: ms.length, visible};
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
					frame += dt * FPS;
					frame %= clip.duration;
				}
				pose(clip, frame);
			}
			controls.update();
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
			tmp.identity();
		};
	}, []);

	return (
		<div className="relative h-screen w-screen overflow-hidden bg-[#14161d] text-white">
			<div ref={containerRef} className="absolute inset-0" />

			{status && <p className="absolute left-4 top-4 text-sm text-amber-300">{status}</p>}

			{layers.length > 0 && (
				<div className="absolute right-4 top-4 flex max-h-[85vh] w-52 flex-col rounded-lg bg-black/50 text-sm backdrop-blur">
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
								{copied ? "copied!" : "export"}
							</button>
						</span>
					</div>
					<div className="flex flex-col overflow-y-auto px-3 pb-2">
						{layers.map((l) => (
							<label
								key={l.key}
								className="flex cursor-pointer items-center gap-2 py-0.5 hover:text-white/70"
							>
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
			</div>
		</div>
	);
}
