<script lang="ts">
	import { onMount } from 'svelte';
	import SceneBackdrop from '$lib/components/SceneBackdrop.svelte';
	import VenganceCard from '$lib/components/vengance/VenganceCard.svelte';

	let heroVisible = true;
	let detailsVisible = false;
	let uiOpacity = 1;
	let storyZoom = 0;
	let backdropScale = 1;

	onMount(() => {
		const updateScroll = () => {
			const total = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
			const progress = Math.min(1, Math.max(0, window.scrollY / total));
			const zoomProgress = Math.min(1, Math.max(0, progress / 0.58));
			heroVisible = progress < 0.58;
			detailsVisible = progress > 0.18 && progress < 0.82;
			uiOpacity = Math.max(0, 1 - Math.max(0, (progress - 0.68) / 0.2) * 1.2);
			backdropScale = 1 + zoomProgress * 0.34;
			storyZoom = Math.min(1, Math.max(0, (progress - 0.54) / 0.3));
		};

		updateScroll();
		window.addEventListener('scroll', updateScroll, { passive: true });

		return () => window.removeEventListener('scroll', updateScroll);
	});
</script>

<SceneBackdrop theme="about" {storyZoom} {backdropScale} />

<section class="pointer-events-none relative min-h-[300vh]">
	<div
		class="pointer-events-none relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-[14vh] transition-opacity duration-300 md:px-5 md:pt-[18vh]"
		style={`opacity:${uiOpacity};`}
	>
		<div
			class={`max-w-3xl transition-all duration-700 ${
				heroVisible ? 'translate-x-0 opacity-100' : '-translate-x-24 opacity-0'
			}`}
		>
			<VenganceCard className="pointer-events-auto rounded-[2rem] glow-cyan">
				<p class="eyebrow">About / Core</p>
				<h1 class="mt-5 max-w-2xl text-4xl font-semibold leading-[0.98] tracking-[-0.04em] md:text-6xl">
					I build immersive products that still behave like disciplined software.
				</h1>
				<p class="text-soft mt-5 max-w-2xl text-sm leading-7 md:text-base">
					My work sits between system design, custom rendering, and product clarity. The goal is always the same: stronger atmosphere without losing usability.
				</p>
				<div class="mt-8 grid gap-3 sm:grid-cols-3">
					<div class="data-chip">
						<div>
							<p class="text-dim text-[0.65rem] uppercase tracking-[0.18em]">Years</p>
							<p class="mt-1 text-sm">8+ in product teams</p>
						</div>
						<p class="text-dim text-xs">01</p>
					</div>
					<div class="data-chip">
						<div>
							<p class="text-dim text-[0.65rem] uppercase tracking-[0.18em]">Focus</p>
							<p class="mt-1 text-sm">Motion and frontend systems</p>
						</div>
						<p class="text-dim text-xs">02</p>
					</div>
					<div class="data-chip">
						<div>
							<p class="text-dim text-[0.65rem] uppercase tracking-[0.18em]">Bias</p>
							<p class="mt-1 text-sm">Less UI, more atmosphere</p>
						</div>
						<p class="text-dim text-xs">03</p>
					</div>
				</div>
			</VenganceCard>
		</div>

		<div class="h-[60vh] md:h-[78vh]"></div>

		<div class="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
			<div
				class={`transition-all duration-700 ${
					detailsVisible ? 'translate-x-0 opacity-100' : '-translate-x-24 opacity-0'
				}`}
			>
				<VenganceCard className="pointer-events-auto h-full rounded-[2rem]">
					<p class="text-dim text-[0.68rem] uppercase tracking-[0.18em]">Method</p>
					<p class="text-soft mt-4 leading-7">
						I prefer scenes that feel spatial, interfaces with clear hierarchy, and engineering choices that make interaction stable instead of fragile.
					</p>
				</VenganceCard>
			</div>
			<div
				class={`grid gap-4 transition-all duration-700 md:grid-cols-3 ${
					detailsVisible ? 'translate-x-0 opacity-100' : 'translate-x-24 opacity-0'
				}`}
			>
				<VenganceCard className="pointer-events-auto rounded-[1.7rem]">
					<p class="text-2xl font-semibold">50+</p>
					<p class="text-soft mt-2 text-sm">Interactive launches and product systems shipped.</p>
				</VenganceCard>
				<VenganceCard className="pointer-events-auto rounded-[1.7rem]">
					<p class="text-2xl font-semibold">300+</p>
					<p class="text-soft mt-2 text-sm">Entities handled in motion-heavy canvases without dropping the feel.</p>
				</VenganceCard>
				<VenganceCard className="pointer-events-auto rounded-[1.7rem]">
					<p class="text-2xl font-semibold">End-to-end</p>
					<p class="text-soft mt-2 text-sm">Concept, system, implementation, motion tuning, and final polish.</p>
				</VenganceCard>
			</div>
		</div>

		<div class="h-[120vh] md:h-[150vh]"></div>
	</div>
</section>
