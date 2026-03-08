<script lang="ts">
	import GlassPanel from '$lib/components/GlassPanel.svelte';

	let { title, description, href } = $props<{
		title: string;
		description: string;
		href: string;
	}>();
</script>

<a
	href={href}
	class="group block transition-transform duration-300 hover:-translate-y-1"
	onclick={(event) => {
		event.preventDefault();
		window.dispatchEvent(new CustomEvent('galaxy:navigate', { detail: { path: href } }));
	}}
>
	<GlassPanel className="glow-cyan h-full">
		<div class="flex items-start justify-between gap-2">
			<h3 class="text-lg font-semibold tracking-tight">{title}</h3>
			<span class="mt-0.5 shrink-0 text-white/32 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-white/72">→</span>
		</div>
		<p class="text-soft mt-2 text-sm leading-6">{description}</p>
	</GlassPanel>
</a>
