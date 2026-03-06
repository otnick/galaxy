<script lang="ts">
	import GlassPanel from '$lib/components/GlassPanel.svelte';

	let {
		className = '',
		children
	} = $props<{
		className?: string;
		children?: () => unknown;
	}>();
</script>

<GlassPanel
	className={`relative overflow-hidden border border-white/20 bg-gradient-to-br from-white/12 to-[#0a1630]/65 shadow-[0_24px_70px_rgba(7,14,30,0.45)] ${className}`}
>
	<div class="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-cyan-300/20 blur-2xl"></div>
	{@render children?.()}
</GlassPanel>
