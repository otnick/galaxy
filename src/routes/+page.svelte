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
	let heroPanel: HTMLElement;
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
			<SolarCanvas {planets} storyZoom={storyZoom} />
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
			bind:this={heroPanel}
			class={`max-w-2xl will-change-transform transition-all duration-700 ${
				heroVisible ? 'translate-x-0 opacity-100' : '-translate-x-24 opacity-0'
			}`}
		>
			<VenganceCard className="pointer-events-auto glow-gold">
				<p class="text-soft text-xs uppercase tracking-[0.22em]">Creative Developer Portfolio</p>
				<h1 class="mt-3 text-4xl font-semibold leading-tight md:text-6xl">
					3D Interactive Galaxy,<br /> Built for Motion and Depth.
				</h1>
				<p class="text-soft mt-4 max-w-xl text-sm leading-7 md:text-base">
					Scroll to dive deeper into the galaxy. Then grab the scene and fly through it with full 3D controls.
				</p>
				<p class="text-soft mt-2 text-xs">
					Controls: drag rotate, right-drag pan, normal wheel scrolls page, Ctrl/Cmd/Alt + wheel zooms galaxy, WASDQE fly, Shift boost.
				</p>
				<div class="mt-6 flex flex-wrap gap-3">
					<VenganceButton onclick={addPlanet} disabled={creating}>
						{creating ? 'Adding...' : 'Add Planet'}
					</VenganceButton>
					<p class="text-soft self-center text-sm">
						{loading ? 'Loading planets...' : `${planets.length} persisted planets`}
					</p>
				</div>
			</VenganceCard>
		</div>

		<div class="h-[58vh] md:h-[85vh]"></div>

		<div class="grid gap-4 md:grid-cols-[1.1fr_1fr]">
			<div
				class={`will-change-transform transition-all duration-700 ${
					cardsVisible ? 'translate-x-0 opacity-100' : '-translate-x-24 opacity-0'
				}`}
			>
				<VenganceCard className="pointer-events-auto h-full glow-cyan">
					<p class="text-soft text-xs uppercase tracking-[0.22em]">Featured</p>
					<h2 class="mt-2 text-3xl font-semibold leading-tight">Designing products that feel cinematic.</h2>
					<p class="text-soft mt-4 leading-7">
						I build premium web experiences with high-performance rendering, tactile transitions, and strong product thinking.
					</p>
				</VenganceCard>
			</div>
			<div
				class={`pointer-events-auto grid gap-4 will-change-transform transition-all duration-700 ${
					cardsVisible ? 'translate-x-0 opacity-100' : 'translate-x-24 opacity-0'
				}`}
			>
				<PortfolioCard
					title="About Me"
					description="Design-minded engineer focused on immersive interactions and performant frontend systems."
					href="/about"
				/>
				<PortfolioCard
					title="Projects"
					description="Selected work spanning generative visuals, product design systems, and full-stack apps."
					href="/projects"
				/>
				<PortfolioCard
					title="Contact"
					description="Open to freelance, product collaborations, and technical art projects."
					href="/contact"
				/>
			</div>
		</div>

		<div class="h-[120vh] md:h-[170vh]"></div>
	</div>
</section>
