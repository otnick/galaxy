<script lang="ts">
	import GlassPanel from '$lib/components/GlassPanel.svelte';

	let { title, description, href } = $props<{
		title: string;
		description: string;
		href: string;
	}>();
</script>

<a href={href} class="block transition-transform duration-300 hover:-translate-y-1">
	<GlassPanel className="glow-cyan h-full">
		<h3 class="text-lg font-semibold tracking-tight">{title}</h3>
		<p class="text-soft mt-2 text-sm leading-6">{description}</p>
	</GlassPanel>
</a>
