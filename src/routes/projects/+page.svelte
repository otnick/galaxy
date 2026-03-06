<script lang="ts">
	import { onMount } from 'svelte';
	import SceneBackdrop from '$lib/components/SceneBackdrop.svelte';
	import VenganceCard from '$lib/components/vengance/VenganceCard.svelte';

	let heroVisible = true;
	let gridVisible = false;
	let uiOpacity = 1;
	let storyZoom = 0;
	let backdropScale = 1;

	onMount(() => {
		const updateScroll = () => {
			const total = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
			const progress = Math.min(1, Math.max(0, window.scrollY / total));
			const zoomProgress = Math.min(1, Math.max(0, progress / 0.58));
			heroVisible = progress < 0.56;
			gridVisible = progress > 0.16 && progress < 0.84;
			uiOpacity = Math.max(0, 1 - Math.max(0, (progress - 0.72) / 0.18) * 1.25);
			backdropScale = 1 + zoomProgress * 0.34;
			storyZoom = Math.min(1, Math.max(0, (progress - 0.56) / 0.28));
		};

		updateScroll();
		window.addEventListener('scroll', updateScroll, { passive: true });

		return () => window.removeEventListener('scroll', updateScroll);
	});
</script>

<SceneBackdrop theme="projects" {storyZoom} {backdropScale} />

<section class="pointer-events-none relative min-h-[320vh]">
	<div
		class="pointer-events-none relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-[14vh] transition-opacity duration-300 md:px-5 md:pt-[18vh]"
		style={`opacity:${uiOpacity};`}
	>
		<div
			class={`max-w-3xl transition-all duration-700 ${
				heroVisible ? 'translate-x-0 opacity-100' : '-translate-x-24 opacity-0'
			}`}
		>
			<VenganceCard className="pointer-events-auto rounded-[2rem]">
				<p class="eyebrow">Projects / Selected</p>
				<h1 class="mt-5 max-w-2xl text-4xl font-semibold leading-[0.98] tracking-[-0.04em] md:text-6xl">
					Products with structure, visuals with pressure, systems that survive shipping.
				</h1>
				<p class="text-soft mt-5 max-w-2xl text-sm leading-7 md:text-base">
					Not just showcases. These are builds where design language, interaction behavior, and technical decisions had to reinforce each other under real constraints.
				</p>
			</VenganceCard>
		</div>

		<div class="h-[56vh] md:h-[72vh]"></div>

		<div
			class={`grid gap-4 md:grid-cols-2 transition-all duration-700 ${
				gridVisible ? 'translate-x-0 opacity-100' : 'translate-x-24 opacity-0'
			}`}
		>
			<VenganceCard className="pointer-events-auto rounded-[1.8rem]">
				<p class="text-dim text-[0.68rem] uppercase tracking-[0.18em]">Project 01</p>
				<h2 class="mt-3 text-2xl font-semibold">Nebula Commerce</h2>
				<p class="text-soft mt-3 leading-7">
					Headless storefront with high-tempo storytelling pages, multi-market rollout, and a tokenized design layer that kept complexity manageable.
				</p>
			</VenganceCard>
			<VenganceCard className="pointer-events-auto rounded-[1.8rem]">
				<p class="text-dim text-[0.68rem] uppercase tracking-[0.18em]">Project 02</p>
				<h2 class="mt-3 text-2xl font-semibold">Aurora Ops Dashboard</h2>
				<p class="text-soft mt-3 leading-7">
					Operational interface for real-time monitoring, dense information handling, and keyboard-first control without visual fatigue.
				</p>
			</VenganceCard>
			<VenganceCard className="pointer-events-auto rounded-[1.8rem]">
				<p class="text-dim text-[0.68rem] uppercase tracking-[0.18em]">Project 03</p>
				<h2 class="mt-3 text-2xl font-semibold">Kinetic Portfolio Engine</h2>
				<p class="text-soft mt-3 leading-7">
					Experimental portfolio framework focused on deterministic motion primitives and a strict interaction-performance budget.
				</p>
			</VenganceCard>
			<VenganceCard className="pointer-events-auto rounded-[1.8rem] glow-cyan">
				<p class="text-dim text-[0.68rem] uppercase tracking-[0.18em]">Project 04</p>
				<h2 class="mt-3 text-2xl font-semibold">Galaxy System</h2>
				<p class="text-soft mt-3 leading-7">
					SvelteKit, WebGL scene control, persistent planets, and a scroll-led portfolio shell designed to feel spatial instead of flat.
				</p>
			</VenganceCard>
		</div>

		<div class="h-[120vh] md:h-[150vh]"></div>
	</div>
</section>
