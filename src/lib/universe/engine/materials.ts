/**
 * TSL (Three Shading Language) node materials.
 * They compile to WGSL on WebGPU and to GLSL on the WebGL2 fallback,
 * so the same shader code runs everywhere.
 */
import * as THREE from 'three/webgpu';
import {
	Fn,
	abs,
	atan,
	attribute,
	cameraPosition,
	clamp,
	color,
	cos,
	dot,
	exp,
	float,
	length,
	max,
	mix,
	mx_fractal_noise_float,
	mx_noise_float,
	mx_worley_noise_float,
	normalView,
	normalWorld,
	normalize,
	oneMinus,
	positionLocal,
	positionViewDirection,
	positionWorld,
	pow,
	sin,
	smoothstep,
	time,
	uniform,
	uv,
	vec2,
	vec3,
	vec4
} from 'three/tsl';
import type { BodyVisual, StarVisual } from '../content';

const col = (hex: string) => color(new THREE.Color(hex));

/* ------------------------------------------------------------------ */
/* Stars                                                               */
/* ------------------------------------------------------------------ */

export const createStarMaterial = (star: StarVisual, seed: number) => {
	const material = new THREE.MeshBasicNodeMaterial();
	const intensity = uniform(star.kind === 'pulsar' ? 2.4 : 2.2);
	const [deep, mid, hot] = star.palette.map(col);
	const offset = vec3(seed * 13.1, seed * 7.7, seed * 3.3);

	material.colorNode = Fn(() => {
		const p = normalize(positionLocal).add(offset);
		const slow = mx_fractal_noise_float(p.mul(2.2).add(vec3(0, time.mul(0.035), 0)), 4, 2.0, 0.5);
		const fast = mx_fractal_noise_float(p.mul(8.0).sub(vec3(time.mul(0.06))), 3, 2.0, 0.55);
		// granulation cells
		const cells = mx_worley_noise_float(p.mul(14.0).add(time.mul(0.02)));
		const t = slow.mul(0.55).add(fast.mul(0.35)).add(cells.mul(0.35)).add(0.15);
		const base = mix(deep, mid, smoothstep(-0.35, 0.25, t));
		const surface = mix(base, hot, smoothstep(0.25, 0.75, t));
		// limb darkening + hot rim
		const facing = clamp(dot(normalView, positionViewDirection), 0, 1);
		const limb = mix(float(0.45), float(1.0), pow(facing, 0.6));
		const rim = pow(oneMinus(facing), 3.0).mul(0.8);
		let pulse: THREE.Node<'float'> = float(1);
		if (star.kind === 'pulsar') pulse = sin(time.mul(5.0)).mul(0.25).add(1.0);
		return surface.mul(limb).add(hot.mul(rim)).mul(intensity).mul(pulse);
	})();

	return { material, intensity };
};

export const createCoronaMaterial = (star: StarVisual, seed: number) => {
	const material = new THREE.SpriteNodeMaterial({
		transparent: true,
		depthWrite: false,
		blending: THREE.AdditiveBlending
	});
	const strength = uniform(1);
	const glowColor = col(star.corona);

	const glow = Fn(() => {
		const c = uv().sub(0.5);
		const d = length(c).mul(2.0);
		const angle = atan(c.y, c.x);
		const rays = mx_noise_float(vec2(angle.mul(4.0).add(seed), time.mul(0.15).add(d.mul(2.0))))
			.mul(0.5)
			.add(0.5);
		const fall = max(oneMinus(d), 0.0);
		const core = exp(d.mul(-9.0)).mul(1.6);
		const halo = pow(fall, 2.6).mul(0.55);
		const streaks = pow(fall, 3.0).mul(pow(rays, 3.0)).mul(0.9);
		return core.add(halo).add(streaks).mul(strength);
	})();

	material.colorNode = glowColor.mul(glow).mul(1.6);
	material.opacityNode = clamp(glow, 0, 1);
	return { material, strength };
};

/** Two light beams for the pulsar */
export const createBeamMaterial = (hex: string) => {
	const material = new THREE.MeshBasicNodeMaterial({
		transparent: true,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
		side: THREE.DoubleSide
	});
	const v = uv();
	const along = oneMinus(v.y);
	const fade = pow(along, 1.6).mul(smoothstep(0.0, 0.08, v.y));
	const flicker = sin(time.mul(5.0)).mul(0.3).add(0.7);
	material.colorNode = col(hex).mul(2.0).mul(flicker);
	material.opacityNode = fade.mul(0.35);
	return material;
};

/* ------------------------------------------------------------------ */
/* Planets                                                             */
/* ------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SunUniform = any;
export type PlanetUniforms = {
	sunPosition: SunUniform;
	highlight: { value: number };
};

export const createPlanetMaterial = (visual: BodyVisual, seed: number, sunPosition: THREE.Vector3) => {
	const material = new THREE.MeshBasicNodeMaterial();
	const sun = uniform(sunPosition.clone());
	const highlight = uniform(0);
	const [c0, c1, c2] = visual.palette.map(col);
	const atmo = col(visual.atmosphere ?? visual.palette[2]);
	const offset = vec3(seed * 17.3, seed * 9.1, seed * 4.7);

	material.colorNode = Fn(() => {
		const p = normalize(positionLocal);
		const q = p.add(offset);
		const N = normalize(normalWorld);
		const L = normalize(sun.sub(positionWorld));
		const V = normalize(cameraPosition.sub(positionWorld));
		const ndl = dot(N, L);
		const light = smoothstep(-0.18, 0.9, ndl);

		let albedo: THREE.Node<'vec3'> = vec3(0);
		let water: THREE.Node<'float'> = float(0);
		let emissive: THREE.Node<'vec3'> = vec3(0);

		switch (visual.kind) {
			case 'gas': {
				const warp = mx_fractal_noise_float(q.mul(vec3(2.0, 6.0, 2.0)).add(vec3(time.mul(0.01), 0, 0)), 4);
				const bands = sin(p.y.mul(13.0).add(warp.mul(3.2))).mul(0.5).add(0.5);
				const fine = mx_noise_float(q.mul(vec3(1.5, 40.0, 1.5))).mul(0.5).add(0.5);
				albedo = mix(mix(c0, c1, bands), c2, smoothstep(0.55, 1.0, fine.mul(bands)));
				// storm eye
				const storm = smoothstep(0.22, 0.0, length(p.sub(normalize(vec3(0.7, -0.25, 0.65)))));
				albedo = mix(albedo, c2.mul(1.1), storm.mul(0.8));
				break;
			}
			case 'lava': {
				const n = mx_fractal_noise_float(q.mul(3.2), 5);
				const cracks = smoothstep(0.08, 0.0, abs(n));
				albedo = mix(c0, c1.mul(0.25), smoothstep(-0.5, 0.6, n));
				const pulse = sin(time.mul(1.3).add(n.mul(8.0))).mul(0.25).add(0.75);
				emissive = c1.mul(cracks).mul(3.2).mul(pulse).add(c2.mul(pow(cracks, 4.0)).mul(2.0));
				break;
			}
			case 'ice': {
				const n = mx_fractal_noise_float(q.mul(2.4), 5);
				const lines = smoothstep(0.035, 0.0, abs(mx_noise_float(q.mul(6.0))));
				albedo = mix(c1, c2, smoothstep(-0.4, 0.5, n));
				albedo = mix(albedo, c0, lines.mul(0.7));
				water = float(0.35);
				break;
			}
			case 'rock': {
				const n = mx_fractal_noise_float(q.mul(3.0), 5);
				const crater = mx_worley_noise_float(q.mul(5.0));
				const rim = smoothstep(0.05, 0.18, crater).mul(smoothstep(0.32, 0.2, crater));
				albedo = mix(c0, c1, smoothstep(-0.6, 0.6, n));
				albedo = mix(albedo, c2, rim.mul(0.55));
				albedo = albedo.mul(smoothstep(0.0, 0.12, crater).mul(0.4).add(0.6));
				break;
			}
			default: {
				// terran + ocean: continents, coasts, ice caps, clouds
				const h = mx_fractal_noise_float(q.mul(1.8), 6, 2.0, 0.5);
				const seaLevel = visual.kind === 'ocean' ? float(0.22) : float(0.0);
				water = smoothstep(seaLevel.add(0.02), seaLevel.sub(0.02), h);
				const deep = mix(c0.mul(0.6), c0, smoothstep(-0.6, seaLevel, h));
				const shore = smoothstep(seaLevel, seaLevel.add(0.08), h);
				const land = mix(c1, c2, smoothstep(seaLevel.add(0.15), 0.7, h));
				albedo = mix(deep, mix(c2.mul(0.9), land, shore), oneMinus(water));
				const caps = smoothstep(0.78, 0.9, abs(p.y).add(h.mul(0.08)));
				albedo = mix(albedo, vec3(0.92, 0.96, 1.0), caps);
				water = water.mul(oneMinus(caps));
				const clouds = smoothstep(
					0.05,
					0.45,
					mx_fractal_noise_float(q.mul(vec3(2.5, 4.0, 2.5)).add(vec3(time.mul(0.012), 0, 0)), 4)
				);
				albedo = mix(albedo, vec3(1.0), clouds.mul(0.75));
				water = water.mul(oneMinus(clouds));
			}
		}

		const H = normalize(L.add(V));
		const spec = pow(max(dot(N, H), 0.0), 70.0).mul(water).mul(light).mul(1.4);
		const fresnel = pow(oneMinus(clamp(dot(N, V), 0, 1)), 2.5);
		const rim = atmo.mul(fresnel).mul(smoothstep(-0.35, 0.5, ndl)).mul(0.9);
		const ambient = float(0.018);
		const lit = albedo.mul(light.add(ambient)).add(spec).add(rim).add(emissive);
		return lit.add(atmo.mul(fresnel).mul(highlight).mul(0.8));
	})();

	return { material, uniforms: { sunPosition: sun, highlight } };
};

export const createAtmosphereMaterial = (hex: string, sun: PlanetUniforms['sunPosition']) => {
	const material = new THREE.MeshBasicNodeMaterial({
		transparent: true,
		depthWrite: false,
		blending: THREE.AdditiveBlending
	});
	const N = normalize(normalWorld);
	const V = normalize(cameraPosition.sub(positionWorld));
	const L = normalize(sun.sub(positionWorld));
	const fres = pow(oneMinus(clamp(dot(N, V), 0, 1)), 3.5);
	const day = smoothstep(-0.4, 0.6, dot(N, L));
	material.colorNode = col(hex).mul(1.6);
	material.opacityNode = fres.mul(day).mul(0.95);
	return material;
};

export const createRingMaterial = (visual: BodyVisual, seed: number, sun: PlanetUniforms['sunPosition']) => {
	const material = new THREE.MeshBasicNodeMaterial({
		transparent: true,
		depthWrite: false,
		side: THREE.DoubleSide
	});
	const r = length(positionLocal.xy);
	// ring geometry runs from 1.35 to 2.3 in local units
	const t = r.sub(1.35).div(0.95);
	const bands = mx_noise_float(vec2(t.mul(38.0), seed)).mul(0.5).add(0.5);
	const fine = mx_noise_float(vec2(t.mul(140.0), seed + 3.0)).mul(0.5).add(0.5);
	const density = smoothstep(0.0, 0.08, t).mul(smoothstep(1.0, 0.85, t)).mul(bands.mul(0.7).add(fine.mul(0.3)));
	const L = normalize(sun.sub(positionWorld));
	const lightAmt = abs(dot(normalize(normalWorld), L)).mul(0.6).add(0.25);
	material.colorNode = mix(col(visual.palette[1]), col(visual.palette[2]), fine).mul(lightAmt);
	material.opacityNode = density.mul(0.85);
	return material;
};

export const createMoonMaterial = (sun: PlanetUniforms['sunPosition'], seed: number) => {
	const material = new THREE.MeshBasicNodeMaterial();
	const p = normalize(positionLocal).add(seed);
	const n = mx_fractal_noise_float(p.mul(4.0), 4).mul(0.5).add(0.5);
	const L = normalize(sun.sub(positionWorld));
	const light = smoothstep(-0.1, 0.9, dot(normalize(normalWorld), L));
	material.colorNode = mix(vec3(0.25, 0.24, 0.26), vec3(0.75, 0.73, 0.72), n).mul(light.add(0.02));
	return material;
};

/* ------------------------------------------------------------------ */
/* Particles: starfield + galaxy dust                                  */
/* ------------------------------------------------------------------ */

/**
 * Instanced billboards. Each instance reads aPos / aSize / aColor / aSeed.
 * rotationSpeed > 0 makes the whole set orbit the Y axis differentially
 * (inner parts faster) like a real spiral galaxy.
 */
export const createParticleMaterial = (options: { rotationSpeed?: number; nearFade?: number; twinkle?: boolean }) => {
	const material = new THREE.SpriteNodeMaterial({
		transparent: true,
		depthWrite: false,
		blending: THREE.AdditiveBlending
	});
	const brightness = uniform(1);
	const aPos = attribute('aPos', 'vec3');
	const aSize = attribute('aSize', 'float');
	const aColor = attribute('aColor', 'vec3');
	const aSeed = attribute('aSeed', 'float');

	let position: THREE.Node<'vec3'> = aPos;
	if (options.rotationSpeed) {
		const r = length(aPos.xz);
		const angle = time.mul(options.rotationSpeed).div(r.mul(0.0012).add(1.0));
		const c = cos(angle);
		const s = sin(angle);
		position = vec3(aPos.x.mul(c).sub(aPos.z.mul(s)), aPos.y, aPos.x.mul(s).add(aPos.z.mul(c)));
	}
	material.positionNode = position;

	let size: THREE.Node<'float'> = aSize;
	if (options.twinkle) size = aSize.mul(sin(time.mul(aSeed.mul(2.0).add(0.6)).add(aSeed.mul(40.0))).mul(0.3).add(0.85));
	material.scaleNode = size;

	const d = length(uv().sub(0.5)).mul(2.0);
	const disc = pow(max(oneMinus(d), 0.0), 2.2);
	let alpha: THREE.Node<'float'> = disc;
	if (options.nearFade) {
		const worldPos = position; // particles are in world space (object at origin)
		const dist = length(worldPos.sub(cameraPosition));
		alpha = alpha.mul(smoothstep(options.nearFade * 0.12, options.nearFade, dist));
	}
	material.colorNode = vec4(aColor.mul(brightness), 1);
	material.opacityNode = alpha.mul(brightness);
	return { material, brightness };
};

/* ------------------------------------------------------------------ */
/* Sky                                                                 */
/* ------------------------------------------------------------------ */

export const createSkyMaterial = () => {
	const material = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, depthWrite: false });
	material.colorNode = Fn(() => {
		const dir = normalize(positionLocal);
		const n1 = mx_fractal_noise_float(dir.mul(1.6), 5, 2.0, 0.55).mul(0.5).add(0.5);
		const n2 = mx_fractal_noise_float(dir.mul(3.4).add(vec3(4.2, 1.3, 7.7)), 4, 2.0, 0.5).mul(0.5).add(0.5);
		const band = exp(abs(dir.y.add(n1.mul(0.25).sub(0.12))).mul(-4.5));
		const violet = vec3(0.09, 0.035, 0.16);
		const teal = vec3(0.015, 0.07, 0.11);
		const rose = vec3(0.14, 0.03, 0.07);
		const neb = mix(violet, teal, smoothstep(0.35, 0.7, n2)).mul(pow(n1, 2.2));
		const glow = mix(neb, rose, smoothstep(0.62, 0.95, n1.mul(n2).mul(1.6)).mul(0.6)).mul(band.mul(1.4).add(0.25));
		const base = vec3(0.004, 0.006, 0.014);
		return base.add(glow.mul(0.85));
	})();
	return material;
};

/* ------------------------------------------------------------------ */
/* Lines                                                               */
/* ------------------------------------------------------------------ */

export const createOrbitMaterial = (hex: string) => {
	const material = new THREE.LineBasicNodeMaterial({
		transparent: true,
		depthWrite: false,
		blending: THREE.AdditiveBlending
	});
	const opacity = uniform(0.14);
	material.colorNode = col(hex);
	material.opacityNode = opacity;
	return { material, opacity };
};

/** Flat ring under each star (galactic overview), drawn as a soft halo disc */
export const createBeaconMaterial = (hex: string) => {
	const material = new THREE.MeshBasicNodeMaterial({
		transparent: true,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
		side: THREE.DoubleSide
	});
	const opacity = uniform(0);
	const r = length(uv().sub(0.5)).mul(2.0);
	const ringShape = smoothstep(0.9, 0.96, r).mul(smoothstep(1.0, 0.96, r));
	const pulse = sin(time.mul(1.6).sub(r.mul(6.0))).mul(0.5).add(0.5);
	const inner = smoothstep(1.0, 0.0, r).mul(pulse).mul(0.12);
	material.colorNode = col(hex).mul(1.4);
	material.opacityNode = ringShape.add(inner).mul(opacity);
	return { material, opacity };
};
