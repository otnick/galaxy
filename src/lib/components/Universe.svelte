<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { fade } from 'svelte/transition';
	import { SYSTEMS, OWNER, focusKey, focusPath, type Focus } from '$lib/universe/content';
	import type { PlanetRecord } from '$lib/types';
	import type { Telemetry, UniverseEngine } from '$lib/universe/engine/UniverseEngine';
	import ContentPanel from './ContentPanel.svelte';
	import StarMap from './StarMap.svelte';
	import HeadingTape from './HeadingTape.svelte';
	import Icon from './Icon.svelte';

	let { focus }: { focus: Focus } = $props();

	let canvas: HTMLCanvasElement;
	let labelLayer: HTMLDivElement;
	let pillarEl = $state<HTMLElement>();
	let deckEl = $state<HTMLElement>();
	let engine: UniverseEngine | null = null;
	let ro: ResizeObserver | null = null;

	let status = $state<'loading' | 'ready' | 'fallback'>('loading');
	let backend = $state('');
	let fps = $state(0);
	let telemetry = $state<Telemetry>({ heading: 0, range: 0, velocity: 0, warp: 0, mode: 'hold' });
	let hintVisible = $state(true);
	let collapsed = $state(false);
	let isMobile = $state(false);
	let planets = $state<PlanetRecord[]>([]);

	const parentPath = $derived(
		focus.level === 'body' ? `/${focus.system.slug}` : focus.level === 'system' ? '/' : null
	);
	const currentSystem = $derived(focus.level === 'universe' ? null : focus.system.slug);

	const navigate = (path: string) => {
		if (path === focusPath(focus)) return;
		void goto(path, { noScroll: true, keepFocus: true });
	};

	const siblings = () => {
		if (focus.level === 'body') return focus.system.bodies.map((b) => `/${focus.system.slug}/${b.slug}`);
		return SYSTEMS.map((s) => `/${s.slug}`);
	};

	const step = (dir: 1 | -1) => {
		const list = siblings();
		const current = list.indexOf(focusPath(focus));
		const next = current === -1 ? (dir > 0 ? 0 : list.length - 1) : (current + dir + list.length) % list.length;
		navigate(list[next]);
	};

	const onKey = (e: KeyboardEvent) => {
		const t = e.target as HTMLElement;
		if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
		if (e.key === 'Escape' && parentPath) navigate(parentPath);
		else if (e.key === 'ArrowRight') step(1);
		else if (e.key === 'ArrowLeft') step(-1);
		else if (/^[1-9]$/.test(e.key)) {
			const sys = SYSTEMS[Number(e.key) - 1];
			if (sys) navigate(`/${sys.slug}`);
		} else return;
		dismissHint();
	};

	const dismissHint = () => {
		if (!hintVisible) return;
		hintVisible = false;
		try {
			sessionStorage.setItem('u-hint', '1');
		} catch {
			/* storage unavailable */
		}
	};

	const loadPlanets = async () => {
		try {
			const res = await fetch('/api/planets');
			if (!res.ok) return;
			const data = (await res.json()) as { planets: PlanetRecord[] };
			planets = data.planets;
			engine?.setCommunity(planets);
		} catch {
			/* the belt is optional */
		}
	};

	const supportsGPU = () => {
		if ('gpu' in navigator) return true;
		try {
			return !!document.createElement('canvas').getContext('webgl2');
		} catch {
			return false;
		}
	};

	// keep the 3D focus in sync with the URL
	let lastKey = '';
	$effect(() => {
		const key = focusKey(focus);
		if (engine && key !== lastKey) {
			lastKey = key;
			engine.setFocus(focus);
			collapsed = false;
		}
	});

	// frame the target in the part of the window the instruments leave free
	const updateInset = () => {
		if (!engine) return;
		isMobile = window.innerWidth < 820;
		const deck = deckEl?.getBoundingClientRect().height ?? 0;
		const pillar = pillarEl?.getBoundingClientRect();
		if (isMobile) {
			const sheet = pillar ? Math.min(pillar.height, window.innerHeight * 0.62) : 0;
			engine.setInset(0, deck + sheet - 40);
		} else {
			engine.setInset(pillar ? pillar.width + 24 : 0, deck);
		}
	};

	$effect(() => {
		void focus;
		void collapsed;
		if (ro && pillarEl) ro.observe(pillarEl);
		requestAnimationFrame(updateInset);
	});

	onMount(() => {
		isMobile = window.innerWidth < 820;
		try {
			if (sessionStorage.getItem('u-hint')) hintVisible = false;
		} catch {
			/* ignore */
		}
		window.addEventListener('keydown', onKey);
		ro = new ResizeObserver(() => updateInset());
		let alive = true;

		(async () => {
			if (!supportsGPU()) {
				status = 'fallback';
				return;
			}
			try {
				const { UniverseEngine } = await import('$lib/universe/engine/UniverseEngine');
				const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
				const lowPower =
					window.matchMedia('(pointer: coarse)').matches ||
					window.innerWidth < 820 ||
					(navigator.hardwareConcurrency ?? 8) <= 4 ||
					new URLSearchParams(location.search).get('debug')?.includes('low') === true;
				const instance = new UniverseEngine(
					canvas,
					labelLayer,
					{
						onNavigate: navigate,
						onInteract: dismissHint,
						onFps: (v) => (fps = v),
						onTelemetry: (t) => (telemetry = t)
					},
					{ reducedMotion, lowPower }
				);
				backend = await instance.init();
				if (!alive) return instance.dispose();
				engine = instance;
				lastKey = focusKey(focus);
				engine.setFocus(focus);
				status = 'ready';
				if (pillarEl) ro?.observe(pillarEl);
				if (deckEl) ro?.observe(deckEl);
				ro?.observe(document.body);
				updateInset();
				void loadPlanets();
			} catch (err) {
				console.error('[universe] falling back to static mode', err);
				status = 'fallback';
			}
		})();

		return () => {
			alive = false;
			window.removeEventListener('keydown', onKey);
			ro?.disconnect();
			engine?.dispose();
			engine = null;
		};
	});

	const fmt = (n: number, digits = 1) => n.toFixed(digits).padStart(6, '0');
</script>

<div class="cockpit" data-status={status} data-mode={telemetry.mode} style={`--warp:${telemetry.warp.toFixed(3)}`}>
	<canvas bind:this={canvas} class="viewport" aria-label="Interactive universe. Every star is a section, every planet a piece of content."></canvas>
	<div bind:this={labelLayer} class="hud-layer"></div>

	{#if status !== 'fallback'}
		<HeadingTape heading={telemetry.heading} />
	{/if}

	<!-- top hull: ident plate, course readout, back key -->
	<header class="hull hull--top">
		<a href="/" class="plate" aria-label={`${OWNER.name}, back to the overview`}>
			<span class="plate__name">{OWNER.name}</span>
			<span class="plate__role">{OWNER.role}</span>
		</a>
		<nav class="course" aria-label="Course">
			<span class="course__label">Course</span>
			<a href="/" aria-current={focus.level === 'universe' ? 'page' : undefined}>Universe</a>
			{#if focus.level !== 'universe'}
				<Icon name="chevron" />
				<a href={`/${focus.system.slug}`} aria-current={focus.level === 'system' ? 'page' : undefined}>{focus.system.name}</a>
			{/if}
			{#if focus.level === 'body'}
				<Icon name="chevron" />
				<span aria-current="page">{focus.body.name}</span>
			{/if}
		</nav>
		{#if parentPath}
			<a class="key key--signal key--back" href={parentPath} aria-label="Zoom out one level">
				<Icon name="back" />
				<span class="key__legend">Back</span>
				<span class="key__shortcut">Esc</span>
			</a>
		{:else}
			<span class="key key--back key--idle" aria-hidden="true"><Icon name="back" /><span class="key__legend">Back</span><span class="key__shortcut">Esc</span></span>
		{/if}
	</header>

	<!-- right pillar: the multi-function display -->
	<aside class="pillar" class:pillar--collapsed={collapsed} bind:this={pillarEl}>
		<ContentPanel {focus} bind:collapsed {planets} onPlanetAdded={loadPlanets} fallback={status === 'fallback'} />
	</aside>

	<!-- bottom deck: radar, destination keys, telemetry -->
	<footer class="hull deck" bind:this={deckEl}>
		<StarMap {focus} heading={telemetry.heading} />

		<nav class="keys" aria-label="Destinations">
			{#each SYSTEMS as system, i}
				<a
					href={`/${system.slug}`}
					class="key"
					class:is-active={currentSystem === system.slug}
					aria-current={currentSystem === system.slug ? 'location' : undefined}
					style={`--led:${system.star.corona}`}
				>
					<span class="key__led" aria-hidden="true"></span>
					<span class="key__legend">{system.name}</span>
					<span class="key__shortcut" aria-hidden="true">{i + 1}</span>
				</a>
			{/each}
		</nav>

		<div class="readout crt" aria-hidden="true">
			<div class="crt__glass">
				<p><span>HDG</span><b>{fmt(telemetry.heading)}°</b></p>
				<p><span>RNG</span><b>{fmt(telemetry.range)}</b></p>
				<p><span>VEL</span><b>{fmt(telemetry.velocity / 1000, 3)}c</b></p>
				<p><span>MODE</span><b class:blink={telemetry.mode === 'warp'}>{telemetry.mode.toUpperCase()}</b></p>
				<p class="readout__gpu"><span>{backend === 'webgpu' ? 'WEBGPU' : 'WEBGL2'}</span><b>{fps ? `${fps} FPS` : '-- FPS'}</b></p>
			</div>
		</div>
	</footer>

	{#if hintVisible && status === 'ready'}
		<p class="hud-hint" transition:fade={{ duration: 400 }}>
			{#if isMobile}
				Drag to look around. Pinch to zoom. Tap a star to set course.
			{:else}
				Drag to look around. Scroll to zoom. Click a star to set course.
			{/if}
		</p>
	{/if}

	{#if status === 'loading'}
		<div class="boot" out:fade={{ duration: 700 }}>
			<p>Systems check</p>
			<p>Navigation computer <span>online</span></p>
			<p>Igniting stars<span class="boot__cursor"></span></p>
		</div>
	{/if}

	<!-- full content index for crawlers, screen readers and the no-WebGL fallback -->
	<nav class="index" class:index--visible={status === 'fallback'} aria-label="All content">
		<ul>
			{#each SYSTEMS as system}
				<li>
					<a href={`/${system.slug}`}>{system.name}</a>: {system.headline}
					<ul>
						{#each system.bodies as body}
							<li><a href={`/${system.slug}/${body.slug}`}>{body.name}</a>: {body.title}</li>
						{/each}
					</ul>
				</li>
			{/each}
		</ul>
	</nav>
</div>
