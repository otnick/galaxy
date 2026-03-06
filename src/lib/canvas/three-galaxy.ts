import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { PlanetRecord } from '$lib/types';

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

export class ThreeGalaxyEngine {
	private readonly host: HTMLElement;
	private readonly renderer: THREE.WebGLRenderer;
	private readonly scene: THREE.Scene;
	private readonly camera: THREE.PerspectiveCamera;
	private readonly controls: OrbitControls;
	private readonly root = new THREE.Group();
	private readonly starfield = new THREE.Group();
	private readonly rings = new THREE.Group();
	private readonly light = new THREE.PointLight(0xffd37f, 2.4, 2200);
	private readonly ambient = new THREE.AmbientLight(0x8ba6ff, 0.35);
	private readonly clock = new THREE.Clock();
	private readonly dummy = new THREE.Object3D();
	private resizeObserver?: ResizeObserver;
	private raf = 0;
	private width = 0;
	private height = 0;
	private pixelRatio = 1;
	private planets: PlanetState[] = [];
	private planetMesh?: THREE.InstancedMesh;
	private sunGlow?: THREE.Sprite;
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

	public constructor(host: HTMLElement) {
		this.host = host;
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
		this.root.add(this.rings);
		this.root.add(this.starfield);

		this.light.position.set(0, 0, 0);
		this.scene.add(this.light);
		this.scene.add(this.ambient);

		this.initSun();
		this.initStarfield();
	}

	public start() {
		this.resize();
		this.resizeObserver = new ResizeObserver(() => this.resize());
		this.resizeObserver.observe(this.host);
		this.renderer.domElement.addEventListener('wheel', this.onWheel, { passive: false });
		window.addEventListener('keydown', this.onKeyDown);
		window.addEventListener('keyup', this.onKeyUp);
		this.clock.start();
		this.raf = requestAnimationFrame(() => this.tick());
	}

	public stop() {
		cancelAnimationFrame(this.raf);
		this.resizeObserver?.disconnect();
		this.renderer.domElement.removeEventListener('wheel', this.onWheel);
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

		const ringCount = planets.length ? Math.max(...planets.map((p) => p.orbitRing)) + 1 : 1;
		this.rebuildOrbitRings(ringCount);
		this.rebuildPlanetInstances();
	}

	public setStoryZoom(progress: number) {
		this.storyZoomTarget = THREE.MathUtils.clamp(progress, 0, 1);
	}

	private initSun() {
		const sun = new THREE.Mesh(
			new THREE.SphereGeometry(38, 24, 24),
			new THREE.MeshBasicMaterial({ color: 0xffcf73 })
		);
		this.root.add(sun);

		const glowTexture = this.buildGlowTexture();
		this.sunGlow = new THREE.Sprite(
			new THREE.SpriteMaterial({
				map: glowTexture,
				color: 0xffb45e,
				transparent: true,
				blending: THREE.AdditiveBlending,
				depthWrite: false
			})
		);
		this.sunGlow.scale.set(240, 240, 1);
		this.root.add(this.sunGlow);
	}

	private buildGlowTexture() {
		const size = 128;
		const canvas = document.createElement('canvas');
		canvas.width = size;
		canvas.height = size;
		const ctx = canvas.getContext('2d');
		if (!ctx) return new THREE.CanvasTexture(canvas);

		const gradient = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
		gradient.addColorStop(0, 'rgba(255,240,177,1)');
		gradient.addColorStop(0.35, 'rgba(255,189,102,0.8)');
		gradient.addColorStop(1, 'rgba(255,148,61,0)');
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, size, size);

		const texture = new THREE.CanvasTexture(canvas);
		texture.needsUpdate = true;
		return texture;
	}

	private initStarfield() {
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
				color: l === 0 ? 0xbfd8ff : 0x9fb3e1,
				transparent: true,
				opacity: l === 0 ? 0.55 : 0.35,
				depthWrite: false
			});
			const points = new THREE.Points(geometry, material);
			this.starfield.add(points);
		}
	}

	private rebuildOrbitRings(ringCount: number) {
		this.rings.clear();
		const ringMaterial = new THREE.LineBasicMaterial({
			color: 0xb7ceff,
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
			this.sunGlow.scale.set(240 * pulse, 240 * pulse, 1);
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
