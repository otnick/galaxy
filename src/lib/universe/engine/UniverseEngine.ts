import * as THREE from 'three/webgpu';
import { pass, uniform, float, vec2, vec4 } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { chromaticAberration } from 'three/addons/tsl/display/ChromaticAberrationNode.js';
import { vignette } from 'three/addons/tsl/display/CRT.js';
import { film } from 'three/addons/tsl/display/FilmNode.js';
import { SYSTEMS, focusPath, type Body, type Focus, type StarSystem } from '../content';
import type { PlanetRecord } from '$lib/types';
import {
	createAtmosphereMaterial,
	createBeamMaterial,
	createBeaconMaterial,
	createCloudMaterial,
	createCommunityMaterial,
	createCoronaMaterial,
	createMoonMaterial,
	createOrbitMaterial,
	createParticleMaterial,
	createPlanetMaterial,
	createRingMaterial,
	createSkyMaterial,
	createStarMaterial
} from './materials';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type EngineEvents = {
	onNavigate: (path: string) => void;
	onHover?: (info: { title: string; subtitle?: string } | null) => void;
	onInteract?: () => void;
	onFps?: (fps: number) => void;
	onTelemetry?: (t: Telemetry) => void;
};

export type Telemetry = {
	/** camera heading in degrees, 0–360 */
	heading: number;
	/** distance to the current target */
	range: number;
	/** camera speed in units per second */
	velocity: number;
	/** 0 at rest, 1 at full warp */
	warp: number;
	mode: 'hold' | 'cruise' | 'warp';
};

export type EngineOptions = {
	reducedMotion: boolean;
	lowPower: boolean;
};

type Pickable = {
	path: string;
	position: () => THREE.Vector3;
	radius: number;
	level: 'star' | 'body' | 'community';
	systemSlug: string;
	onHover?: (on: boolean) => void;
	community?: PlanetRecord;
};

type BodyNode = {
	body: Body;
	system: StarSystem;
	pivot: THREE.Group;
	carrier: THREE.Group;
	mesh: THREE.Mesh;
	angle: number;
	highlight: { value: number };
	highlightGoal: number;
	orbit: { material: THREE.LineBasicNodeMaterial; opacity: { value: number } };
	moons: { mesh: THREE.Mesh; radius: number; speed: number; angle: number; tilt: number }[];
	label: HTMLElement;
	world: THREE.Vector3;
	extent: number;
};

type SystemNode = {
	system: StarSystem;
	group: THREE.Group;
	center: THREE.Vector3;
	star: THREE.Mesh;
	corona: THREE.Sprite;
	coronaStrength: { value: number };
	starIntensity: { value: number };
	beacon: { mesh: THREE.Mesh; opacity: { value: number } };
	beams?: THREE.Group;
	bodies: BodyNode[];
	label: HTMLElement;
	extent: number;
	hover: number;
	hoverGoal: number;
};

type Frame = {
	anchor: () => THREE.Vector3;
	distance: number;
	minDistance: number;
	maxDistance: number;
	polar: number;
	/** azimuth that is added on top of the user's offset (used to keep planets lit) */
	azimuthBase: () => number;
	azimuthOffset: number;
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const TAU = Math.PI * 2;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const damp = (current: number, target: number, lambda: number, dt: number) =>
	THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);
const wrapAngle = (a: number) => {
	a = (a + Math.PI) % TAU;
	if (a < 0) a += TAU;
	return a - Math.PI;
};
const hashSeed = (s: string) => {
	let h = 2166136261;
	for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
	return ((h >>> 0) % 1000) / 1000;
};
const mulberry = (seed: number) => () => {
	seed |= 0;
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const gauss = (rand: () => number) => {
	const u = 1 - rand();
	const v = rand();
	return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
};

const COMMUNITY_BASE = 150;
const COMMUNITY_SPACING = 9;
const PER_RING = 20;

/* ------------------------------------------------------------------ */
/* Engine                                                              */
/* ------------------------------------------------------------------ */

export class UniverseEngine {
	private canvas: HTMLCanvasElement;
	private labelLayer: HTMLElement;
	private events: EngineEvents;
	private options: EngineOptions;

	private renderer!: THREE.WebGPURenderer;
	private pipeline!: THREE.RenderPipeline;
	private scene = new THREE.Scene();
	private camera = new THREE.PerspectiveCamera(50, 1, 0.5, 30000);
	private timer = new THREE.Timer();

	private systems = new Map<string, SystemNode>();
	private pickables: Pickable[] = [];
	private warp = uniform(0);
	private grain = uniform(0.12);
	private dust?: { brightness: { value: number } };
	private coreGlow?: { sprite: THREE.Sprite; strength: { value: number } };

	private community?: THREE.InstancedMesh;
	private communityData: PlanetRecord[] = [];
	private communityTip: HTMLElement;
	private communityHover = -1;

	// camera rig
	private target = new THREE.Vector3();
	private distance = 4200;
	private polar = 0.85;
	private azimuth = 0.6;
	private userAzimuth = 0;
	private userPolar = 0;
	private zoomFactor = 1;
	private velocity = { az: 0, po: 0 };
	private frame: Frame;
	private flight: null | {
		t: number;
		duration: number;
		from: THREE.Vector3;
		fromDistance: number;
		fromPolar: number;
		fromAzimuth: number;
		arc: number;
		warp: number;
	} = null;
	private focus: Focus = { level: 'universe' };

	// view offset (room for panels)
	private inset = { x: 0, y: 0 };
	private insetGoal = { x: 0, y: 0 };
	private size = { w: 1, h: 1 };

	// input
	private pointers = new Map<number, { x: number; y: number }>();
	private dragStart = { x: 0, y: 0, moved: 0 };
	private pinchStart = 0;
	private pointer = new THREE.Vector2(-9999, -9999);
	private hovered: Pickable | null = null;
	private reticleHover: HTMLElement;
	private reticleLock: HTMLElement;
	private lastCamera = new THREE.Vector3();
	private velocitySmoothed = 0;
	private telemetryClock = 0;
	private coarse = false;

	private disposed = false;
	private frameTimes: number[] = [];
	private pixelRatio = 1;
	private tmp = new THREE.Vector3();
	private tmp2 = new THREE.Vector3();
	private projected = new THREE.Vector3();
	private listeners: Array<() => void> = [];
	private disposables: Array<{ dispose: () => void }> = [];
	private lastFps = 0;
	public backend: 'webgpu' | 'webgl' = 'webgl';

	constructor(canvas: HTMLCanvasElement, labelLayer: HTMLElement, events: EngineEvents, options: EngineOptions) {
		this.canvas = canvas;
		this.labelLayer = labelLayer;
		this.events = events;
		this.options = options;
		this.frame = this.universeFrame();
		this.communityTip = document.createElement('div');
		this.communityTip.className = 'u-tip';
		this.labelLayer.appendChild(this.communityTip);
		this.reticleHover = this.makeReticle('u-reticle u-reticle--hover');
		this.reticleLock = this.makeReticle('u-reticle u-reticle--lock');
	}

	/* -------------------------------- setup -------------------------------- */

	async init() {
		const renderer = new THREE.WebGPURenderer({
			canvas: this.canvas,
			antialias: false,
			alpha: false
		});
		await renderer.init();
		this.renderer = renderer;
		this.backend = (renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend ? 'webgpu' : 'webgl';
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.0;
		renderer.setClearColor(0x020308, 1);

		this.coarse = window.matchMedia('(pointer: coarse)').matches;
		const maxRatio = this.options.lowPower ? 1.25 : 1.75;
		this.pixelRatio = Math.min(window.devicePixelRatio || 1, maxRatio);
		renderer.setPixelRatio(this.pixelRatio);

		const debug = new URLSearchParams(location.search).get('debug') ?? '';
		if (!debug.includes('nosky')) this.buildSky();
		if (!debug.includes('nodust')) this.buildGalaxy();
		for (const [index, system] of SYSTEMS.entries()) this.buildSystem(system, index);
		this.buildCommunity();
		this.buildPipeline();

		this.timer.connect(document);
		this.resize();
		this.bindInput();

		// intro: start far out and slightly rotated, then glide into the requested focus
		this.target.set(0, 0, -300);
		this.distance = 6200;
		this.polar = 0.55;
		this.azimuth = -0.9;
		this.applyCamera();

		renderer.setAnimationLoop(this.tick);
		return this.backend;
	}

	private buildPipeline() {
		const pipeline = new THREE.RenderPipeline(this.renderer);
		const scenePass = pass(this.scene, this.camera);
		const sceneColor = scenePass.getTextureNode('output');
		const strength = this.options.lowPower ? 0.75 : 0.95;
		const bloomPass = bloom(sceneColor, strength, 0.55, 0.62);
		if (this.options.lowPower) bloomPass.setResolutionScale(0.35);
		const aberrated = chromaticAberration(sceneColor, this.warp, vec2(0.5, 0.5), float(1.08)) as unknown as THREE.Node<'vec4'>;
		let output: THREE.Node<'vec4'> = aberrated.add(bloomPass);
		output = vec4(vignette(output.rgb, float(0.55), float(0.6)), 1);
		if (!this.options.lowPower) output = film(output, this.grain) as unknown as THREE.Node<'vec4'>;
		pipeline.outputNode = output;
		this.pipeline = pipeline;
	}

	private buildSky() {
		// The nebula is static, so it is rendered once into a cube map instead of
		// evaluating 9 noise octaves for every pixel on every frame.
		const skyScene = new THREE.Scene();
		skyScene.add(new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), createSkyMaterial()));
		const cubeSize = this.options.lowPower ? 512 : 1024;
		const target = new THREE.CubeRenderTarget(cubeSize, { type: THREE.HalfFloatType, generateMipmaps: true });
		const cubeCamera = new THREE.CubeCamera(0.1, 10, target);
		cubeCamera.update(this.renderer, skyScene);
		this.scene.background = target.texture;
		this.disposables.push(target, ...skyScene.children.map((m) => (m as THREE.Mesh).geometry));

		// distant stars
		const count = this.options.lowPower ? 2600 : 6000;
		const rand = mulberry(7);
		const pos = new Float32Array(count * 3);
		const size = new Float32Array(count);
		const colorArr = new Float32Array(count * 3);
		const seed = new Float32Array(count);
		const c = new THREE.Color();
		for (let i = 0; i < count; i++) {
			const u = rand() * 2 - 1;
			const theta = rand() * TAU;
			const r = 7000 + rand() * 5000;
			const s = Math.sqrt(1 - u * u);
			pos.set([r * s * Math.cos(theta), r * u, r * s * Math.sin(theta)], i * 3);
			size[i] = 6 + Math.pow(rand(), 6) * 70;
			const temp = rand();
			c.setHSL(temp < 0.7 ? 0.6 : temp < 0.9 ? 0.1 : 0.0, temp < 0.7 ? 0.5 : 0.8, 0.72 + rand() * 0.2);
			const boost = 0.5 + Math.pow(rand(), 3) * 2.0;
			colorArr.set([c.r * boost, c.g * boost, c.b * boost], i * 3);
			seed[i] = rand();
		}
		this.scene.add(this.particleMesh(pos, size, colorArr, seed, { twinkle: true }).mesh);
	}

	private buildGalaxy() {
		const count = this.options.lowPower ? 26000 : 90000;
		const rand = mulberry(42);
		const pos = new Float32Array(count * 3);
		const size = new Float32Array(count);
		const colorArr = new Float32Array(count * 3);
		const seed = new Float32Array(count);
		const R = 2800;
		const arms = 4;
		const core = new THREE.Color('#ffcf9a');
		const mid = new THREE.Color('#7f9bff');
		const outer = new THREE.Color('#5a3cff');
		const pink = new THREE.Color('#ff5fb8');
		const c = new THREE.Color();
		for (let i = 0; i < count; i++) {
			const rNorm = Math.pow(rand(), 0.75);
			const r = 60 + rNorm * R;
			const arm = Math.floor(rand() * arms);
			const twist = r * 0.0028;
			const spread = (0.18 + rNorm * 0.35) * gauss(rand) * 0.6;
			const angle = (arm / arms) * TAU + twist + spread;
			const thickness = (1 - rNorm) * 90 + 18;
			const x = Math.cos(angle) * r + gauss(rand) * 40;
			const z = Math.sin(angle) * r + gauss(rand) * 40;
			const y = gauss(rand) * thickness * 0.5;
			pos.set([x, y, z - 300], i * 3);
			c.copy(core).lerp(mid, clamp(rNorm * 1.8, 0, 1)).lerp(outer, clamp((rNorm - 0.55) * 2, 0, 1));
			if (rand() < 0.035) c.copy(pink);
			const b = 0.35 + Math.pow(rand(), 3) * 1.4;
			colorArr.set([c.r * b, c.g * b, c.b * b], i * 3);
			size[i] = 1.6 + Math.pow(rand(), 6) * 10 + (1 - rNorm) * 3;
			seed[i] = rand();
		}
		const { mesh, brightness } = this.particleMesh(pos, size, colorArr, seed, {
			rotationSpeed: this.options.reducedMotion ? 0 : 0.004,
			nearFade: 900
		});
		this.dust = { brightness };
		this.scene.add(mesh);

		// soft galactic core haze
		const { material, strength } = createCoronaMaterial(
			{ kind: 'star', palette: ['#ffb070', '#ffc890', '#fff0d8'], corona: '#ff9e5e', radius: 1 },
			0.3
		);
		const sprite = new THREE.Sprite(material);
		sprite.scale.setScalar(1600);
		sprite.position.set(0, 0, -300);
		strength.value = 0.18;
		this.coreGlow = { sprite, strength };
		this.scene.add(sprite);
	}

	private particleMesh(
		pos: Float32Array,
		size: Float32Array,
		colorArr: Float32Array,
		seed: Float32Array,
		opts: { rotationSpeed?: number; nearFade?: number; twinkle?: boolean }
	) {
		const base = new THREE.PlaneGeometry(1, 1);
		const geometry = new THREE.InstancedBufferGeometry();
		geometry.index = base.index;
		geometry.setAttribute('position', base.getAttribute('position'));
		geometry.setAttribute('uv', base.getAttribute('uv'));
		geometry.setAttribute('aPos', new THREE.InstancedBufferAttribute(pos, 3));
		geometry.setAttribute('aSize', new THREE.InstancedBufferAttribute(size, 1));
		geometry.setAttribute('aColor', new THREE.InstancedBufferAttribute(colorArr, 3));
		geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 1));
		geometry.instanceCount = size.length;
		const { material, brightness } = createParticleMaterial(opts);
		const mesh = new THREE.Mesh(geometry, material);
		mesh.frustumCulled = false;
		return { mesh, brightness };
	}

	private buildSystem(system: StarSystem, index: number) {
		const group = new THREE.Group();
		const center = new THREE.Vector3(...system.position);
		group.position.copy(center);
		this.scene.add(group);
		const seed = hashSeed(system.slug) + index;

		const star = system.star;
		const { material: starMaterial, intensity } = createStarMaterial(star, seed);
		const starMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), starMaterial);
		starMesh.scale.setScalar(star.radius);
		group.add(starMesh);

		const { material: coronaMaterial, strength } = createCoronaMaterial(star, seed);
		const corona = new THREE.Sprite(coronaMaterial);
		corona.scale.setScalar(star.radius * (star.kind === 'pulsar' ? 11 : 8));
		group.add(corona);

		let beams: THREE.Group | undefined;
		if (star.kind === 'pulsar') {
			beams = new THREE.Group();
			const beamMat = createBeamMaterial(star.corona);
			for (const dir of [1, -1]) {
				const geo = new THREE.CylinderGeometry(star.radius * 0.2, star.radius * 1.6, star.radius * 15, 32, 1, true);
				geo.translate(0, star.radius * 7.5 + star.radius * 0.6, 0);
				const beam = new THREE.Mesh(geo, beamMat);
				if (dir < 0) beam.rotation.z = Math.PI;
				beams.add(beam);
			}
			beams.rotation.z = 0.5;
			group.add(beams);
		}

		const beacon = createBeaconMaterial(star.corona);
		const beaconMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), beacon.material);
		beaconMesh.rotation.x = -Math.PI / 2;
		group.add(beaconMesh);

		const label = this.makeLabel('u-label u-label--star', system.name, system.kicker);
		const node: SystemNode = {
			system,
			group,
			center,
			star: starMesh,
			corona,
			coronaStrength: strength,
			starIntensity: intensity,
			beacon: { mesh: beaconMesh, opacity: beacon.opacity },
			beams,
			bodies: [],
			label,
			extent: star.radius * 3,
			hover: 0,
			hoverGoal: 0
		};

		const sunWorld = center.clone();
		for (const [bi, body] of system.bodies.entries()) {
			node.bodies.push(this.buildBody(node, body, sunWorld, seed + bi * 1.7));
			node.extent = Math.max(node.extent, body.visual.orbit + body.visual.radius * 3);
		}
		if (system.slug === 'orbit') node.extent = Math.max(node.extent, COMMUNITY_BASE + 40);
		beaconMesh.scale.setScalar(node.extent * 2.1);

		this.systems.set(system.slug, node);
		this.pickables.push({
			path: `/${system.slug}`,
			position: () => center,
			radius: star.radius * 1.6,
			level: 'star',
			systemSlug: system.slug,
			onHover: (on) => {
				node.hoverGoal = on ? 1 : 0;
				label.classList.toggle('is-hover', on);
			}
		});
	}

	private buildBody(systemNode: SystemNode, body: Body, sunWorld: THREE.Vector3, seed: number): BodyNode {
		const v = body.visual;
		const pivot = new THREE.Group();
		pivot.rotation.x = v.tilt;
		pivot.rotation.z = v.tilt * 0.6;
		systemNode.group.add(pivot);

		const orbitPoints: THREE.Vector3[] = [];
		for (let i = 0; i <= 256; i++) {
			const a = (i / 256) * TAU;
			orbitPoints.push(new THREE.Vector3(Math.cos(a) * v.orbit, 0, Math.sin(a) * v.orbit));
		}
		const orbit = createOrbitMaterial(v.atmosphere ?? v.palette[2]);
		const orbitLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(orbitPoints), orbit.material);
		pivot.add(orbitLine);

		const carrier = new THREE.Group();
		pivot.add(carrier);

		const { material, uniforms } = createPlanetMaterial(v, seed, sunWorld, this.options.lowPower);
		const segments = this.options.lowPower ? 48 : 96;
		const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, segments, segments / 2), material);
		mesh.scale.setScalar(v.radius);
		carrier.add(mesh);

		if (v.kind === 'terran' || v.kind === 'ocean') {
			const clouds = new THREE.Mesh(
				new THREE.SphereGeometry(1.018, segments, segments / 2),
				createCloudMaterial(uniforms.sunPosition, seed, v.kind === 'ocean' ? 0.55 : 0.45)
			);
			mesh.add(clouds);
		}

		if (v.atmosphere) {
			const atmo = new THREE.Mesh(new THREE.SphereGeometry(1.045, segments, segments / 2), createAtmosphereMaterial(v.atmosphere, uniforms.sunPosition));
			mesh.add(atmo);
		}

		if (v.ring) {
			const ring = new THREE.Mesh(new THREE.RingGeometry(1.35, 2.3, 128, 1), createRingMaterial(v, seed, uniforms.sunPosition));
			ring.rotation.x = -Math.PI / 2 + 0.35;
			ring.rotation.y = 0.15;
			ring.scale.setScalar(v.radius);
			carrier.add(ring);
		}

		const moons: BodyNode['moons'] = [];
		for (let m = 0; m < (v.moons ?? 0); m++) {
			const moon = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), createMoonMaterial(uniforms.sunPosition, seed + m));
			moon.scale.setScalar(v.radius * (0.16 + m * 0.06));
			carrier.add(moon);
			moons.push({ mesh: moon, radius: v.radius * (2.2 + m * 1.1), speed: 0.35 / (m + 1), angle: m * 2.1 + seed, tilt: 0.3 - m * 0.5 });
		}

		const label = this.makeLabel('u-label u-label--body', body.name, body.kicker);
		const node: BodyNode = {
			body,
			system: systemNode.system,
			pivot,
			carrier,
			mesh,
			angle: v.phase,
			highlight: uniforms.highlight,
			highlightGoal: 0,
			orbit,
			moons,
			label,
			world: new THREE.Vector3(),
			extent: v.radius * (v.ring ? 2.4 : 1.2)
		};

		this.pickables.push({
			path: `/${systemNode.system.slug}/${body.slug}`,
			position: () => node.world,
			radius: v.radius * (v.ring ? 2 : 1.3),
			level: 'body',
			systemSlug: systemNode.system.slug,
			onHover: (on) => {
				node.highlightGoal = on ? 1 : 0;
				label.classList.toggle('is-hover', on);
			}
		});
		return node;
	}

	private buildCommunity() {
		const orbitSystem = this.systems.get('orbit');
		if (!orbitSystem) return;
		const sun = uniform(orbitSystem.center.clone());
		const geometry = new THREE.IcosahedronGeometry(1, 2);
		geometry.setAttribute('aTint', new THREE.InstancedBufferAttribute(new Float32Array(600 * 3), 3));
		const mesh = new THREE.InstancedMesh(geometry, createCommunityMaterial(sun), 600);
		mesh.count = 0;
		mesh.frustumCulled = false;
		mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
		orbitSystem.group.add(mesh);
		this.community = mesh;
	}

	setCommunity(planets: PlanetRecord[]) {
		this.communityData = planets.slice(0, 600);
		if (!this.community) return;
		const c = new THREE.Color();
		const tint = this.community.geometry.getAttribute('aTint') as THREE.InstancedBufferAttribute;
		for (const [i, p] of this.communityData.entries()) {
			c.set(/^#[0-9a-f]{6}$/i.test(p.color) ? p.color : '#9fb3ff');
			tint.setXYZ(i, c.r * 1.4, c.g * 1.4, c.b * 1.4);
		}
		tint.needsUpdate = true;
		this.community.count = this.communityData.length;
		// replace community pickables
		this.pickables = this.pickables.filter((p) => p.level !== 'community');
		const orbitSystem = this.systems.get('orbit')!;
		for (const [i, p] of this.communityData.entries()) {
			const world = new THREE.Vector3();
			this.pickables.push({
				path: '/orbit',
				position: () => {
					this.communityPosition(p, world);
					return world.add(orbitSystem.center);
				},
				radius: 1.6,
				level: 'community',
				systemSlug: 'orbit',
				community: p,
				onHover: (on) => (this.communityHover = on ? i : -1)
			});
		}
	}

	private communityPosition(p: PlanetRecord, out: THREE.Vector3) {
		const t = this.timer.getElapsed();
		const r = COMMUNITY_BASE + p.orbitRing * COMMUNITY_SPACING;
		const a = (p.slot / PER_RING) * TAU + p.orbitRing * 0.37 + t * (0.012 + p.speed * 0.02) * (this.options.reducedMotion ? 0 : 1);
		const wobble = Math.sin(a * 3 + p.id) * 2.5;
		return out.set(Math.cos(a) * r, wobble, Math.sin(a) * r);
	}

	private makeReticle(className: string) {
		const el = document.createElement('div');
		el.className = className;
		el.innerHTML = '<i></i><i></i><i></i><i></i><span class="u-reticle__tag"></span>';
		el.setAttribute('aria-hidden', 'true');
		this.labelLayer.appendChild(el);
		return el;
	}

	private makeLabel(className: string, title: string, subtitle?: string) {
		const el = document.createElement('div');
		el.className = className;
		el.innerHTML = `<span class="u-label__dot"></span><span class="u-label__text"><span class="u-label__title"></span><span class="u-label__sub"></span></span>`;
		(el.querySelector('.u-label__title') as HTMLElement).textContent = title;
		(el.querySelector('.u-label__sub') as HTMLElement).textContent = subtitle ?? '';
		el.setAttribute('aria-hidden', 'true');
		this.labelLayer.appendChild(el);
		return el;
	}

	/* -------------------------------- focus -------------------------------- */

	private universeFrame(): Frame {
		const portrait = typeof window !== 'undefined' && window.innerHeight > window.innerWidth;
		return {
			anchor: () => this.tmp2.set(-60, 0, -330),
			distance: portrait ? 2700 : 1750,
			minDistance: 700,
			maxDistance: 4200,
			polar: 0.95,
			azimuthBase: () => 0,
			azimuthOffset: 0.35
		};
	}

	private systemFrame(node: SystemNode): Frame {
		const portrait = window.innerHeight > window.innerWidth;
		const d = node.extent * (portrait ? 3.6 : 2.3);
		return {
			anchor: () => node.center,
			distance: d,
			minDistance: node.system.star.radius * 2.6,
			maxDistance: d * 2.2,
			polar: 1.12,
			azimuthBase: () => 0,
			azimuthOffset: 0.4 + hashSeed(node.system.slug) * 1.2
		};
	}

	private bodyFrame(node: BodyNode): Frame {
		const portrait = window.innerHeight > window.innerWidth;
		const d = node.extent * (portrait ? 7.2 : 4.6) + 6;
		const systemCenter = this.systems.get(node.system.slug)!.center;
		return {
			anchor: () => node.world,
			distance: d,
			minDistance: node.body.visual.radius * 1.6,
			maxDistance: d * 3,
			polar: 1.34,
			// look at the planet from (mostly) the sunlit side
			azimuthBase: () => {
				this.tmp.copy(systemCenter).sub(node.world);
				return Math.atan2(this.tmp.x, this.tmp.z);
			},
			azimuthOffset: 1.05
		};
	}

	setFocus(focus: Focus, immediate = false) {
		const prev = this.focus;
		this.focus = focus;
		let frame: Frame;
		if (focus.level === 'universe') frame = this.universeFrame();
		else if (focus.level === 'system') frame = this.systemFrame(this.systems.get(focus.system.slug)!);
		else {
			const sys = this.systems.get(focus.system.slug)!;
			frame = this.bodyFrame(sys.bodies.find((b) => b.body.slug === focus.body.slug)!);
		}
		this.frame = frame;

		const to = frame.anchor();
		const separation = this.target.distanceTo(to);
		const crossSystem =
			prev.level !== 'universe' && focus.level !== 'universe' && prev.system.slug !== focus.system.slug;
		const duration = this.options.reducedMotion || immediate ? 0.001 : clamp(1.5 + separation / 900, 1.6, 3.4);

		this.flight = {
			t: 0,
			duration,
			from: this.target.clone(),
			fromDistance: this.distance,
			fromPolar: this.polar,
			fromAzimuth: this.azimuth,
			arc: crossSystem ? Math.min(separation * 0.55, 900) : 0,
			warp: crossSystem && !this.options.reducedMotion ? 1 : separation > 400 ? 0.4 : 0
		};
		this.userAzimuth = 0;
		this.userPolar = 0;
		this.zoomFactor = 1;
	}

	/** reserve screen space for UI panels (in CSS px); content is framed in the remaining area */
	setInset(x: number, y: number) {
		this.insetGoal.x = x;
		this.insetGoal.y = y;
	}

	/* -------------------------------- input -------------------------------- */

	private bindInput() {
		const el = this.canvas;
		const on = <K extends keyof HTMLElementEventMap>(
			target: HTMLElement | Window,
			type: K,
			fn: (e: HTMLElementEventMap[K]) => void,
			opts?: AddEventListenerOptions
		) => {
			target.addEventListener(type, fn as EventListener, opts);
			this.listeners.push(() => target.removeEventListener(type, fn as EventListener, opts));
		};

		on(el, 'pointerdown', (e) => {
			el.setPointerCapture(e.pointerId);
			this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
			this.dragStart = { x: e.clientX, y: e.clientY, moved: 0 };
			if (this.pointers.size === 2) this.pinchStart = this.pinchDistance();
			this.events.onInteract?.();
		});
		on(el, 'pointermove', (e) => {
			this.pointer.set(e.clientX, e.clientY);
			const prev = this.pointers.get(e.pointerId);
			if (!prev) return;
			const dx = e.clientX - prev.x;
			const dy = e.clientY - prev.y;
			prev.x = e.clientX;
			prev.y = e.clientY;
			this.dragStart.moved += Math.abs(dx) + Math.abs(dy);
			if (this.pointers.size === 1) {
				this.velocity.az = -dx * 0.0042;
				this.velocity.po = -dy * 0.0032;
				this.userAzimuth += this.velocity.az;
				this.userPolar = clamp(this.userPolar + this.velocity.po, -0.9, 0.9);
			} else if (this.pointers.size === 2) {
				const d = this.pinchDistance();
				if (this.pinchStart > 0) this.zoomBy(this.pinchStart / d);
				this.pinchStart = d;
			}
		});
		const end = (e: PointerEvent) => {
			const wasClick = this.pointers.size === 1 && this.dragStart.moved < 8;
			this.pointers.delete(e.pointerId);
			if (this.pointers.size < 2) this.pinchStart = 0;
			if (wasClick && e.type === 'pointerup') {
				this.pointer.set(e.clientX, e.clientY);
				const hit = this.pick();
				if (hit) this.events.onNavigate(hit.path);
			}
		};
		on(el, 'pointerup', end);
		on(el, 'pointercancel', end);
		on(el, 'pointerleave', () => {
			if (!this.coarse) this.pointer.set(-9999, -9999);
		});
		on(
			el,
			'wheel',
			(e) => {
				e.preventDefault();
				this.events.onInteract?.();
				const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
				this.zoomBy(Math.exp(clamp(delta, -120, 120) * 0.0018));
			},
			{ passive: false }
		);
		on(window, 'resize', () => this.resize());
	}

	private pinchDistance() {
		const [a, b] = [...this.pointers.values()];
		return Math.hypot(a.x - b.x, a.y - b.y) || 1;
	}

	private zoomBy(factor: number) {
		const goal = this.frame.distance * this.zoomFactor * factor;
		if (goal > this.frame.maxDistance * 1.08 && !this.flight) {
			// zooming out past the limit takes you one level up
			if (this.focus.level === 'body') return this.events.onNavigate(`/${this.focus.system.slug}`);
			if (this.focus.level === 'system') return this.events.onNavigate('/');
		}
		const min = this.frame.minDistance / this.frame.distance;
		const max = this.frame.maxDistance / this.frame.distance;
		this.zoomFactor = clamp(this.zoomFactor * factor, min, max * 1.1);
	}

	/** screen-space picking — generous on touch screens */
	private pick(): Pickable | null {
		if (this.pointer.x < -1000) return null;
		const h = this.size.h;
		const fovScale = (h / 2) / Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
		const minPx = this.coarse ? 30 : 18;
		let best: Pickable | null = null;
		let bestScore = Infinity;
		const rect = this.canvas.getBoundingClientRect();
		for (const p of this.pickables) {
			if (!this.isPickable(p)) continue;
			const world = p.position();
			this.projected.copy(world).project(this.camera);
			if (this.projected.z > 1) continue;
			const x = rect.left + ((this.projected.x + 1) / 2) * rect.width;
			const y = rect.top + ((1 - this.projected.y) / 2) * rect.height;
			const dist = world.distanceTo(this.camera.position);
			const radiusPx = (p.radius / dist) * fovScale;
			const threshold = Math.max(radiusPx * 1.15, p.level === 'community' ? 10 : minPx);
			const d = Math.hypot(x - this.pointer.x, y - this.pointer.y);
			if (d > threshold) continue;
			const score = d / threshold + (p.level === 'community' ? 0.5 : 0) + dist * 1e-5;
			if (score < bestScore) {
				bestScore = score;
				best = p;
			}
		}
		return best;
	}

	private isPickable(p: Pickable) {
		const f = this.focus;
		if (p.level === 'star') {
			// the current star is not a target when you are already in its system view
			return !(f.level === 'system' && f.system.slug === p.systemSlug);
		}
		if (f.level === 'universe') return false;
		if (p.systemSlug !== f.system.slug) return false;
		if (p.level === 'body') return !(f.level === 'body' && p.path === focusPath(f));
		return p.level === 'community';
	}

	/* -------------------------------- loop -------------------------------- */

	private resize() {
		const w = this.canvas.clientWidth || window.innerWidth;
		const h = this.canvas.clientHeight || window.innerHeight;
		this.size = { w, h };
		this.renderer.setSize(w, h, false);
		this.camera.aspect = w / h;
		this.camera.fov = w < h ? 62 : 48;
		this.applyViewOffset();
	}

	private applyViewOffset() {
		const { w, h } = this.size;
		if (Math.abs(this.inset.x) < 0.5 && Math.abs(this.inset.y) < 0.5) this.camera.clearViewOffset();
		else this.camera.setViewOffset(w, h, this.inset.x / 2, this.inset.y / 2, w, h);
		this.camera.updateProjectionMatrix();
	}

	private applyCamera() {
		const sinP = Math.sin(this.polar);
		this.camera.position.set(
			this.target.x + this.distance * sinP * Math.sin(this.azimuth),
			this.target.y + this.distance * Math.cos(this.polar),
			this.target.z + this.distance * sinP * Math.cos(this.azimuth)
		);
		this.camera.lookAt(this.target);
	}

	private tick = (timestamp: number) => {
		if (this.disposed) return;
		this.timer.update(timestamp);
		const dt = Math.min(this.timer.getDelta(), 1 / 20);
		const motion = this.options.reducedMotion ? 0.15 : 1;

		this.updateBodies(dt * motion);
		this.updateCommunity();
		this.updateCamera(dt);
		this.updateHover();
		this.updateVisuals(dt);
		this.updateLabels();
		this.updateReticles();
		this.updateTelemetry(dt);
		this.pipeline.render();
		this.trackPerformance(dt);
	};

	private updateBodies(dt: number) {
		for (const sys of this.systems.values()) {
			sys.star.rotation.y += dt * 0.02;
			if (sys.beams) sys.beams.rotation.y += dt * 1.2;
			for (const b of sys.bodies) {
				b.angle += b.body.visual.speed * dt;
				b.carrier.position.set(Math.cos(b.angle) * b.body.visual.orbit, 0, Math.sin(b.angle) * b.body.visual.orbit);
				for (const m of b.moons) {
					m.angle += m.speed * dt;
					m.mesh.position.set(Math.cos(m.angle) * m.radius, Math.sin(m.angle) * m.radius * m.tilt, Math.sin(m.angle) * m.radius);
				}
				b.carrier.getWorldPosition(b.world);
			}
		}
	}

	private matrix = new THREE.Matrix4();
	private updateCommunity() {
		if (!this.community || this.communityData.length === 0) return;
		const pos = new THREE.Vector3();
		const quat = new THREE.Quaternion();
		const scale = new THREE.Vector3();
		for (const [i, p] of this.communityData.entries()) {
			this.communityPosition(p, pos);
			const s = (1.1 + p.size * 0.22) * (i === this.communityHover ? 1.8 : 1);
			scale.setScalar(s);
			this.matrix.compose(pos, quat, scale);
			this.community.setMatrixAt(i, this.matrix);
		}
		this.community.instanceMatrix.needsUpdate = true;
	}

	private updateCamera(dt: number) {
		const frame = this.frame;
		// inertia when not dragging
		if (this.pointers.size === 0) {
			this.velocity.az = damp(this.velocity.az, 0, 4, dt);
			this.velocity.po = damp(this.velocity.po, 0, 4, dt);
			this.userAzimuth += this.velocity.az * 0.6;
			this.userPolar = clamp(this.userPolar + this.velocity.po * 0.6, -0.9, 0.9);
			// slow idle drift keeps the scene alive
			if (!this.options.reducedMotion) this.userAzimuth += dt * (this.focus.level === 'universe' ? 0.012 : 0.02);
		}

		const goalDistance = frame.distance * this.zoomFactor;
		const goalPolar = clamp(frame.polar + this.userPolar, 0.12, Math.PI - 0.3);
		const goalAzimuth = frame.azimuthBase() + frame.azimuthOffset + this.userAzimuth;
		const anchor = frame.anchor();

		if (this.flight) {
			const f = this.flight;
			f.t = Math.min(1, f.t + dt / f.duration);
			const e = f.warp > 0.5 ? easeInOut(f.t) : easeOutQuint(f.t);
			this.target.copy(f.from).lerp(anchor, e);
			const logD = THREE.MathUtils.lerp(Math.log(f.fromDistance), Math.log(goalDistance), e);
			this.distance = Math.exp(logD) + Math.sin(Math.PI * f.t) * f.arc;
			this.polar = THREE.MathUtils.lerp(f.fromPolar, goalPolar, e);
			this.azimuth = f.fromAzimuth + wrapAngle(goalAzimuth - f.fromAzimuth) * e;
			this.warp.value = Math.sin(Math.PI * f.t) * f.warp * 1.6;
			if (f.t >= 1) {
				this.flight = null;
				this.warp.value = 0;
			}
		} else {
			this.target.lerp(anchor, 1 - Math.exp(-10 * dt));
			this.distance = damp(this.distance, goalDistance, 5, dt);
			this.polar = damp(this.polar, goalPolar, 6, dt);
			this.azimuth += wrapAngle(goalAzimuth - this.azimuth) * (1 - Math.exp(-6 * dt));
		}

		this.inset.x = damp(this.inset.x, this.insetGoal.x, 5, dt);
		this.inset.y = damp(this.inset.y, this.insetGoal.y, 5, dt);
		this.applyViewOffset();
		this.applyCamera();
	}

	private updateHover() {
		const hit = this.coarse ? null : this.pick();
		if (hit !== this.hovered) {
			this.hovered?.onHover?.(false);
			hit?.onHover?.(true);
			this.hovered = hit;
			this.canvas.style.cursor = hit ? 'pointer' : 'grab';
			if (hit?.community) {
				const year = new Date(hit.community.createdAt).getFullYear();
				this.communityTip.innerHTML = '';
				const name = document.createElement('strong');
				name.textContent = hit.community.name;
				const since = document.createElement('span');
				since.textContent = `Orbiting since ${year}`;
				this.communityTip.append(name, since);
			}
			this.communityTip.classList.toggle('is-visible', !!hit?.community);
		}
		if (hit?.community) {
			this.communityTip.style.transform = `translate3d(${this.pointer.x + 14}px, ${this.pointer.y + 14}px, 0)`;
		}
	}

	private updateVisuals(dt: number) {
		const f = this.focus;
		for (const sys of this.systems.values()) {
			sys.hover = damp(sys.hover, sys.hoverGoal, 8, dt);
			const isCurrent = f.level !== 'universe' && f.system.slug === sys.system.slug;
			const beaconGoal = f.level === 'universe' ? 0.35 + sys.hover * 0.6 : 0;
			sys.beacon.opacity.value = damp(sys.beacon.opacity.value, beaconGoal, 4, dt);
			sys.coronaStrength.value = 1 + sys.hover * 0.6;
			for (const b of sys.bodies) {
				const isFocused = f.level === 'body' && f.body.slug === b.body.slug && isCurrent;
				const goal = !isCurrent ? 0.05 : isFocused ? 0.32 : f.level === 'body' ? 0.08 : 0.16 + b.highlightGoal * 0.3;
				b.orbit.opacity.value = damp(b.orbit.opacity.value, goal, 5, dt);
				b.highlight.value = damp(b.highlight.value, b.highlightGoal, 8, dt);
			}
		}
		if (this.dust) {
			const goal = f.level === 'universe' ? 1 : 0.55;
			this.dust.brightness.value = damp(this.dust.brightness.value, goal, 2, dt);
		}
		if (this.coreGlow) {
			const d = this.camera.position.distanceTo(this.coreGlow.sprite.position);
			this.coreGlow.strength.value = 0.22 * clamp((d - 500) / 1400, 0, 1);
		}
	}

	private updateLabels() {
		const { w, h } = this.size;
		const f = this.focus;
		const place = (el: HTMLElement, world: THREE.Vector3, offsetY: number, opacity: number) => {
			if (opacity <= 0.01) {
				if (el.style.opacity !== '0') el.style.opacity = '0';
				return;
			}
			this.projected.copy(world).project(this.camera);
			if (this.projected.z > 1 || Math.abs(this.projected.x) > 1.2 || Math.abs(this.projected.y) > 1.2) {
				el.style.opacity = '0';
				return;
			}
			const x = ((this.projected.x + 1) / 2) * w;
			const y = ((1 - this.projected.y) / 2) * h;
			el.style.transform = `translate3d(${x.toFixed(1)}px, ${(y + offsetY).toFixed(1)}px, 0)`;
			el.style.opacity = opacity.toFixed(2);
		};
		const fovScale = (h / 2) / Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
		const settled = !this.flight || this.flight.t > 0.7;

		for (const sys of this.systems.values()) {
			const isCurrent = f.level !== 'universe' && f.system.slug === sys.system.slug;
			const dist = sys.center.distanceTo(this.camera.position);
			const starPx = (sys.system.star.radius / dist) * fovScale;
			let starOpacity = 0;
			if (f.level === 'universe') starOpacity = 1;
			else if (!isCurrent && f.level === 'system') starOpacity = 0.55;
			sys.label.classList.toggle('is-far', !isCurrent && f.level !== 'universe');
			place(sys.label, sys.center, starPx + 14, settled ? starOpacity : 0);

			for (const b of sys.bodies) {
				let o = 0;
				if (isCurrent && settled) {
					if (f.level === 'system') o = 1;
					else if (f.level === 'body' && f.body.slug !== b.body.slug) o = 0.6;
				}
				const bd = b.world.distanceTo(this.camera.position);
				if (o > 0 && this.behindStar(b.world, sys, bd)) o *= 0.2;
				const px = (b.extent / bd) * fovScale;
				place(b.label, b.world, Math.max(px, 4) + 10, o);
			}
		}
	}

	private placeReticle(el: HTMLElement, world: THREE.Vector3 | null, radius: number, tag: string) {
		if (!world) {
			el.classList.remove('is-on');
			return;
		}
		this.projected.copy(world).project(this.camera);
		if (this.projected.z > 1) {
			el.classList.remove('is-on');
			return;
		}
		const { w, h } = this.size;
		const fovScale = (h / 2) / Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
		const dist = world.distanceTo(this.camera.position);
		const size = clamp((radius / dist) * fovScale * 2.6, 26, Math.min(w, h) * 0.7);
		const x = ((this.projected.x + 1) / 2) * w;
		const y = ((1 - this.projected.y) / 2) * h;
		el.style.transform = `translate3d(${(x - size / 2).toFixed(1)}px, ${(y - size / 2).toFixed(1)}px, 0)`;
		el.style.width = el.style.height = `${size.toFixed(1)}px`;
		const tagEl = el.lastElementChild as HTMLElement;
		if (tagEl.textContent !== tag) tagEl.textContent = tag;
		el.classList.add('is-on');
	}

	private updateReticles() {
		const f = this.focus;
		const settled = !this.flight || this.flight.t > 0.85;
		let lockWorld: THREE.Vector3 | null = null;
		let lockRadius = 1;
		let lockTag = '';
		if (settled && f.level === 'body') {
			const node = this.systems.get(f.system.slug)?.bodies.find((b) => b.body.slug === f.body.slug);
			if (node) {
				lockWorld = node.world;
				lockRadius = node.extent;
				lockTag = `LOCK · ${node.body.name}`;
			}
		}
		this.placeReticle(this.reticleLock, lockWorld, lockRadius, lockTag);
		const h = this.hovered && this.hovered.level !== 'community' ? this.hovered : null;
		this.placeReticle(this.reticleHover, h ? h.position() : null, h ? h.radius : 1, h ? `SET COURSE · ${this.pickName(h)}` : '');
	}

	private pickName(p: Pickable) {
		const [, sys, body] = p.path.split('/');
		const node = this.systems.get(sys);
		if (!node) return '';
		if (!body) return node.system.name;
		return node.bodies.find((b) => b.body.slug === body)?.body.name ?? '';
	}

	private updateTelemetry(dt: number) {
		const moved = this.camera.position.distanceTo(this.lastCamera);
		this.lastCamera.copy(this.camera.position);
		if (dt > 0) this.velocitySmoothed = damp(this.velocitySmoothed, moved / dt, 6, dt);
		this.telemetryClock += dt;
		if (this.telemetryClock < 0.08 || !this.events.onTelemetry) return;
		this.telemetryClock = 0;
		let heading = THREE.MathUtils.radToDeg(this.azimuth) % 360;
		if (heading < 0) heading += 360;
		const warp = this.warp.value / 1.6;
		this.events.onTelemetry({
			heading,
			range: this.distance,
			velocity: this.velocitySmoothed,
			warp,
			mode: this.flight ? (warp > 0.2 ? 'warp' : 'cruise') : 'hold'
		});
	}

	/** true when the star sits between the camera and the given point */
	private ray = new THREE.Ray();
	private behindStar(point: THREE.Vector3, sys: SystemNode, pointDistance: number) {
		const starDistance = sys.center.distanceTo(this.camera.position);
		if (starDistance > pointDistance) return false;
		this.ray.origin.copy(this.camera.position);
		this.ray.direction.copy(point).sub(this.camera.position).normalize();
		const r = sys.system.star.radius * 1.4;
		return this.ray.distanceSqToPoint(sys.center) < r * r;
	}

	private trackPerformance(dt: number) {
		this.frameTimes.push(dt);
		if (this.frameTimes.length < 90) return;
		const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
		this.frameTimes.length = 0;
		const fps = Math.round(1 / avg);
		if (fps !== this.lastFps) {
			this.lastFps = fps;
			this.events.onFps?.(fps);
		}
		// adaptive resolution: step down when the GPU struggles
		if (avg > 1 / 40 && this.pixelRatio > 0.75) {
			this.pixelRatio = Math.max(0.75, this.pixelRatio - 0.2);
			this.renderer.setPixelRatio(this.pixelRatio);
			this.resize();
		}
	}

	dispose() {
		this.disposed = true;
		this.listeners.forEach((off) => off());
		this.timer.dispose();
		this.renderer?.setAnimationLoop(null);
		this.scene.traverse((obj) => {
			const mesh = obj as THREE.Mesh;
			mesh.geometry?.dispose();
			const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
			if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
			else mat?.dispose();
		});
		this.disposables.forEach((d) => d.dispose());
		this.pipeline?.dispose();
		this.renderer?.dispose();
		this.labelLayer.innerHTML = '';
	}
}
