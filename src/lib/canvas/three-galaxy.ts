import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { JOURNEY_SECTIONS } from '$lib/journey';
import type { PlanetRecord, SceneTheme } from '$lib/types';

const PLANETS_PER_RING = 20;
const BASE_ORBIT_RADIUS = 100;
const ORBIT_SPACING = 38;
const SYSTEM_ORDER = JOURNEY_SECTIONS.map((section) => section.theme);
const SYSTEM_ANCHORS: Record<SceneTheme, THREE.Vector3> = {
	orbit: new THREE.Vector3(0, 0, 0),
	about: new THREE.Vector3(760, 110, -620),
	projects: new THREE.Vector3(1540, -140, 180),
	contact: new THREE.Vector3(2280, 160, 780),
	impressum: new THREE.Vector3(3040, 260, 40)
};

const orbitRadiusForRing = (ring: number) => BASE_ORBIT_RADIUS + ring * ORBIT_SPACING;

type PlanetState = {
	angle: number;
	speed: number;
	radius: number;
	verticalPhase: number;
	armOffset: number;
	size: number;
	color: THREE.Color;
};

type ThemeConfig = {
	coreColor: number;
	glowInner: string;
	glowMid: string;
	glowOuter: string;
	glowTint: number;
	lightColor: number;
	ringColor: number;
	starNear: number;
	starFar: number;
	isBlackHole?: boolean;
};

type SystemVisual = {
	group: THREE.Group;
	core: THREE.Mesh;
	glow: THREE.Sprite;
	label: THREE.Sprite;
	accent?: THREE.Mesh;
	hotspot: THREE.Mesh;
	companionOrbits: Array<{
		pivot: THREE.Group;
		mesh: THREE.Mesh;
		speed: number;
	}>;
};

const THEME_CONFIG: Record<SceneTheme, ThemeConfig> = {
	orbit: {
		coreColor: 0xffcf73,
		glowInner: 'rgba(255,240,177,1)',
		glowMid: 'rgba(255,189,102,0.8)',
		glowOuter: 'rgba(255,148,61,0)',
		glowTint: 0xffb45e,
		lightColor: 0xffd37f,
		ringColor: 0xb7ceff,
		starNear: 0xbfd8ff,
		starFar: 0x9fb3e1
	},
	about: {
		coreColor: 0x95f3ff,
		glowInner: 'rgba(205,250,255,1)',
		glowMid: 'rgba(133,237,255,0.78)',
		glowOuter: 'rgba(77,205,255,0)',
		glowTint: 0x7de8ff,
		lightColor: 0x84efff,
		ringColor: 0x9feaff,
		starNear: 0xcdf6ff,
		starFar: 0x88cbff
	},
	projects: {
		coreColor: 0xff9d7d,
		glowInner: 'rgba(255,220,205,1)',
		glowMid: 'rgba(255,162,122,0.8)',
		glowOuter: 'rgba(255,105,71,0)',
		glowTint: 0xff9362,
		lightColor: 0xffac7f,
		ringColor: 0xffbf9f,
		starNear: 0xffd6c0,
		starFar: 0xe8a7a0
	},
	contact: {
		coreColor: 0xd8a0ff,
		glowInner: 'rgba(245,225,255,1)',
		glowMid: 'rgba(214,153,255,0.78)',
		glowOuter: 'rgba(152,90,255,0)',
		glowTint: 0xcf92ff,
		lightColor: 0xddabff,
		ringColor: 0xdab8ff,
		starNear: 0xf2d8ff,
		starFar: 0xc79eff
	},
	impressum: {
		coreColor: 0x06080f,
		glowInner: 'rgba(255,180,118,0.9)',
		glowMid: 'rgba(171,96,255,0.52)',
		glowOuter: 'rgba(0,0,0,0)',
		glowTint: 0xff9b56,
		lightColor: 0xa96dff,
		ringColor: 0xffb07f,
		starNear: 0xf7cfbf,
		starFar: 0x9974cc,
		isBlackHole: true
	}
};

export class ThreeGalaxyEngine {
	private readonly host: HTMLElement;
	private readonly renderer: THREE.WebGLRenderer;
	private readonly scene: THREE.Scene;
	private readonly camera: THREE.PerspectiveCamera;
	private readonly controls: OrbitControls;
	private readonly root = new THREE.Group();
	private readonly starfield = new THREE.Group();
	private readonly systemsRoot = new THREE.Group();
	private readonly routeLight = new THREE.PointLight(0xffffff, 2.8, 3600);
	private readonly ambient = new THREE.AmbientLight(0x8ba6ff, 0.26);
	private readonly clock = new THREE.Clock();
	private readonly dummy = new THREE.Object3D();
	private readonly raycaster = new THREE.Raycaster();
	private readonly pointer = new THREE.Vector2();
	private readonly systemVisuals = new Map<SceneTheme, SystemVisual>();
	private readonly systemLights = new Map<SceneTheme, THREE.PointLight>();
	private readonly starMaterials: THREE.PointsMaterial[] = [];
	private readonly portalTargets: THREE.Object3D[] = [];
	private readonly movement = {
		forward: new THREE.Vector3(),
		right: new THREE.Vector3(),
		up: new THREE.Vector3(0, 1, 0),
		move: new THREE.Vector3()
	};
	private resizeObserver?: ResizeObserver;
	private raf = 0;
	private width = 0;
	private height = 0;
	private pixelRatio = 1;
	private planets: PlanetState[] = [];
	private ringCount = 1;
	private orbitRingGroup = new THREE.Group();
	private orbitPlanetMesh?: THREE.InstancedMesh;
	private elapsed = 0;
	private storyZoomTarget = 0;
	private storyZoom = 0;
	private journeyProgressTarget = 0;
	private journeyProgress = 0;
	private travelFocus = SYSTEM_ANCHORS.orbit.clone();
	private userDistance = 620;
	private hoveredPortal: THREE.Object3D | null = null;
	private pointerDown = { x: 0, y: 0 };
	private isPointerDragging = false;
	private keyState: Record<string, boolean> = {};
	private activeTheme: SceneTheme = 'orbit';

	public constructor(host: HTMLElement, theme: SceneTheme = 'orbit') {
		this.host = host;
		this.activeTheme = theme;
		this.scene = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 8000);
		this.camera.position.set(0, 220, 620);
		this.camera.lookAt(0, 0, 0);

		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
		this.renderer.setClearColor(0x000000, 0);
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		this.renderer.domElement.style.width = '100%';
		this.renderer.domElement.style.height = '100%';
		this.renderer.domElement.style.display = 'block';
		this.renderer.domElement.style.touchAction = 'none';

		this.host.appendChild(this.renderer.domElement);
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.enableDamping = true;
		this.controls.dampingFactor = 0.07;
		this.controls.enablePan = true;
		this.controls.enableZoom = false;
		this.controls.minDistance = 45;
		this.controls.maxDistance = 3200;
		this.controls.target.copy(this.travelFocus);

		this.scene.add(this.root);
		this.root.rotation.x = -0.46;
		this.root.add(this.starfield);
		this.root.add(this.systemsRoot);

		this.scene.add(this.routeLight);
		this.scene.add(this.ambient);

		this.initStarfield();
		this.initSystems();
		this.rebuildOrbitRings(this.ringCount);
	}

	public start() {
		this.resize();
		this.resizeObserver = new ResizeObserver(() => this.resize());
		this.resizeObserver.observe(this.host);
		this.renderer.domElement.addEventListener('wheel', this.onWheel, { passive: false });
		this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
		this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
		this.renderer.domElement.addEventListener('pointerup', this.onPointerUp);
		window.addEventListener('pointerup', this.onGlobalPointerEnd);
		window.addEventListener('pointercancel', this.onGlobalPointerEnd);
		window.addEventListener('keydown', this.onKeyDown);
		window.addEventListener('keyup', this.onKeyUp);
		this.clock.start();
		this.raf = requestAnimationFrame(() => this.tick());
	}

	public stop() {
		cancelAnimationFrame(this.raf);
		this.resizeObserver?.disconnect();
		this.renderer.domElement.removeEventListener('wheel', this.onWheel);
		this.renderer.domElement.removeEventListener('pointermove', this.onPointerMove);
		this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
		this.renderer.domElement.removeEventListener('pointerup', this.onPointerUp);
		window.removeEventListener('pointerup', this.onGlobalPointerEnd);
		window.removeEventListener('pointercancel', this.onGlobalPointerEnd);
		window.removeEventListener('keydown', this.onKeyDown);
		window.removeEventListener('keyup', this.onKeyUp);
		this.controls.dispose();
		this.renderer.dispose();
		this.host.removeChild(this.renderer.domElement);
	}

	public setPlanets(planets: PlanetRecord[]) {
		this.planets = planets.map((planet) => ({
			angle: (planet.slot / PLANETS_PER_RING) * Math.PI * 2,
			speed: planet.speed,
			radius: orbitRadiusForRing(planet.orbitRing),
			verticalPhase: (planet.id % 31) * 0.21,
			armOffset: ((planet.slot % 4) / 4) * Math.PI * 2,
			size: planet.size,
			color: new THREE.Color(planet.color)
		}));

		this.ringCount = planets.length ? Math.max(...planets.map((p) => p.orbitRing)) + 1 : 1;
		this.rebuildOrbitRings(this.ringCount);
		this.rebuildPlanetInstances();
	}

	public setStoryZoom(progress: number) {
		this.storyZoomTarget = THREE.MathUtils.clamp(progress, 0, 1);
	}

	public setTheme(theme: SceneTheme) {
		this.activeTheme = theme;
	}

	public setJourneyProgress(progress: number) {
		this.journeyProgressTarget = THREE.MathUtils.clamp(progress, 0, SYSTEM_ORDER.length - 1);
	}

	private initSystems() {
		this.systemsRoot.clear();
		this.portalTargets.length = 0;
		this.systemVisuals.clear();
		this.systemLights.clear();

		for (const section of JOURNEY_SECTIONS) {
			const config = THEME_CONFIG[section.theme];
			const anchor = SYSTEM_ANCHORS[section.theme];
			const group = new THREE.Group();
			group.position.copy(anchor);

			const core = new THREE.Mesh(
				new THREE.SphereGeometry(config.isBlackHole ? 34 : 38, 28, 28),
				new THREE.MeshBasicMaterial({ color: config.coreColor })
			);
			group.add(core);

			const glow = new THREE.Sprite(
				new THREE.SpriteMaterial({
					map: this.buildGlowTexture(config),
					color: config.glowTint,
					transparent: true,
					blending: THREE.AdditiveBlending,
					depthWrite: false
				})
			);
			const baseGlowSize = config.isBlackHole ? 286 : 220;
			glow.scale.set(baseGlowSize, baseGlowSize, 1);
			group.add(glow);

			let accent: THREE.Mesh | undefined;
			if (config.isBlackHole) {
				accent = new THREE.Mesh(
					new THREE.TorusGeometry(54, 12, 24, 120),
					new THREE.MeshBasicMaterial({ color: config.glowTint, transparent: true, opacity: 0.78 })
				);
				accent.rotation.x = Math.PI / 2.8;
			} else {
				accent = new THREE.Mesh(
					new THREE.TorusGeometry(74, 1.1, 16, 128),
					new THREE.MeshBasicMaterial({ color: config.ringColor, transparent: true, opacity: 0.22 })
				);
				accent.rotation.x = Math.PI / 2;
			}
			group.add(accent);

			const label = new THREE.Sprite(
				new THREE.SpriteMaterial({ map: this.buildLabelTexture(section.label), transparent: true, depthWrite: false })
			);
			label.position.set(0, config.isBlackHole ? 86 : 72, 0);
			label.scale.set(170, 44, 1);
			group.add(label);

			const hotspot = new THREE.Mesh(
				new THREE.SphereGeometry(config.isBlackHole ? 68 : 54, 14, 14),
				new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
			);
			hotspot.userData.href = section.path;
			hotspot.userData.theme = section.theme;
			group.add(hotspot);
			this.portalTargets.push(hotspot);

			const light = new THREE.PointLight(config.lightColor, section.theme === 'orbit' ? 1.9 : 1.25, 1100);
			group.add(light);
			this.systemLights.set(section.theme, light);

			if (section.theme === 'orbit') {
				group.add(this.orbitRingGroup);
			}

			const companionOrbits =
				section.theme === 'projects'
					? this.createProjectCompanions(group)
					: this.createCompanions(section.theme, group);
			this.systemVisuals.set(section.theme, { group, core, glow, label, accent, hotspot, companionOrbits });
			this.systemsRoot.add(group);
		}
	}

	private createCompanions(theme: SceneTheme, parent: THREE.Group) {
		const companions: SystemVisual['companionOrbits'] = [];
		const count = theme === 'impressum' ? 2 : 3;
		const baseColor = new THREE.Color(THEME_CONFIG[theme].ringColor);

		for (let index = 0; index < count; index += 1) {
			const pivot = new THREE.Group();
			const radius = 88 + index * 28 + (theme === 'impressum' ? 18 : 0);
			pivot.rotation.x = Math.PI / 2 + (index - 1) * 0.22;
			pivot.rotation.z = index * 0.84;

			const mesh = new THREE.Mesh(
				new THREE.SphereGeometry(theme === 'impressum' ? 4.4 + index : 5 + index * 1.3, 14, 14),
				new THREE.MeshBasicMaterial({
					color: baseColor.clone().lerp(new THREE.Color(0xffffff), 0.18 + index * 0.08),
					transparent: true,
					opacity: theme === 'impressum' ? 0.74 : 0.92
				})
			);
			mesh.position.set(radius, index % 2 === 0 ? 0 : 10, 0);
			pivot.add(mesh);
			parent.add(pivot);

			companions.push({
				pivot,
				mesh,
				speed: (theme === 'impressum' ? -0.18 : 0.2) + index * 0.05
			});
		}

		return companions;
	}

	private createProjectCompanions(parent: THREE.Group): SystemVisual['companionOrbits'] {
		const projects = [
			{ name: 'fusch.fun', sub: 'Festival · WebSocket Sync', color: new THREE.Color(0xff6eb0), radius: 100, speed: 0.18, tiltX: 0.45, tiltZ: 0.3, size: 7.5 },
			{ name: 'findex', sub: 'PWA · Play & App Store', color: new THREE.Color(0x6eb4ff), radius: 134, speed: 0.12, tiltX: -0.28, tiltZ: 1.5, size: 8.5 },
			{ name: 'Last of Fish', sub: 'Unity · WebGL Game', color: new THREE.Color(0x6effa8), radius: 164, speed: 0.09, tiltX: 0.62, tiltZ: 2.7, size: 7 },
			{ name: 'Bridge Viewer', sub: 'Thesis · Grade 1.0', color: new THREE.Color(0xffd06e), radius: 192, speed: 0.06, tiltX: -0.52, tiltZ: 4.0, size: 9 }
		];

		const companions: SystemVisual['companionOrbits'] = [];

		for (const proj of projects) {
			const pivot = new THREE.Group();
			pivot.rotation.x = Math.PI / 2 + proj.tiltX;
			pivot.rotation.z = proj.tiltZ;

			// Orbit ring
			const ringPts: THREE.Vector3[] = [];
			for (let i = 0; i <= 96; i++) {
				const t = (i / 96) * Math.PI * 2;
				ringPts.push(new THREE.Vector3(Math.cos(t) * proj.radius, 0, Math.sin(t) * proj.radius));
			}
			pivot.add(
				new THREE.Line(
					new THREE.BufferGeometry().setFromPoints(ringPts),
					new THREE.LineBasicMaterial({ color: proj.color, transparent: true, opacity: 0.18 })
				)
			);

			// Planet sphere
			const mesh = new THREE.Mesh(
				new THREE.SphereGeometry(proj.size, 20, 20),
				new THREE.MeshBasicMaterial({ color: proj.color, transparent: true, opacity: 0.94 })
			);
			mesh.position.set(proj.radius, 0, 0);

			// Glow
			const glow = new THREE.Sprite(
				new THREE.SpriteMaterial({
					map: this.buildProjectGlowTexture(proj.color),
					transparent: true,
					blending: THREE.AdditiveBlending,
					depthWrite: false
				})
			);
			glow.scale.set(56, 56, 1);
			mesh.add(glow);

			// Two-line label: name + subtitle
			const label = new THREE.Sprite(
				new THREE.SpriteMaterial({
					map: this.buildProjectLabel(proj.name, proj.sub, proj.color),
					transparent: true,
					depthWrite: false
				})
			);
			label.position.set(0, proj.size + 20, 0);
			// canvas is 512×128 → aspect 4:1, world units 148×37
			label.scale.set(148, 37, 1);
			mesh.add(label);

			pivot.add(mesh);
			parent.add(pivot);
			companions.push({ pivot, mesh, speed: proj.speed });
		}

		return companions;
	}

	private buildProjectGlowTexture(color: THREE.Color): THREE.CanvasTexture {
		const size = 128;
		const canvas = document.createElement('canvas');
		canvas.width = size;
		canvas.height = size;
		const ctx = canvas.getContext('2d');
		if (!ctx) return new THREE.CanvasTexture(canvas);
		const r = Math.round(color.r * 255);
		const g = Math.round(color.g * 255);
		const b = Math.round(color.b * 255);
		const half = size / 2;
		const grad = ctx.createRadialGradient(half, half, 1, half, half, half);
		grad.addColorStop(0, `rgba(${r},${g},${b},0.94)`);
		grad.addColorStop(0.36, `rgba(${r},${g},${b},0.44)`);
		grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, size, size);
		const tex = new THREE.CanvasTexture(canvas);
		tex.generateMipmaps = false;
		tex.minFilter = THREE.LinearFilter;
		tex.magFilter = THREE.LinearFilter;
		tex.needsUpdate = true;
		return tex;
	}

	/** 2-line project label rendered at 2× resolution for crispness */
	private buildProjectLabel(name: string, sub: string, color: THREE.Color): THREE.CanvasTexture {
		const W = 512, H = 128;
		const canvas = document.createElement('canvas');
		canvas.width = W;
		canvas.height = H;
		const ctx = canvas.getContext('2d');
		if (!ctx) return new THREE.CanvasTexture(canvas);
		ctx.clearRect(0, 0, W, H);

		const r = Math.round(color.r * 255);
		const g = Math.round(color.g * 255);
		const b = Math.round(color.b * 255);

		// Background pill
		const pad = 6, corner = 24;
		ctx.fillStyle = `rgba(${r},${g},${b},0.15)`;
		ctx.strokeStyle = `rgba(${r},${g},${b},0.55)`;
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		ctx.moveTo(pad + corner, pad);
		ctx.lineTo(W - pad - corner, pad);
		ctx.quadraticCurveTo(W - pad, pad, W - pad, pad + corner);
		ctx.lineTo(W - pad, H - pad - corner);
		ctx.quadraticCurveTo(W - pad, H - pad, W - pad - corner, H - pad);
		ctx.lineTo(pad + corner, H - pad);
		ctx.quadraticCurveTo(pad, H - pad, pad, H - pad - corner);
		ctx.lineTo(pad, pad + corner);
		ctx.quadraticCurveTo(pad, pad, pad + corner, pad);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();

		// Name (top line)
		ctx.fillStyle = 'rgba(240,248,255,0.97)';
		ctx.font = '600 36px Outfit, sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'alphabetic';
		ctx.fillText(name, W / 2, 72);

		// Subtitle (bottom line)
		ctx.fillStyle = `rgba(${r},${g},${b},0.86)`;
		ctx.font = '400 24px Outfit, sans-serif';
		ctx.fillText(sub, W / 2, 106);

		const tex = new THREE.CanvasTexture(canvas);
		tex.generateMipmaps = false;
		tex.minFilter = THREE.LinearFilter;
		tex.magFilter = THREE.LinearFilter;
		tex.needsUpdate = true;
		return tex;
	}

	private buildGlowTexture(config: ThemeConfig) {
		const size = 128;
		const canvas = document.createElement('canvas');
		canvas.width = size;
		canvas.height = size;
		const ctx = canvas.getContext('2d');
		if (!ctx) return new THREE.CanvasTexture(canvas);

		const gradient = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
		gradient.addColorStop(0, config.glowInner);
		gradient.addColorStop(0.35, config.glowMid);
		gradient.addColorStop(1, config.glowOuter);
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, size, size);

		const texture = new THREE.CanvasTexture(canvas);
		texture.needsUpdate = true;
		return texture;
	}

	private buildLabelTexture(label: string) {
		// 2× resolution for crispness — displayed at scale (170, 44, 1) world units
		const W = 640, H = 168;
		const canvas = document.createElement('canvas');
		canvas.width = W;
		canvas.height = H;
		const ctx = canvas.getContext('2d');
		if (!ctx) return new THREE.CanvasTexture(canvas);

		ctx.clearRect(0, 0, W, H);
		ctx.fillStyle = 'rgba(6, 12, 24, 0.82)';
		ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
		ctx.lineWidth = 3;
		const r = 40;
		ctx.beginPath();
		ctx.moveTo(r, 0);
		ctx.lineTo(W - r, 0);
		ctx.quadraticCurveTo(W, 0, W, r);
		ctx.lineTo(W, H - r);
		ctx.quadraticCurveTo(W, H, W - r, H);
		ctx.lineTo(r, H);
		ctx.quadraticCurveTo(0, H, 0, H - r);
		ctx.lineTo(0, r);
		ctx.quadraticCurveTo(0, 0, r, 0);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();

		// Top specular line
		ctx.strokeStyle = 'rgba(255,255,255,0.18)';
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.moveTo(r + 12, 1.5);
		ctx.lineTo(W - r - 12, 1.5);
		ctx.stroke();

		ctx.fillStyle = 'rgba(236, 244, 255, 0.96)';
		ctx.font = '600 56px Outfit, sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(label, W / 2, H / 2);

		const texture = new THREE.CanvasTexture(canvas);
		texture.generateMipmaps = false;
		texture.minFilter = THREE.LinearFilter;
		texture.magFilter = THREE.LinearFilter;
		texture.needsUpdate = true;
		return texture;
	}

	private initStarfield() {
		const layers = [2200, 3400, 4800];
		for (let l = 0; l < layers.length; l += 1) {
			const count = l === 0 ? 3400 : l === 1 ? 2500 : 1800;
			const spread = layers[l];
			const positions = new Float32Array(count * 3);
			for (let i = 0; i < count; i += 1) {
				positions[i * 3] = (Math.random() - 0.5) * spread + 1400;
				positions[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.6;
				positions[i * 3 + 2] = (Math.random() - 0.5) * spread;
			}
			const geometry = new THREE.BufferGeometry();
			geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
			const material = new THREE.PointsMaterial({
				size: l === 0 ? 1.4 : l === 1 ? 1.05 : 0.82,
				color: l === 0 ? 0xcfe2ff : l === 1 ? 0xaac7ff : 0x9db1d9,
				transparent: true,
				opacity: l === 0 ? 0.56 : l === 1 ? 0.34 : 0.18,
				depthWrite: false
			});
			this.starMaterials.push(material);
			this.starfield.add(new THREE.Points(geometry, material));
		}
	}

	private rebuildOrbitRings(ringCount: number) {
		this.orbitRingGroup.clear();
		const ringMaterial = new THREE.LineBasicMaterial({ color: THEME_CONFIG.orbit.ringColor, transparent: true, opacity: 0.2 });
		for (let ring = 0; ring < ringCount; ring += 1) {
			const radius = orbitRadiusForRing(ring);
			const segments = 96;
			const points: THREE.Vector3[] = [];
			for (let i = 0; i <= segments; i += 1) {
				const theta = (i / segments) * Math.PI * 2;
				points.push(new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius));
			}
			const geometry = new THREE.BufferGeometry().setFromPoints(points);
			this.orbitRingGroup.add(new THREE.Line(geometry, ringMaterial));
		}
	}

	private rebuildPlanetInstances() {
		if (this.orbitPlanetMesh) {
			this.orbitRingGroup.remove(this.orbitPlanetMesh);
			this.orbitPlanetMesh.geometry.dispose();
			(this.orbitPlanetMesh.material as THREE.Material).dispose();
		}

		const count = Math.max(1, this.planets.length);
		const geometry = new THREE.SphereGeometry(1, 12, 12);
		const material = new THREE.MeshStandardMaterial({ metalness: 0.12, roughness: 0.45 });
		this.orbitPlanetMesh = new THREE.InstancedMesh(geometry, material, count);
		this.orbitPlanetMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

		if (this.planets.length === 0) {
			this.dummy.position.set(100000, 100000, 100000);
			this.dummy.updateMatrix();
			this.orbitPlanetMesh.setMatrixAt(0, this.dummy.matrix);
			this.orbitPlanetMesh.setColorAt(0, new THREE.Color('#7dd3fc'));
		} else {
			for (let i = 0; i < this.planets.length; i += 1) {
				this.orbitPlanetMesh.setColorAt(i, this.planets[i].color);
			}
		}

		this.orbitRingGroup.add(this.orbitPlanetMesh);
	}

	private resize() {
		const rect = this.host.getBoundingClientRect();
		this.width = Math.max(1, Math.floor(rect.width));
		this.height = Math.max(1, Math.floor(rect.height));
		this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
		this.renderer.setPixelRatio(this.pixelRatio);
		this.renderer.setSize(this.width, this.height, false);
		this.camera.aspect = this.width / this.height;
		this.camera.updateProjectionMatrix();
	}

	/** Convert a system anchor from root-local space to world space, accounting for root.rotation.x = -0.46 */
	private toWorldAnchor(local: THREE.Vector3): THREE.Vector3 {
		const rx = -0.46;
		const c = Math.cos(rx);
		const s = Math.sin(rx);
		return new THREE.Vector3(local.x, local.y * c - local.z * s, local.y * s + local.z * c);
	}

	private getFocusForProgress(progress: number) {
		const lowerIndex = Math.floor(progress);
		const upperIndex = Math.min(SYSTEM_ORDER.length - 1, lowerIndex + 1);
		const blend = progress - lowerIndex;
		const from = this.toWorldAnchor(SYSTEM_ANCHORS[SYSTEM_ORDER[lowerIndex]]);
		const to = this.toWorldAnchor(SYSTEM_ANCHORS[SYSTEM_ORDER[upperIndex]]);
		if (lowerIndex === upperIndex) return from;

		const midpoint = from.clone().lerp(to, 0.5);
		const direction = to.clone().sub(from);
		const side = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
		const control = midpoint
			.add(side.multiplyScalar((lowerIndex % 2 === 0 ? 1 : -1) * 160))
			.add(new THREE.Vector3(0, 120 + lowerIndex * 26, 0));
		const curve = new THREE.QuadraticBezierCurve3(from, control, to);
		return curve.getPoint(blend);
	}

	private readonly onKeyDown = (event: KeyboardEvent) => {
		this.keyState[event.code] = true;
	};

	private readonly onKeyUp = (event: KeyboardEvent) => {
		this.keyState[event.code] = false;
	};

	private readonly onWheel = (event: WheelEvent) => {
		const wantsGalaxyZoom = event.ctrlKey || event.metaKey || event.altKey;
		if (!wantsGalaxyZoom) return;
		event.preventDefault();
		const zoomFactor = Math.exp(event.deltaY * 0.0012);
		this.userDistance = THREE.MathUtils.clamp(this.userDistance * zoomFactor, this.controls.minDistance, this.controls.maxDistance);
	};

	private readonly onPointerMove = (event: PointerEvent) => {
		this.updatePointer(event);
		this.raycaster.setFromCamera(this.pointer, this.camera);
		const hit = this.raycaster.intersectObjects(this.portalTargets, false)[0]?.object ?? null;
		this.hoveredPortal = hit;
		this.renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
	};

	private readonly onPointerDown = (event: PointerEvent) => {
		this.pointerDown.x = event.clientX;
		this.pointerDown.y = event.clientY;
		this.isPointerDragging = true;
		this.renderer.domElement.style.cursor = this.hoveredPortal ? 'pointer' : 'grabbing';
	};

	private readonly onPointerUp = (event: PointerEvent) => {
		this.isPointerDragging = false;
		this.updatePointer(event);
		this.raycaster.setFromCamera(this.pointer, this.camera);
		const hit = this.raycaster.intersectObjects(this.portalTargets, false)[0]?.object ?? null;
		const moved = Math.hypot(event.clientX - this.pointerDown.x, event.clientY - this.pointerDown.y);
		this.renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
		if (!hit || moved > 8) return;
		const href = hit.userData.href as string | undefined;
		if (href) window.dispatchEvent(new CustomEvent('galaxy:navigate', { detail: { path: href } }));
	};

	private readonly onGlobalPointerEnd = () => {
		this.isPointerDragging = false;
		this.renderer.domElement.style.cursor = this.hoveredPortal ? 'pointer' : 'grab';
	};

	private updatePointer(event: PointerEvent) {
		const rect = this.renderer.domElement.getBoundingClientRect();
		this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
	}

	private updateFreeMovement(dt: number) {
		const speed = (this.keyState.ShiftLeft || this.keyState.ShiftRight ? 260 : 145) * dt;
		if (speed <= 0) return;

		const move = this.movement.move;
		move.set(0, 0, 0);
		this.camera.getWorldDirection(this.movement.forward).normalize();
		this.movement.right.crossVectors(this.movement.forward, this.movement.up).normalize();
		if (this.keyState.KeyW) move.add(this.movement.forward);
		if (this.keyState.KeyS) move.sub(this.movement.forward);
		if (this.keyState.KeyD) move.add(this.movement.right);
		if (this.keyState.KeyA) move.sub(this.movement.right);
		if (this.keyState.KeyE) move.add(this.movement.up);
		if (this.keyState.KeyQ) move.sub(this.movement.up);
		if (move.lengthSq() === 0) return;

		move.normalize().multiplyScalar(speed);
		this.camera.position.add(move);
		this.controls.target.add(move);
	}

	private updateFocus(dt: number) {
		this.journeyProgress = THREE.MathUtils.lerp(this.journeyProgress, this.journeyProgressTarget, Math.min(1, dt * 1.7));
		const desiredFocus = this.getFocusForProgress(this.journeyProgress).add(new THREE.Vector3(0, 8, 0));
		const lockStrength = this.isPointerDragging
			? 0
			: Math.min(1, dt * THREE.MathUtils.lerp(1.8, 4.2, this.storyZoom));
		const delta = desiredFocus.sub(this.controls.target).multiplyScalar(lockStrength);
		this.camera.position.add(delta);
		this.controls.target.add(delta);
		this.travelFocus.copy(this.controls.target);

		const desiredDistance = THREE.MathUtils.clamp(this.userDistance * (1 - this.storyZoom * 0.34), this.controls.minDistance, this.controls.maxDistance);
		const currentOffset = this.camera.position.clone().sub(this.controls.target);
		const heroOffset = new THREE.Vector3(0, 132, desiredDistance)
			.normalize()
			.multiplyScalar(desiredDistance);
		const offset = currentOffset.lerp(heroOffset, this.isPointerDragging ? 0 : Math.min(1, dt * THREE.MathUtils.lerp(0.3, 1.8, this.storyZoom)));
		offset.setLength(THREE.MathUtils.lerp(offset.length(), desiredDistance, Math.min(1, dt * 2.2)));
		this.camera.position.copy(this.controls.target).add(offset);
	}

	private animateSystems(dt: number) {
		for (const section of JOURNEY_SECTIONS) {
			const visual = this.systemVisuals.get(section.theme);
			const light = this.systemLights.get(section.theme);
			if (!visual || !light) continue;
			const isActive = section.theme === this.activeTheme;
			const emphasis = isActive ? 1 : 0.5;
			const pulse = 1 + Math.sin(this.elapsed * (isActive ? 1.25 : 0.8) + SYSTEM_ORDER.indexOf(section.theme)) * 0.045;
			visual.glow.scale.setScalar((THEME_CONFIG[section.theme].isBlackHole ? 286 : 220) * pulse * emphasis);
			visual.label.material.opacity = isActive ? 0.94 : 0.44;
			visual.core.scale.setScalar(THREE.MathUtils.lerp(visual.core.scale.x, isActive ? 1.06 : 0.88, Math.min(1, dt * 2.6)));
			if (visual.accent) {
				visual.accent.rotation.z += dt * (THEME_CONFIG[section.theme].isBlackHole ? 0.5 : 0.12);
				(visual.accent.material as THREE.MeshBasicMaterial).opacity = isActive ? 0.58 : 0.18;
			}
			for (let index = 0; index < visual.companionOrbits.length; index += 1) {
				const companion = visual.companionOrbits[index];
				companion.pivot.rotation.y += dt * companion.speed * (isActive ? 1.18 : 0.74);
				companion.mesh.scale.setScalar(
					THREE.MathUtils.lerp(
						companion.mesh.scale.x,
						isActive ? 1 + index * 0.08 : 0.86 + index * 0.04,
						Math.min(1, dt * 2.2)
					)
				);
			}
			light.intensity = THREE.MathUtils.lerp(light.intensity, isActive ? 2.2 : 1.08, Math.min(1, dt * 2.4));
		}
		const activeAnchor = this.toWorldAnchor(SYSTEM_ANCHORS[this.activeTheme]);
		this.routeLight.position.lerp(activeAnchor, Math.min(1, dt * 2.1));
	}

	private tick() {
		const dt = Math.min(this.clock.getDelta(), 0.05);
		this.elapsed += dt;
		this.storyZoom = THREE.MathUtils.lerp(this.storyZoom, this.storyZoomTarget, Math.min(1, dt * 3));
		this.starfield.rotation.y += dt * 0.006;
		this.starfield.rotation.x = Math.sin(this.elapsed * 0.08) * 0.018;
		this.root.position.z = Math.sin(this.elapsed * 0.18) * 18;

		if (this.orbitPlanetMesh && this.planets.length > 0) {
			for (let i = 0; i < this.planets.length; i += 1) {
				const planet = this.planets[i];
				planet.angle += planet.speed * dt;
				if (planet.angle > Math.PI * 2) planet.angle -= Math.PI * 2;
				const spiral = planet.angle + planet.armOffset + (planet.radius - BASE_ORBIT_RADIUS) * 0.0032;
				const x = Math.cos(spiral) * planet.radius;
				const z = Math.sin(spiral) * planet.radius;
				const y = Math.sin(this.elapsed * 0.72 + planet.verticalPhase) * (planet.radius * 0.04);
				const scale = Math.max(0.7, planet.size * 0.42);
				this.dummy.position.set(x, y, z);
				this.dummy.scale.setScalar(scale);
				this.dummy.updateMatrix();
				this.orbitPlanetMesh.setMatrixAt(i, this.dummy.matrix);
			}
			this.orbitPlanetMesh.instanceMatrix.needsUpdate = true;
		}

		this.updateFocus(dt);
		this.updateFreeMovement(dt);
		this.animateSystems(dt);
		this.controls.update();
		this.renderer.render(this.scene, this.camera);
		this.raf = requestAnimationFrame(() => this.tick());
	}
}
