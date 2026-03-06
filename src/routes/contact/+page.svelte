<script lang="ts">
	import { onMount } from 'svelte';
	import SceneBackdrop from '$lib/components/SceneBackdrop.svelte';
	import VenganceButton from '$lib/components/vengance/VenganceButton.svelte';
	import VenganceCard from '$lib/components/vengance/VenganceCard.svelte';

	let heroVisible = true;
	let formVisible = false;
	let uiOpacity = 1;
	let storyZoom = 0;
	let backdropScale = 1;

	onMount(() => {
		const updateScroll = () => {
			const total = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
			const progress = Math.min(1, Math.max(0, window.scrollY / total));
			const zoomProgress = Math.min(1, Math.max(0, progress / 0.58));
			heroVisible = progress < 0.58;
			formVisible = progress > 0.18 && progress < 0.84;
			uiOpacity = Math.max(0, 1 - Math.max(0, (progress - 0.72) / 0.18) * 1.25);
			backdropScale = 1 + zoomProgress * 0.34;
			storyZoom = Math.min(1, Math.max(0, (progress - 0.55) / 0.28));
		};

		updateScroll();
		window.addEventListener('scroll', updateScroll, { passive: true });

		return () => window.removeEventListener('scroll', updateScroll);
	});
</script>

<SceneBackdrop theme="contact" {storyZoom} {backdropScale} />

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
				<p class="eyebrow">Contact / Signal</p>
				<h1 class="mt-5 max-w-2xl text-4xl font-semibold leading-[0.98] tracking-[-0.04em] md:text-6xl">
					Bring the brief, the timeline, and the ambition.
				</h1>
				<p class="text-soft mt-5 max-w-2xl text-sm leading-7 md:text-base">
					I’m most useful where product, motion, and engineering have to meet in one coherent system. Short pitch, real constraints, sharp objective.
				</p>
			</VenganceCard>
		</div>

		<div class="h-[56vh] md:h-[72vh]"></div>

		<div class="grid gap-4 lg:grid-cols-[0.86fr_1.14fr]">
			<div
				class={`transition-all duration-700 ${
					formVisible ? 'translate-x-0 opacity-100' : '-translate-x-24 opacity-0'
				}`}
			>
				<VenganceCard className="pointer-events-auto h-full rounded-[1.8rem]">
					<p class="text-dim text-[0.68rem] uppercase tracking-[0.18em]">Preferred input</p>
					<p class="text-soft mt-4 leading-7">
						Project scope, timing, budget range, references, and what must feel different when the work is done.
					</p>
				</VenganceCard>
			</div>
			<div
				class={`transition-all duration-700 ${
					formVisible ? 'translate-x-0 opacity-100' : 'translate-x-24 opacity-0'
				}`}
			>
				<VenganceCard className="pointer-events-auto rounded-[2rem]">
					<form class="grid gap-4">
						<label class="grid gap-2">
							<span class="text-sm text-white/88">Name</span>
							<input
								class="rounded-xl border border-white/14 bg-black/22 px-4 py-3 outline-none transition focus:border-white/34"
								type="text"
								placeholder="Your name"
							/>
						</label>
						<label class="grid gap-2">
							<span class="text-sm text-white/88">Email</span>
							<input
								class="rounded-xl border border-white/14 bg-black/22 px-4 py-3 outline-none transition focus:border-white/34"
								type="email"
								placeholder="you@example.com"
							/>
						</label>
						<label class="grid gap-2">
							<span class="text-sm text-white/88">Message</span>
							<textarea
								class="min-h-36 rounded-xl border border-white/14 bg-black/22 px-4 py-3 outline-none transition focus:border-white/34"
								placeholder="Scope, timing, goals..."
							></textarea>
						</label>
						<VenganceButton className="w-fit">Send signal</VenganceButton>
					</form>
				</VenganceCard>
			</div>
		</div>

		<div class="h-[120vh] md:h-[150vh]"></div>
	</div>
</section>
