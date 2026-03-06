<script lang="ts">
	import GlassPanel from '$lib/components/GlassPanel.svelte';
</script>

<section class="mx-auto max-w-6xl px-5 pb-12 pt-28">
	<div class="grid gap-4 md:grid-cols-2">
		<GlassPanel className="h-full">
			<p class="text-soft text-xs uppercase tracking-[0.2em]">Project 01</p>
			<h2 class="mt-2 text-2xl font-semibold">Nebula Commerce</h2>
			<p class="text-soft mt-3 leading-7">
				Headless storefront with dynamic storytelling pages, shipping to 40+ locales with a shared design token system.
			</p>
		</GlassPanel>

		<GlassPanel className="h-full">
			<p class="text-soft text-xs uppercase tracking-[0.2em]">Project 02</p>
			<h2 class="mt-2 text-2xl font-semibold">Aurora Ops Dashboard</h2>
			<p class="text-soft mt-3 leading-7">
				Real-time operations cockpit with stream visualizations, keyboard-first workflows, and resilient offline queuing.
			</p>
		</GlassPanel>

		<GlassPanel className="h-full">
			<p class="text-soft text-xs uppercase tracking-[0.2em]">Project 03</p>
			<h2 class="mt-2 text-2xl font-semibold">Kinetic Portfolio Engine</h2>
			<p class="text-soft mt-3 leading-7">
				Plugin architecture for personal sites with deterministic animation primitives and a strict performance budget.
			</p>
		</GlassPanel>

		<GlassPanel className="h-full glow-cyan">
			<p class="text-soft text-xs uppercase tracking-[0.2em]">Project 04</p>
			<h2 class="mt-2 text-2xl font-semibold">Galaxy System</h2>
			<p class="text-soft mt-3 leading-7">
				This SvelteKit build combines canvas animation, glassmorphism components, and Prisma persistence for planet state.
			</p>
		</GlassPanel>
	</div>
</section>
