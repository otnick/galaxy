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
			heroVisible = progress < 0.56;
			detailsVisible = progress > 0.18 && progress < 0.84;
			uiOpacity = Math.max(0, 1 - Math.max(0, (progress - 0.72) / 0.18) * 1.25);
			backdropScale = 1 + zoomProgress * 0.34;
			storyZoom = Math.min(1, Math.max(0, (progress - 0.54) / 0.32));
		};

		updateScroll();
		window.addEventListener('scroll', updateScroll, { passive: true });

		return () => window.removeEventListener('scroll', updateScroll);
	});
</script>

<SceneBackdrop theme="impressum" {storyZoom} {backdropScale} />

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
			<VenganceCard className="pointer-events-auto rounded-[2rem]">
				<p class="eyebrow">Impressum / Legal Core</p>
				<h1 class="mt-5 max-w-2xl text-4xl font-semibold leading-[0.98] tracking-[-0.04em] md:text-6xl">
					Legal information, pulled into the gravity well.
				</h1>
				<p class="text-soft mt-5 max-w-2xl text-sm leading-7 md:text-base">
					Even the mandatory parts can live inside the same spatial language. The content stays sober; the presentation does not need to be lifeless.
				</p>
			</VenganceCard>
		</div>

		<div class="h-[56vh] md:h-[72vh]"></div>

		<div class="grid gap-4 lg:grid-cols-[1fr_1fr]">
			<div
				class={`transition-all duration-700 ${
					detailsVisible ? 'translate-x-0 opacity-100' : '-translate-x-24 opacity-0'
				}`}
			>
				<VenganceCard className="pointer-events-auto h-full rounded-[1.8rem]">
					<p class="text-dim text-[0.68rem] uppercase tracking-[0.18em]">Responsible for content</p>
					<p class="mt-4 leading-7 text-white/88">
						Max Mustermann<br />
						Musterstrasse 1<br />
						10115 Berlin<br />
						Germany
					</p>
				</VenganceCard>
			</div>
			<div
				class={`grid gap-4 transition-all duration-700 ${
					detailsVisible ? 'translate-x-0 opacity-100' : 'translate-x-24 opacity-0'
				}`}
			>
				<VenganceCard className="pointer-events-auto rounded-[1.8rem]">
					<p class="text-dim text-[0.68rem] uppercase tracking-[0.18em]">Contact</p>
					<p class="mt-4 leading-7 text-white/88">
						Email: hello@example.com<br />
						Phone: +49 30 00000000
					</p>
				</VenganceCard>
				<VenganceCard className="pointer-events-auto rounded-[1.8rem]">
					<p class="text-dim text-[0.68rem] uppercase tracking-[0.18em]">Disclaimer</p>
					<p class="text-soft mt-4 leading-7">
						This is placeholder legal copy. Replace all identity and contact data with the actual information required before publishing the site.
					</p>
				</VenganceCard>
			</div>
		</div>

		<div class="h-[120vh] md:h-[150vh]"></div>
	</div>
</section>
