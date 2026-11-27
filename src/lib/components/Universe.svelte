<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { fade } from 'svelte/transition';
	import { SYSTEMS, OWNER, focusKey, focusPath, type Focus } from '$lib/universe/content';
	import type { PlanetRecord } from '$lib/types';
	import type { UniverseEngine } from '$lib/universe/engine/UniverseEngine';
	import ContentPanel from './ContentPanel.svelte';
	import StarMap from './StarMap.svelte';

	let { focus }: { focus: Focus } = $props();

	let canvas: HTMLCanvasElement;
	let labelLayer: HTMLDivElement;
	let panelEl = $state<HTMLElement>();
	let engine: UniverseEngine | null = null;
	let ro: ResizeObserver | null = null;

	let status = $state<'loading' | 'ready' | 'fallback'>('loading');
	let backend = $state('');
	let fps = $state(0);
	let hintVisible = $state(true);
	let collapsed = $state(false);
	let isMobile = $state(false);
	let planets = $state<PlanetRecord[]>([]);

	const parentPath = $derived(
		focus.level === 'body' ? `/${focus.system.slug}` : focus.level === 'system' ? '/' : null
	);
	const accent = $derived(focus.level === 'universe' ? '#ffb45e' : focus.system.star.corona);

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

	// reserve screen space for the panel so the focused object is framed beside it
	const updateInset = () => {
		if (!engine) return;
		isMobile = window.innerWidth < 820;
		if (!panelEl) return engine.setInset(0, 0);
		const r = panelEl.getBoundingClientRect();
		if (isMobile) engine.setInset(0, collapsed ? 60 : Math.min(r.height, window.innerHeight * 0.62));
		// the hero panel sits on the left, detail panels on the right
		else engine.setInset(focus.level === 'universe' ? -(r.width + 32) : r.width + 32, 0);
	};

	$effect(() => {
		void focus;
		void collapsed;
		if (ro && panelEl) ro.observe(panelEl);
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
					(navigator.hardwareConcurrency ?? 8) <= 4;
				const instance = new UniverseEngine(
					canvas,
					labelLayer,
					{
						onNavigate: navigate,
						onInteract: dismissHint,
						onFps: (v) => (fps = v)
					},
					{ reducedMotion, lowPower }
				);
				backend = await instance.init();
				if (!alive) return instance.dispose();
				engine = instance;
				lastKey = focusKey(focus);
				engine.setFocus(focus);
				status = 'ready';
				if (panelEl) ro?.observe(panelEl);
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
</script>

<div class="universe" style={`--accent:${accent}`} data-status={status}>
	<canvas bind:this={canvas} class="universe__canvas" aria-label="Interactive universe — every star is a section, every planet a piece of content"></canvas>
	<div bind:this={labelLayer} class="universe__labels"></div>

	<header class="hud-top">
		<nav class="crumbs" aria-label="You are here">
			<a href="/" class="crumbs__brand" aria-current={focus.level === 'universe' ? 'page' : undefined}>
				<span class="crumbs__mark" aria-hidden="true"></span>
				{OWNER.name}
			</a>
			{#if focus.level !== 'universe'}
				<span class="crumbs__sep" aria-hidden="true">/</span>
				<a href={`/${focus.system.slug}`} aria-current={focus.level === 'system' ? 'page' : undefined}>{focus.system.name}</a>
			{/if}
			{#if focus.level === 'body'}
				<span class="crumbs__sep" aria-hidden="true">/</span>
				<span aria-current="page">{focus.body.name}</span>
			{/if}
		</nav>
		{#if parentPath}
			<a class="hud-back" href={parentPath} aria-label="Zoom out">
				<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
				<span>Zoom out</span>
				<kbd>Esc</kbd>
			</a>
		{/if}
	</header>

	{#key focusKey(focus)}
		<div class="panel-slot" class:panel-slot--universe={focus.level === 'universe'}>
			<ContentPanel {focus} bind:element={panelEl} bind:collapsed {planets} onPlanetAdded={loadPlanets} fallback={status === 'fallback'} />
		</div>
	{/key}

	<StarMap {focus} />

	{#if hintVisible && status === 'ready'}
		<div class="hint" transition:fade={{ duration: 400 }}>
			{#if isMobile}
				Drag to look around · Pinch to zoom · Tap a star
			{:else}
				Drag to orbit · Scroll to zoom · Click a star · <kbd>←</kbd><kbd>→</kbd> to travel
			{/if}
		</div>
	{/if}

	{#if status === 'loading'}
		<div class="boot" out:fade={{ duration: 900 }}>
			<div class="boot__ring"></div>
			<p>Igniting stars…</p>
		</div>
	{/if}

	{#if status === 'ready' && fps > 0}
		<p class="meta" aria-hidden="true">{backend === 'webgpu' ? 'WebGPU' : 'WebGL 2'} · {fps} fps</p>
	{/if}

	<!-- full content index for crawlers, screen readers and the no-WebGL fallback -->
	<nav class="index" class:index--visible={status === 'fallback'} aria-label="All content">
		<ul>
			{#each SYSTEMS as system}
				<li>
					<a href={`/${system.slug}`}>{system.name}</a> — {system.headline}
					<ul>
						{#each system.bodies as body}
							<li><a href={`/${system.slug}/${body.slug}`}>{body.name}</a> — {body.title}</li>
						{/each}
					</ul>
				</li>
			{/each}
		</ul>
	</nav>
</div>
