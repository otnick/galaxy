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
	className={`relative overflow-hidden border border-white/13 bg-[linear-gradient(135deg,rgba(255,255,255,0.1)_0%,rgba(255,255,255,0.04)_50%,rgba(255,255,255,0.01)_100%),linear-gradient(155deg,rgba(7,15,28,0.72),rgba(4,10,20,0.56))] shadow-[0_24px_64px_rgba(2,8,20,0.32)] ${className}`}
>
	<div class="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-linear-to-r from-transparent via-white/32 to-transparent"></div>
	<div class="pointer-events-none absolute inset-x-4 top-0 h-px bg-linear-to-r from-transparent via-white/14 to-transparent blur-sm"></div>
	<div class="pointer-events-none absolute inset-2.5 rounded-[1.15rem] border border-white/6"></div>
	<!-- Noise grain for material quality -->
	<div class="noise-grain pointer-events-none absolute inset-0 rounded-[inherit] opacity-[0.028]"></div>
	{@render children?.()}
</GlassPanel>
