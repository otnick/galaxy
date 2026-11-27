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
	mx_fractal_noise_vec3,
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
	const intensity = uniform(star.kind === 'pulsar' ? 1.9 : 1.55);
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
	material.opacityNode = fade.mul(0.22);
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

/** rotate around the Y axis */
const rotY = (v: THREE.Node<'vec3'>, a: THREE.Node<'float'>) => {
	const c = cos(a);
	const s = sin(a);
	return vec3(v.x.mul(c).sub(v.z.mul(s)), v.y, v.x.mul(s).add(v.z.mul(c)));
};

/**
 * Planet surface. Meshes are not rotated (only scaled), so the local
 * position direction equals the world normal; spin is applied in the shader.
 * Relief shading samples the height field once more, shifted towards the sun,
 * which gives crisp, directional terrain detail without normal maps.
 */
export const createPlanetMaterial = (visual: BodyVisual, seed: number, sunPosition: THREE.Vector3, lowPower = false) => {
	const material = new THREE.MeshBasicNodeMaterial();
	const sun = uniform(sunPosition.clone());
	const highlight = uniform(0);
	const [c0, c1, c2] = visual.palette.map(col);
	const atmo = col(visual.atmosphere ?? visual.palette[2]);
	const offset = vec3(seed * 17.3, seed * 9.1, seed * 4.7);
	const spin = time.mul(0.015 + (seed % 1) * 0.02);

	material.colorNode = Fn(() => {
		const N = normalize(normalWorld);
		const L = normalize(sun.sub(positionWorld));
		const V = normalize(cameraPosition.sub(positionWorld));
		const ndl = dot(N, L);
		// tangent direction pointing towards the sun, in surface (spun) space
		const Lt = rotY(normalize(L.sub(N.mul(ndl)).add(vec3(0.00001))), spin);
		const p = rotY(normalize(positionLocal), spin);
		const q = p.add(offset);

		let albedo: THREE.Node<'vec3'> = vec3(0);
		let water: THREE.Node<'float'> = float(0);
		let emissive: THREE.Node<'vec3'> = vec3(0);
		let relief: THREE.Node<'float'> = float(0);
		const eps = 0.012;

		switch (visual.kind) {
			case 'gas': {
				const turb = mx_fractal_noise_vec3(q.mul(vec3(1.2, 3.5, 1.2)).add(vec3(time.mul(0.004), 0, 0)), 3).mul(0.18);
				const lat = p.y.add(turb.y);
				const bands = sin(lat.mul(11.0)).mul(0.5).add(0.5);
				const bands2 = sin(lat.mul(27.0).add(turb.x.mul(6.0))).mul(0.5).add(0.5);
				const t = smoothstep(0.15, 0.85, bands.mul(0.7).add(bands2.mul(0.3)));
				albedo = mix(c0, c1, t);
				albedo = mix(albedo, c2, smoothstep(0.55, 0.95, bands2).mul(0.55));
				const stormCenter = normalize(vec3(0.62, -0.28, 0.73));
				const storm = smoothstep(0.2, 0.02, length(p.sub(stormCenter)));
				albedo = mix(albedo, mix(c2, c1, 0.35), storm.mul(0.9));
				break;
			}
			case 'lava': {
				const warp = mx_fractal_noise_vec3(q.mul(1.4), 2).mul(0.25);
				const h = (x: THREE.Node<'vec3'>) => mx_fractal_noise_float(x.add(warp).mul(2.6), 5);
				const n = h(q);
				if (!lowPower) relief = n.sub(h(q.add(Lt.mul(eps))));
				const cracks = smoothstep(0.06, 0.0, abs(n));
				albedo = mix(c0, c1.mul(0.18), smoothstep(-0.5, 0.6, n));
				const pulse = sin(time.mul(1.1).add(n.mul(7.0))).mul(0.2).add(0.8);
				emissive = c1.mul(cracks).mul(2.6).mul(pulse).add(c2.mul(pow(cracks, 6.0)).mul(1.6));
				break;
			}
			case 'ice': {
				const h = (x: THREE.Node<'vec3'>) => mx_fractal_noise_float(x.mul(2.0), 4);
				const n = h(q);
				if (!lowPower) relief = n.sub(h(q.add(Lt.mul(eps)))).mul(0.6);
				const lines = smoothstep(0.025, 0.0, abs(mx_noise_float(q.mul(5.0).add(n.mul(0.6)))));
				albedo = mix(c1, c2, smoothstep(-0.45, 0.45, n));
				albedo = mix(albedo, c0, lines.mul(0.55));
				water = float(0.25);
				break;
			}
			case 'rock': {
				const h = (x: THREE.Node<'vec3'>) => {
					const crater = mx_worley_noise_float(x.mul(4.2));
					const bowl = smoothstep(0.0, 0.3, crater).mul(0.5);
					return mx_fractal_noise_float(x.mul(2.6), 5).mul(0.45).add(bowl);
				};
				const n = h(q);
				if (!lowPower) relief = n.sub(h(q.add(Lt.mul(eps)))).mul(1.4);
				albedo = mix(c0, c1, smoothstep(0.0, 0.6, n));
				albedo = mix(albedo, c2, smoothstep(0.45, 0.75, n).mul(0.6));
				break;
			}
			default: {
				// terran + ocean: domain-warped continents, coasts, ice caps
				const warp = mx_fractal_noise_vec3(q.mul(1.1), 2).mul(0.32);
				const h = (x: THREE.Node<'vec3'>) => mx_fractal_noise_float(x.add(warp).mul(1.5), lowPower ? 4 : 5, 2.0, 0.5);
				const n = h(q);
				const seaLevel = visual.kind === 'ocean' ? 0.2 : 0.02;
				water = smoothstep(seaLevel + 0.012, seaLevel - 0.012, n);
				if (!lowPower) relief = n.sub(h(q.add(Lt.mul(eps)))).mul(oneMinus(water));
				const depth = smoothstep(-0.7, seaLevel, n);
				const sea = mix(c0.mul(0.55), c0.mul(1.25), pow(depth, 2.0));
				const coast = smoothstep(seaLevel, seaLevel + 0.05, n);
				const land = mix(mix(c2.mul(0.85), c1, coast), c2, smoothstep(seaLevel + 0.22, 0.75, n));
				albedo = mix(land, sea, water);
				const caps = smoothstep(0.8, 0.86, abs(p.y).add(n.mul(0.06)));
				albedo = mix(albedo, vec3(0.93, 0.96, 1.0), caps);
				water = water.mul(oneMinus(caps));
			}
		}

		const diffuse = smoothstep(-0.12, 1.0, ndl);
		const shade = clamp(float(1).add(relief.mul(9.0)), 0.35, 1.6);
		const H = normalize(L.add(V));
		const spec = pow(max(dot(N, H), 0.0), 90.0).mul(water).mul(diffuse).mul(1.2);
		// warm scattering at the terminator for planets with an atmosphere
		const dusk = visual.atmosphere
			? mix(vec3(1.0, 0.62, 0.42), vec3(1.0), smoothstep(0.0, 0.35, ndl))
			: vec3(1.0);
		const fresnel = pow(oneMinus(clamp(dot(N, V), 0, 1)), 3.0);
		const rim = atmo.mul(fresnel).mul(smoothstep(-0.25, 0.4, ndl)).mul(visual.atmosphere ? 0.55 : 0.12);
		const lit = albedo.mul(diffuse.mul(shade).mul(dusk).add(0.012)).add(spec).add(rim).add(emissive);
		return lit.add(atmo.mul(fresnel).mul(highlight).mul(0.6));
	})();

	return { material, uniforms: { sunPosition: sun, highlight } };
};

/** separate cloud shell: clean layering and parallax over the surface */
export const createCloudMaterial = (sun: PlanetUniforms['sunPosition'], seed: number, density = 0.5) => {
	const material = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
	const spin = time.mul(0.024 + (seed % 1) * 0.02);
	const p = rotY(normalize(positionLocal), spin).add(vec3(seed * 3.1, seed * 1.7, 0));
	const warp = mx_fractal_noise_vec3(p.mul(1.6), 2).mul(0.4);
	const n = mx_fractal_noise_float(p.add(warp).mul(vec3(2.2, 4.2, 2.2)), 4).mul(0.5).add(0.5);
	const cover = smoothstep(1.0 - density * 0.62, 1.0 - density * 0.25, n);
	const N = normalize(normalWorld);
	const L = normalize(sun.sub(positionWorld));
	const light = smoothstep(-0.15, 0.8, dot(N, L));
	material.colorNode = vec3(1.0, 0.99, 0.97).mul(light.mul(0.95).add(0.02));
	material.opacityNode = cover.mul(0.92);
	return material;
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
	const ndl = dot(N, L);
	const fres = pow(oneMinus(clamp(dot(N, V), 0, 1)), 4.0);
	const day = smoothstep(-0.35, 0.5, ndl);
	const dusk = mix(vec3(1.0, 0.5, 0.3), vec3(1.0), smoothstep(-0.1, 0.4, ndl));
	material.colorNode = dusk.mul(col(hex)).mul(1.3);
	material.opacityNode = fres.mul(day).mul(0.75);
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

/** visitor planets: lit spheres that also glow faintly in their own colour */
export const createCommunityMaterial = (sun: PlanetUniforms['sunPosition']) => {
	const material = new THREE.MeshBasicNodeMaterial();
	const tint = attribute('aTint', 'vec3');
	const L = normalize(sun.sub(positionWorld));
	const N = normalize(normalWorld);
	const V = normalize(cameraPosition.sub(positionWorld));
	const light = smoothstep(-0.2, 0.9, dot(N, L));
	const rim = pow(oneMinus(clamp(dot(N, V), 0, 1)), 2.0);
	material.colorNode = tint.mul(light.mul(0.9).add(0.35)).add(tint.mul(rim).mul(0.8));
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

/**
 * Volumetric-looking nebula clouds: large additive billboards whose shape
 * comes from fractal noise, so every cloud is unique. They fade out when the
 * camera gets close, which keeps the haze around a target, never in front of it.
 */
export const createNebulaMaterial = (lowPower: boolean) => {
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
	material.positionNode = aPos;
	material.scaleNode = aSize;

	const p = uv().sub(0.5).mul(2.0);
	const d = length(p);
	const drift = time.mul(0.008);
	const q = vec3(p.mul(1.4), aSeed.mul(37.0).add(drift));
	const warp = mx_fractal_noise_float(q.mul(0.8), 2, 2.0, 0.5);
	const n = mx_fractal_noise_float(q.add(warp.mul(0.9)), lowPower ? 2 : 4, 2.0, 0.55).mul(0.5).add(0.5);
	const falloff = pow(max(oneMinus(d), 0.0), 1.6);
	const density = smoothstep(0.38, 0.85, n).mul(falloff);
	const dist = length(aPos.sub(cameraPosition));
	const near = smoothstep(aSize.mul(0.25), aSize.mul(0.9), dist);
	// denser cores glow warmer and brighter
	const tint = mix(aColor, aColor.mul(vec3(1.5, 1.2, 1.35)), smoothstep(0.6, 0.95, n));
	material.colorNode = vec4(tint.mul(brightness), 1);
	material.opacityNode = density.mul(near).mul(brightness).mul(0.55);
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
		const neb = mix(violet, teal, smoothstep(0.35, 0.7, n2)).mul(pow(n1, 1.6));
		const glow = mix(neb, rose, smoothstep(0.62, 0.95, n1.mul(n2).mul(1.6)).mul(0.6)).mul(band.mul(1.4).add(0.25));
		const base = vec3(0.004, 0.006, 0.014);
		// a second, wider veil so the haze reaches well beyond the galactic band
		const veil = mix(teal, violet, n1).mul(smoothstep(0.42, 0.85, n2)).mul(0.55);
		return base.add(glow.mul(1.25)).add(veil);
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
