<script lang="ts">
	import SolarCanvas from '$lib/components/SolarCanvas.svelte';
	import type { SceneTheme } from '$lib/types';

	let {
		theme,
		storyZoom = 0,
		backdropScale = 1
	} = $props<{ theme: SceneTheme; storyZoom?: number; backdropScale?: number }>();
</script>

<div class="fixed inset-0 z-0 overflow-hidden">
	<div
		class="absolute inset-0 origin-center transition-transform duration-300 ease-out"
		style={`transform: scale(${backdropScale});`}
	>
		<SolarCanvas {theme} {storyZoom} />
	</div>
	<div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_26%,rgba(2,7,19,0.62)_100%)]"></div>
</div>
