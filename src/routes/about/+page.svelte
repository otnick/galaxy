<script lang="ts">
	import GlassPanel from '$lib/components/GlassPanel.svelte';
</script>

<section class="mx-auto max-w-5xl px-5 pb-12 pt-28">
	<GlassPanel className="glow-cyan">
		<p class="text-soft text-xs uppercase tracking-[0.2em]">About</p>
		<h1 class="mt-3 text-4xl font-semibold">Building experiential interfaces.</h1>
		<p class="text-soft mt-5 max-w-3xl leading-8">
			I work at the edge of design and engineering, creating visual systems that feel elegant under pressure.
			My focus is high-performance frontend architecture, custom animation pipelines, and minimal, intentional UI.
		</p>
		<div class="mt-7 grid gap-4 md:grid-cols-3">
			<div class="rounded-2xl border border-white/15 bg-black/20 p-4">
				<p class="text-2xl font-semibold">8+</p>
				<p class="text-soft mt-1 text-sm">Years building web products</p>
			</div>
			<div class="rounded-2xl border border-white/15 bg-black/20 p-4">
				<p class="text-2xl font-semibold">50+</p>
				<p class="text-soft mt-1 text-sm">Shipped interactive experiences</p>
			</div>
			<div class="rounded-2xl border border-white/15 bg-black/20 p-4">
				<p class="text-2xl font-semibold">300fps*</p>
				<p class="text-soft mt-1 text-sm">Canvas optimization obsession</p>
			</div>
		</div>
	</GlassPanel>
</section>
