<script lang="ts">
	import PortfolioCard from '$lib/components/PortfolioCard.svelte';
	import SolarCanvas from '$lib/components/SolarCanvas.svelte';
	import VenganceButton from '$lib/components/vengance/VenganceButton.svelte';
	import VenganceCard from '$lib/components/vengance/VenganceCard.svelte';
	import type { PlanetRecord } from '$lib/types';
	import { onMount } from 'svelte';

	let planets: PlanetRecord[] = [];
	let loading = true;
	let creating = false;
	let scrollZoom = 1;
	let storyZoom = 0;
	let uiOpacity = 1;
	let sceneRoot: HTMLElement;
	let heroVisible = true;
	let cardsVisible = false;

	const fetchPlanets = async () => {
		const response = await fetch('/api/planets');
		const data = (await response.json()) as { planets: PlanetRecord[] };
		planets = data.planets;
		loading = false;
	};

	const addPlanet = async () => {
		if (creating) return;
		creating = true;
		try {
			await fetch('/api/planets', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: `Planet ${planets.length + 1}`,
					color: ['#7dd3fc', '#fde68a', '#fda4af', '#86efac', '#c4b5fd', '#f9a8d4'][planets.length % 6],
					size: 2.2 + (planets.length % 6) * 0.7,
					speed: 0.08 + (planets.length % 7) * 0.04
				})
			});
			await fetchPlanets();
		} finally {
			creating = false;
		}
	};

	onMount(() => {
		let alive = true;
		fetchPlanets();

		const applyProgress = (globalProgress: number) => {
			const progress = Math.min(1, Math.max(0, globalProgress / 0.55));
			scrollZoom = 1 + progress * 0.46;
			storyZoom = Math.min(1, Math.max(0, (globalProgress - 0.56) / 0.4));
			uiOpacity = Math.max(0, 1 - storyZoom * 1.35);
			heroVisible = globalProgress < 0.62;
			cardsVisible = globalProgress > 0.16 && globalProgress < 0.78;
		};

		const setup = async () => {
			const { gsap } = await import('gsap');
			const { ScrollTrigger } = await import('gsap/ScrollTrigger');
			if (!alive) return;
			gsap.registerPlugin(ScrollTrigger);

			const context = gsap.context(() => {
				ScrollTrigger.create({
					trigger: sceneRoot,
					start: 'top top',
					end: 'bottom bottom',
					scrub: true,
					onUpdate: (self) => {
						applyProgress(self.progress);
					},
					onRefresh: (self) => {
						applyProgress(self.progress);
					}
				});
			}, sceneRoot);

			return () => context.revert();
		};

		let teardown: (() => void) | undefined;
		void setup().then((cleanup) => {
			teardown = cleanup;
		});

		const fallbackUpdate = () => {
			const total = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
			const progress = Math.min(1, Math.max(0, window.scrollY / total));
			applyProgress(progress);
		};
		fallbackUpdate();
		window.addEventListener('scroll', fallbackUpdate, { passive: true });

		return () => {
			alive = false;
			teardown?.();
			window.removeEventListener('scroll', fallbackUpdate);
		};
	});
</script>

<section bind:this={sceneRoot} class="relative min-h-[420vh]">
	<div class="sticky top-0 z-0 h-screen overflow-hidden">
		<div
			class="absolute inset-0 origin-center transition-transform duration-300 ease-out"
			style={`transform: scale(${scrollZoom});`}
		>
			<SolarCanvas {planets} storyZoom={storyZoom} theme="orbit" />
		</div>
		<div
			class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_32%,rgba(2,7,19,0.46)_100%)]"
		></div>
	</div>

	<div
		class="pointer-events-none relative z-20 mx-auto max-w-6xl px-4 pb-20 pt-[12vh] transition-opacity duration-300 md:px-5 md:pb-24 md:pt-[18vh]"
		style={`opacity: ${uiOpacity};`}
	>
		<div
			class={`max-w-2xl will-change-transform transition-all duration-700 ${
				heroVisible ? 'translate-x-0 opacity-100' : '-translate-x-24 opacity-0'
			}`}
		>
			<VenganceCard className="hero-panel pointer-events-auto max-w-3xl rounded-[2rem] glow-gold p-0">
				<div class="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
					<div class="p-6 md:p-8">
						<span class="eyebrow">Live Portfolio Galaxy</span>
						<h1 class="mt-5 max-w-xl text-4xl font-semibold leading-[0.96] tracking-[-0.05em] md:text-[4.25rem]">
							Spatial frontend, stripped down to what matters.
						</h1>
						<p class="text-soft mt-5 max-w-lg text-sm leading-7 md:text-[1.02rem]">
							Scroll pulls the galaxy inward. Controls stay active. The UI enters with intent, then gets out of the way so the scene can breathe.
						</p>
						<div class="mt-8 flex flex-wrap gap-3">
							<VenganceButton onclick={addPlanet} disabled={creating} className="min-w-36">
								{creating ? 'Adding...' : 'Add Planet'}
							</VenganceButton>
							<a
								href="/projects"
								class="pointer-events-auto inline-flex items-center rounded-full border border-white/12 px-5 py-2.5 text-sm tracking-[0.08em] text-white/88 transition hover:border-white/22 hover:bg-white/8"
							>
								View Projects
							</a>
						</div>
						<div class="mt-8 grid gap-3 sm:grid-cols-3">
							<div class="data-chip">
								<div>
									<p class="text-dim text-[0.65rem] uppercase tracking-[0.18em]">State</p>
									<p class="mt-1 text-sm">{loading ? 'Syncing' : `${planets.length} stored`}</p>
								</div>
								<p class="text-dim text-xs">01</p>
							</div>
							<div class="data-chip">
								<div>
									<p class="text-dim text-[0.65rem] uppercase tracking-[0.18em]">Input</p>
									<p class="mt-1 text-sm">Drag, pan, fly</p>
								</div>
								<p class="text-dim text-xs">02</p>
							</div>
							<div class="data-chip">
								<div>
									<p class="text-dim text-[0.65rem] uppercase tracking-[0.18em]">Rhythm</p>
									<p class="mt-1 text-sm">Scroll then roam</p>
								</div>
								<p class="text-dim text-xs">03</p>
							</div>
						</div>
					</div>

					<div class="border-t border-white/10 p-6 md:p-8 lg:border-l lg:border-t-0">
						<p class="text-dim text-[0.66rem] uppercase tracking-[0.2em]">System Feed</p>
						<div class="mt-5 space-y-3">
							<div class="rounded-2xl border border-white/8 bg-white/4 p-4">
								<p class="text-dim text-[0.62rem] uppercase tracking-[0.18em]">Orbit Mode</p>
								<p class="mt-2 text-sm leading-6 text-white/88">
									Normal scroll drives the story. `Ctrl`/`Cmd`/`Alt` + wheel zooms the galaxy directly.
								</p>
							</div>
							<div class="rounded-2xl border border-white/8 bg-white/4 p-4">
								<p class="text-dim text-[0.62rem] uppercase tracking-[0.18em]">Visual Rule</p>
								<p class="mt-2 text-sm leading-6 text-white/88">
									The interface stays shallow and clean so the WebGL scene keeps the emotional weight.
								</p>
							</div>
							<div class="rounded-2xl border border-dashed border-white/8 bg-white/3 p-4">
								<p class="text-dim text-[0.62rem] uppercase tracking-[0.18em]">Current Focus</p>
								<p class="mt-2 text-sm leading-6 text-white/88">
									Minimal chrome, depth-first interaction, and better spatial pacing across the scroll.
								</p>
							</div>
						</div>
					</div>
				</div>
			</VenganceCard>
		</div>

		<div class="h-[54vh] md:h-[72vh]"></div>

		<div class="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
			<div
				class={`will-change-transform transition-all duration-700 ${
					cardsVisible ? 'translate-x-0 opacity-100' : '-translate-x-24 opacity-0'
				}`}
			>
				<VenganceCard className="pointer-events-auto h-full rounded-[2rem] glow-cyan">
					<p class="text-dim text-[0.72rem] uppercase tracking-[0.2em]">Featured Approach</p>
					<h2 class="mt-3 max-w-md text-3xl font-semibold leading-tight tracking-[-0.03em] md:text-[2.5rem]">
						Interfaces that feel precise, spacious, and cinematic.
					</h2>
					<p class="text-soft mt-5 max-w-xl leading-7">
						The work lives between product clarity and immersive visuals: interaction systems, motion direction, and frontend engineering that holds up under scale.
					</p>
					<div class="mt-8 flex flex-wrap gap-2">
						<span class="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/78">WebGL</span>
						<span class="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/78">Design Systems</span>
						<span class="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/78">Creative Frontend</span>
					</div>
				</VenganceCard>
			</div>
			<div
				class={`pointer-events-auto grid gap-3 will-change-transform transition-all duration-700 md:gap-4 ${
					cardsVisible ? 'translate-x-0 opacity-100' : 'translate-x-24 opacity-0'
				}`}
			>
				<PortfolioCard
					title="About Me"
					description="Design-minded engineering with a bias for motion, structure, and restraint."
					href="/about"
				/>
				<PortfolioCard
					title="Projects"
					description="Selected product systems, visual experiments, and interaction-heavy builds."
					href="/projects"
				/>
				<PortfolioCard
					title="Contact"
					description="For collaborations, freelance work, and ambitious digital experiences."
					href="/contact"
				/>
			</div>
		</div>

		<div class="h-[130vh] md:h-[170vh]"></div>
	</div>
</section>
