import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { PlanetRecord, SceneTheme } from '$lib/types';

const PLANETS_PER_RING = 20;
const BASE_ORBIT_RADIUS = 100;
const ORBIT_SPACING = 38;

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
	ambientColor: number;
	ringColor: number;
	starNear: number;
	starFar: number;
	isBlackHole?: boolean;
};

type PortalConfig = {
	theme: SceneTheme;
	href: string;
	label: string;
	position: [number, number, number];
	scale: number;
};

const THEME_CONFIG: Record<SceneTheme, ThemeConfig> = {
	orbit: {
		coreColor: 0xffcf73,
		glowInner: 'rgba(255,240,177,1)',
		glowMid: 'rgba(255,189,102,0.8)',
		glowOuter: 'rgba(255,148,61,0)',
		glowTint: 0xffb45e,
		lightColor: 0xffd37f,
		ambientColor: 0x8ba6ff,
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
		ambientColor: 0x75b7ff,
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
		ambientColor: 0xb18fff,
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
		ambientColor: 0x86b3ff,
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
		ambientColor: 0x5d78bb,
		ringColor: 0xffb07f,
		starNear: 0xf7cfbf,
		starFar: 0x9974cc,
		isBlackHole: true
	}
};

const PORTAL_CONFIG: PortalConfig[] = [
	{ theme: 'orbit', href: '/', label: 'Orbit', position: [-1150, 180, -980], scale: 1.05 },
	{ theme: 'about', href: '/about', label: 'About', position: [1180, -120, -1080], scale: 0.9 },
	{ theme: 'projects', href: '/projects', label: 'Projects', position: [-980, -260, 920], scale: 0.95 },
	{ theme: 'contact', href: '/contact', label: 'Contact', position: [1040, 220, 860], scale: 0.88 },
	{ theme: 'impressum', href: '/impressum', label: 'Impressum', position: [0, 420, -1450], scale: 1.12 }
];

export class ThreeGalaxyEngine {
	private readonly host: HTMLElement;
	private readonly renderer: THREE.WebGLRenderer;
	private readonly scene: THREE.Scene;
	private readonly camera: THREE.PerspectiveCamera;
	private readonly controls: OrbitControls;
	private readonly root = new THREE.Group();
	private readonly starfield = new THREE.Group();
	private readonly rings = new THREE.Group();
	private readonly portalGroup = new THREE.Group();
	private readonly light = new THREE.PointLight(0xffd37f, 2.4, 2200);
	private readonly ambient = new THREE.AmbientLight(0x8ba6ff, 0.35);
	private readonly clock = new THREE.Clock();
	private readonly dummy = new THREE.Object3D();
	private readonly centerGroup = new THREE.Group();
	private readonly raycaster = new THREE.Raycaster();
	private readonly pointer = new THREE.Vector2();
	private resizeObserver?: ResizeObserver;
	private raf = 0;
	private width = 0;
	private height = 0;
	private pixelRatio = 1;
	private planets: PlanetState[] = [];
	private ringCount = 1;
	private planetMesh?: THREE.InstancedMesh;
	private sunGlow?: THREE.Sprite;
	private coreMesh?: THREE.Mesh;
	private accretionRing?: THREE.Mesh;
	private portalTargets: THREE.Object3D[] = [];
	private hoveredPortal: THREE.Object3D | null = null;
	private pointerDown = { x: 0, y: 0 };
	private starMaterials: THREE.PointsMaterial[] = [];
	private elapsed = 0;
	private storyZoomTarget = 0;
	private storyZoom = 0;
	private keyState: Record<string, boolean> = {};
	private readonly movement = {
		forward: new THREE.Vector3(),
		right: new THREE.Vector3(),
		up: new THREE.Vector3(0, 1, 0),
		move: new THREE.Vector3()
	};
	private theme: SceneTheme = 'orbit';

	public constructor(host: HTMLElement, theme: SceneTheme = 'orbit') {
		this.host = host;
		this.theme = theme;
		this.scene = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 5000);
		this.camera.position.set(0, 220, 620);
		this.camera.lookAt(0, 0, 0);

		this.renderer = new THREE.WebGLRenderer({
			antialias: true,
			alpha: true,
			powerPreference: 'high-performance'
		});
		this.renderer.setClearColor(0x000000, 0);
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		this.renderer.domElement.style.width = '100%';
		this.renderer.domElement.style.height = '100%';
		this.renderer.domElement.style.display = 'block';

		this.host.appendChild(this.renderer.domElement);
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.enableDamping = true;
		this.controls.dampingFactor = 0.07;
		this.controls.enablePan = true;
		this.controls.enableZoom = false;
		this.controls.minDistance = 45;
		this.controls.maxDistance = 3200;
		this.controls.target.set(0, 0, 0);

		this.scene.add(this.root);
		this.root.rotation.x = -0.54;
		this.root.add(this.centerGroup);
		this.root.add(this.rings);
		this.root.add(this.starfield);
		this.root.add(this.portalGroup);

		this.light.position.set(0, 0, 0);
		this.scene.add(this.light);
		this.scene.add(this.ambient);

		this.initCentralBody();
		this.initStarfield();
		this.initPortals();
	}

	public start() {
		this.resize();
		this.resizeObserver = new ResizeObserver(() => this.resize());
		this.resizeObserver.observe(this.host);
		this.renderer.domElement.addEventListener('wheel', this.onWheel, { passive: false });
		this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
		this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
		this.renderer.domElement.addEventListener('pointerup', this.onPointerUp);
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
		if (this.theme === theme) return;
		this.theme = theme;
		this.initCentralBody();
		this.applyThemeToStarfield();
		this.rebuildOrbitRings(this.ringCount);
		this.initPortals();
	}

	private initCentralBody() {
		this.centerGroup.clear();
		this.coreMesh?.geometry.dispose();
		(this.coreMesh?.material as THREE.Material | undefined)?.dispose();
		this.accretionRing?.geometry.dispose();
		(this.accretionRing?.material as THREE.Material | undefined)?.dispose();
		(this.sunGlow?.material as THREE.Material | undefined)?.dispose();

		const config = THEME_CONFIG[this.theme];

		this.coreMesh = new THREE.Mesh(
			new THREE.SphereGeometry(38, 28, 28),
			new THREE.MeshBasicMaterial({ color: config.coreColor })
		);
		this.centerGroup.add(this.coreMesh);

		const glowTexture = this.buildGlowTexture(config);
		this.sunGlow = new THREE.Sprite(
			new THREE.SpriteMaterial({
				map: glowTexture,
				color: config.glowTint,
				transparent: true,
				blending: THREE.AdditiveBlending,
				depthWrite: false
			})
		);
		this.sunGlow.scale.set(config.isBlackHole ? 280 : 240, config.isBlackHole ? 280 : 240, 1);
		this.centerGroup.add(this.sunGlow);

		if (config.isBlackHole) {
			this.accretionRing = new THREE.Mesh(
				new THREE.TorusGeometry(52, 13, 24, 120),
				new THREE.MeshBasicMaterial({
					color: config.glowTint,
					transparent: true,
					opacity: 0.7
				})
			);
			this.accretionRing.rotation.x = Math.PI / 2.75;
			this.centerGroup.add(this.accretionRing);
		}

		this.light.color.setHex(config.lightColor);
		this.ambient.color.setHex(config.ambientColor);
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

	private initStarfield() {
		this.starMaterials = [];
		const config = THEME_CONFIG[this.theme];
		const layers = [1700, 2500];
		for (let l = 0; l < layers.length; l += 1) {
			const count = l === 0 ? 3000 : 2000;
			const spread = layers[l];
			const positions = new Float32Array(count * 3);
			for (let i = 0; i < count; i += 1) {
				positions[i * 3] = (Math.random() - 0.5) * spread;
				positions[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.6;
				positions[i * 3 + 2] = (Math.random() - 0.5) * spread;
			}
			const geometry = new THREE.BufferGeometry();
			geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
			const material = new THREE.PointsMaterial({
				size: l === 0 ? 1.5 : 1.1,
				color: l === 0 ? config.starNear : config.starFar,
				transparent: true,
				opacity: l === 0 ? 0.55 : 0.35,
				depthWrite: false
			});
			const points = new THREE.Points(geometry, material);
			this.starMaterials.push(material);
			this.starfield.add(points);
		}
	}

	private initPortals() {
		this.portalGroup.clear();
		this.portalTargets = [];

		for (const portal of PORTAL_CONFIG) {
			if (portal.theme === this.theme) continue;

			const config = THEME_CONFIG[portal.theme];
			const group = new THREE.Group();
			group.position.set(...portal.position);
			group.userData.href = portal.href;

			const body = new THREE.Mesh(
				new THREE.SphereGeometry(config.isBlackHole ? 26 : 18, 20, 20),
				new THREE.MeshBasicMaterial({ color: config.coreColor })
			);
			group.add(body);

			const glow = new THREE.Sprite(
				new THREE.SpriteMaterial({
					map: this.buildGlowTexture(config),
					color: config.glowTint,
					transparent: true,
					blending: THREE.AdditiveBlending,
					depthWrite: false
				})
			);
			glow.scale.set((config.isBlackHole ? 180 : 130) * portal.scale, (config.isBlackHole ? 180 : 130) * portal.scale, 1);
			group.add(glow);

			const label = new THREE.Sprite(
				new THREE.SpriteMaterial({
					map: this.buildLabelTexture(portal.label),
					transparent: true,
					depthWrite: false
				})
			);
			label.position.set(0, config.isBlackHole ? 78 : 52, 0);
			label.scale.set(160 * portal.scale, 42 * portal.scale, 1);
			group.add(label);

			if (config.isBlackHole) {
				const ring = new THREE.Mesh(
					new THREE.TorusGeometry(34, 7, 16, 72),
					new THREE.MeshBasicMaterial({
						color: config.glowTint,
						transparent: true,
						opacity: 0.75
					})
				);
				ring.rotation.x = Math.PI / 2.5;
				group.add(ring);
			}

			const hotspot = new THREE.Mesh(
				new THREE.SphereGeometry(42, 12, 12),
				new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
			);
			hotspot.userData.href = portal.href;
			hotspot.userData.theme = portal.theme;
			group.add(hotspot);
			this.portalTargets.push(hotspot);

			this.portalGroup.add(group);
		}
	}

	private buildLabelTexture(label: string) {
		const canvas = document.createElement('canvas');
		canvas.width = 320;
		canvas.height = 84;
		const ctx = canvas.getContext('2d');
		if (!ctx) return new THREE.CanvasTexture(canvas);

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.fillStyle = 'rgba(6, 12, 24, 0.76)';
		ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
		ctx.lineWidth = 2;
		const radius = 22;
		ctx.beginPath();
		ctx.moveTo(radius, 0);
		ctx.lineTo(canvas.width - radius, 0);
		ctx.quadraticCurveTo(canvas.width, 0, canvas.width, radius);
		ctx.lineTo(canvas.width, canvas.height - radius);
		ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - radius, canvas.height);
		ctx.lineTo(radius, canvas.height);
		ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - radius);
		ctx.lineTo(0, radius);
		ctx.quadraticCurveTo(0, 0, radius, 0);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();

		ctx.fillStyle = 'rgba(236, 244, 255, 0.92)';
		ctx.font = '600 28px Outfit, sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(label, canvas.width / 2, canvas.height / 2);

		const texture = new THREE.CanvasTexture(canvas);
		texture.needsUpdate = true;
		return texture;
	}

	private applyThemeToStarfield() {
		const config = THEME_CONFIG[this.theme];
		for (let i = 0; i < this.starMaterials.length; i += 1) {
			this.starMaterials[i].color.setHex(i === 0 ? config.starNear : config.starFar);
		}
	}

	private rebuildOrbitRings(ringCount: number) {
		this.rings.clear();
		const config = THEME_CONFIG[this.theme];
		const ringMaterial = new THREE.LineBasicMaterial({
			color: config.ringColor,
			transparent: true,
			opacity: 0.22
		});

		for (let ring = 0; ring < ringCount; ring += 1) {
			const radius = orbitRadiusForRing(ring);
			const segments = 96;
			const points: THREE.Vector3[] = [];
			for (let i = 0; i <= segments; i += 1) {
				const theta = (i / segments) * Math.PI * 2;
				points.push(new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius));
			}
			const geometry = new THREE.BufferGeometry().setFromPoints(points);
			const line = new THREE.Line(geometry, ringMaterial);
			this.rings.add(line);
		}
	}

	private rebuildPlanetInstances() {
		if (this.planetMesh) {
			this.root.remove(this.planetMesh);
			this.planetMesh.geometry.dispose();
			const material = this.planetMesh.material as THREE.Material;
			material.dispose();
		}

		const count = Math.max(1, this.planets.length);
		const geometry = new THREE.SphereGeometry(1, 12, 12);
		const material = new THREE.MeshStandardMaterial({
			metalness: 0.12,
			roughness: 0.45
		});
		this.planetMesh = new THREE.InstancedMesh(geometry, material, count);
		this.planetMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
		this.planetMesh.castShadow = false;
		this.planetMesh.receiveShadow = false;

		if (this.planets.length === 0) {
			this.dummy.position.set(100000, 100000, 100000);
			this.dummy.updateMatrix();
			this.planetMesh.setMatrixAt(0, this.dummy.matrix);
			this.planetMesh.setColorAt(0, new THREE.Color('#7dd3fc'));
		} else {
			for (let i = 0; i < this.planets.length; i += 1) {
				this.planetMesh.setColorAt(i, this.planets[i].color);
			}
		}

		this.root.add(this.planetMesh);
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
		this.dolly(zoomFactor);
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
		this.renderer.domElement.style.cursor = this.hoveredPortal ? 'pointer' : 'grabbing';
	};

	private readonly onPointerUp = (event: PointerEvent) => {
		this.updatePointer(event);
		this.raycaster.setFromCamera(this.pointer, this.camera);
		const hit = this.raycaster.intersectObjects(this.portalTargets, false)[0]?.object ?? null;
		const moved = Math.hypot(event.clientX - this.pointerDown.x, event.clientY - this.pointerDown.y);
		this.renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';

		if (!hit || moved > 8) return;
		const href = hit.userData.href as string | undefined;
		if (href) window.location.assign(href);
	};

	private updatePointer(event: PointerEvent) {
		const rect = this.renderer.domElement.getBoundingClientRect();
		this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
	}

	private dolly(factor: number) {
		const offset = this.camera.position.clone().sub(this.controls.target);
		const nextDistance = THREE.MathUtils.clamp(
			offset.length() * factor,
			this.controls.minDistance,
			this.controls.maxDistance
		);
		offset.setLength(nextDistance);
		this.camera.position.copy(this.controls.target).add(offset);
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

	private tick() {
		const dt = Math.min(this.clock.getDelta(), 0.05);
		this.elapsed += dt;
		this.storyZoom = THREE.MathUtils.lerp(this.storyZoom, this.storyZoomTarget, Math.min(1, dt * 3));

		this.starfield.rotation.y += dt * 0.008;
		this.starfield.rotation.x = Math.sin(this.elapsed * 0.1) * 0.02;
		this.root.scale.setScalar(1 + this.storyZoom * 1.55);

		if (this.sunGlow) {
			const pulse = 1 + Math.sin(this.elapsed * 1.3) * 0.06;
			const baseScale = THEME_CONFIG[this.theme].isBlackHole ? 280 : 240;
			this.sunGlow.scale.set(baseScale * pulse, baseScale * pulse, 1);
		}

		if (this.accretionRing) {
			this.accretionRing.rotation.z += dt * 0.45;
		}

		if (this.planetMesh && this.planets.length > 0) {
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
				this.planetMesh.setMatrixAt(i, this.dummy.matrix);
			}
			this.planetMesh.instanceMatrix.needsUpdate = true;
		}

		this.updateFreeMovement(dt);
		this.controls.update();
		this.renderer.render(this.scene, this.camera);
		this.raf = requestAnimationFrame(() => this.tick());
	}
}
