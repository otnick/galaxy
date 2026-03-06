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
	className={`relative overflow-hidden border border-white/14 bg-gradient-to-br from-white/10 to-[#081222]/72 shadow-[0_32px_80px_rgba(4,10,24,0.42)] ${className}`}
>
	<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
	<div class="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-cyan-300/14 blur-3xl"></div>
	{@render children?.()}
</GlassPanel>
