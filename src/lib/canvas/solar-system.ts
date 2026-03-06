import type { PlanetRecord } from '$lib/types';

type RenderPlanet = {
	id: number;
	color: string;
	size: number;
	speed: number;
	ring: number;
	slot: number;
	angle: number;
	verticalPhase: number;
	armOffset: number;
};

type Star = {
	x: number;
	y: number;
	z: number;
	size: number;
	alpha: number;
};

const PLANETS_PER_RING = 20;
const BASE_ORBIT_RADIUS = 100;
const ORBIT_SPACING = 38;
const FOV = 620;

export const orbitRadiusForRing = (ring: number) => BASE_ORBIT_RADIUS + ring * ORBIT_SPACING;

export class SolarSystemEngine {
	private readonly canvas: HTMLCanvasElement;
	private readonly context: CanvasRenderingContext2D;
	private animationFrame = 0;
	private lastTimestamp = 0;
	private width = 0;
	private height = 0;
	private centerX = 0;
	private centerY = 0;
	private dpr = 1;
	private resizeObserver?: ResizeObserver;
	private planets: RenderPlanet[] = [];
	private stars: Star[] = [];
	private ringCount = 1;
	private pointerX = 0;
	private pointerY = 0;
	private targetPointerX = 0;
	private targetPointerY = 0;
	private elapsed = 0;

	public constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		const context = canvas.getContext('2d', { alpha: true });
		if (!context) throw new Error('Unable to get 2D context.');
		this.context = context;
	}

	public start() {
		this.resize();
		this.buildStarfield();
		this.resizeObserver = new ResizeObserver(() => this.resize());
		this.resizeObserver.observe(this.canvas);
		this.lastTimestamp = performance.now();
		this.animationFrame = requestAnimationFrame((ts) => this.tick(ts));
	}

	public stop() {
		cancelAnimationFrame(this.animationFrame);
		this.resizeObserver?.disconnect();
	}

	public setPointer(normalizedX: number, normalizedY: number) {
		this.targetPointerX = Math.max(-1, Math.min(1, normalizedX));
		this.targetPointerY = Math.max(-1, Math.min(1, normalizedY));
	}

	public setPlanets(planets: PlanetRecord[]) {
		this.planets = planets.map((planet) => {
			const baseAngle = (planet.slot / PLANETS_PER_RING) * Math.PI * 2;
			return {
				id: planet.id,
				color: planet.color,
				size: planet.size,
				speed: planet.speed,
				ring: planet.orbitRing,
				slot: planet.slot,
				angle: baseAngle,
				verticalPhase: (planet.id % 37) * 0.16,
				armOffset: ((planet.slot % 4) / 4) * Math.PI * 2
			};
		});

		const maxRing = this.planets.reduce((acc, planet) => Math.max(acc, planet.ring), 0);
		this.ringCount = maxRing + 1;
	}

	private resize() {
		const rect = this.canvas.getBoundingClientRect();
		this.dpr = Math.min(window.devicePixelRatio || 1, 2);
		this.width = Math.floor(rect.width);
		this.height = Math.floor(rect.height);
		this.canvas.width = Math.floor(this.width * this.dpr);
		this.canvas.height = Math.floor(this.height * this.dpr);
		this.context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
		this.centerX = this.width * 0.5;
		this.centerY = this.height * 0.5;
	}

	private buildStarfield() {
		const stars: Star[] = [];
		for (let i = 0; i < 900; i += 1) {
			const spread = 1200;
			stars.push({
				x: (Math.random() - 0.5) * spread * 2,
				y: (Math.random() - 0.5) * spread * 1.5,
				z: Math.random() * 1400 - 700,
				size: Math.random() * 1.7 + 0.2,
				alpha: Math.random() * 0.6 + 0.2
			});
		}
		this.stars = stars;
	}

	private tick(timestamp: number) {
		const deltaSeconds = Math.min((timestamp - this.lastTimestamp) / 1000, 0.05);
		this.lastTimestamp = timestamp;
		this.elapsed += deltaSeconds;
		this.update(deltaSeconds);
		this.render();
		this.animationFrame = requestAnimationFrame((ts) => this.tick(ts));
	}

	private update(deltaSeconds: number) {
		this.pointerX += (this.targetPointerX - this.pointerX) * Math.min(1, deltaSeconds * 4.5);
		this.pointerY += (this.targetPointerY - this.pointerY) * Math.min(1, deltaSeconds * 4.5);

		for (let i = 0; i < this.planets.length; i += 1) {
			const planet = this.planets[i];
			planet.angle += planet.speed * deltaSeconds;
			if (planet.angle > Math.PI * 2) planet.angle -= Math.PI * 2;
		}
	}

	private projectPoint(x: number, y: number, z: number) {
		const rotY = this.pointerX * 0.45;
		const rotX = this.pointerY * 0.24 + 0.4;

		const cosY = Math.cos(rotY);
		const sinY = Math.sin(rotY);
		const cosX = Math.cos(rotX);
		const sinX = Math.sin(rotX);

		const xzX = x * cosY - z * sinY;
		const xzZ = z * cosY + x * sinY;
		const yzY = y * cosX - xzZ * sinX;
		const yzZ = xzZ * cosX + y * sinX;

		const perspective = FOV / (FOV + yzZ + 520);
		return {
			x: this.centerX + xzX * perspective,
			y: this.centerY + yzY * perspective,
			scale: perspective,
			depth: yzZ
		};
	}

	private renderCore() {
		const core = this.context.createRadialGradient(
			this.centerX,
			this.centerY,
			12,
			this.centerX,
			this.centerY,
			74
		);
		core.addColorStop(0, 'rgba(255,245,183,1)');
		core.addColorStop(0.32, 'rgba(255,212,96,0.95)');
		core.addColorStop(0.7, 'rgba(255,170,42,0.52)');
		core.addColorStop(1, 'rgba(255,140,30,0)');

		this.context.fillStyle = core;
		this.context.beginPath();
		this.context.arc(this.centerX, this.centerY, 74, 0, Math.PI * 2);
		this.context.fill();
	}

	private renderStarfield() {
		for (let i = 0; i < this.stars.length; i += 1) {
			const star = this.stars[i];
			const drift = this.elapsed * 0.03;
			const projected = this.projectPoint(star.x + drift * star.z * 0.08, star.y, star.z);
			if (projected.scale <= 0.02) continue;
			if (
				projected.x < -20 ||
				projected.x > this.width + 20 ||
				projected.y < -20 ||
				projected.y > this.height + 20
			) {
				continue;
			}
			const radius = star.size * projected.scale * 3.2;
			this.context.fillStyle = `rgba(186, 211, 255, ${star.alpha * projected.scale * 3.8})`;
			this.context.beginPath();
			this.context.arc(projected.x, projected.y, radius, 0, Math.PI * 2);
			this.context.fill();
		}
	}

	private renderOrbitBands() {
		this.context.strokeStyle = 'rgba(184, 208, 255, 0.13)';
		this.context.lineWidth = 1;
		for (let ring = 0; ring < this.ringCount; ring += 1) {
			const radius = orbitRadiusForRing(ring);
			const steps = 72;
			this.context.beginPath();
			for (let s = 0; s <= steps; s += 1) {
				const t = (s / steps) * Math.PI * 2;
				const point = this.projectPoint(Math.cos(t) * radius, 0, Math.sin(t) * radius);
				if (s === 0) this.context.moveTo(point.x, point.y);
				else this.context.lineTo(point.x, point.y);
			}
			this.context.stroke();
		}
	}

	private renderPlanets3D() {
		const drawList: Array<{
			x: number;
			y: number;
			radius: number;
			color: string;
			depth: number;
		}> = [];

		for (let i = 0; i < this.planets.length; i += 1) {
			const planet = this.planets[i];
			const radius = orbitRadiusForRing(planet.ring);
			const spiral = planet.angle + planet.armOffset + planet.ring * 0.16;
			const x = Math.cos(spiral) * radius;
			const z = Math.sin(spiral) * radius;
			const y = Math.sin(this.elapsed * 0.8 + planet.verticalPhase) * (planet.ring * 0.6);
			const projected = this.projectPoint(x, y, z);
			if (projected.scale <= 0) continue;

			drawList.push({
				x: projected.x,
				y: projected.y,
				radius: Math.max(0.8, planet.size * projected.scale * 2),
				color: planet.color,
				depth: projected.depth
			});
		}

		drawList.sort((a, b) => a.depth - b.depth);

		for (let i = 0; i < drawList.length; i += 1) {
			const item = drawList[i];
			this.context.fillStyle = item.color;
			this.context.beginPath();
			this.context.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
			this.context.fill();

			this.context.fillStyle = 'rgba(255,255,255,0.35)';
			this.context.beginPath();
			this.context.arc(item.x - item.radius * 0.3, item.y - item.radius * 0.3, item.radius * 0.38, 0, Math.PI * 2);
			this.context.fill();
		}
	}

	private render() {
		this.context.clearRect(0, 0, this.width, this.height);
		this.renderStarfield();
		this.renderOrbitBands();
		this.renderPlanets3D();
		this.renderCore();
	}
}
