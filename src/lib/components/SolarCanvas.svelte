<script lang="ts">
	import { onMount } from 'svelte';
	import { ThreeGalaxyEngine } from '$lib/canvas/three-galaxy';
	import type { PlanetRecord } from '$lib/types';

	let { planets = [], storyZoom = 0 } = $props<{ planets?: PlanetRecord[]; storyZoom?: number }>();
	let container: HTMLDivElement;
	let engine: ThreeGalaxyEngine | undefined;

	onMount(() => {
		engine = new ThreeGalaxyEngine(container);
		engine.setPlanets(planets);
		engine.start();

		return () => engine?.stop();
	});

	$effect(() => {
		engine?.setPlanets(planets);
	});

	$effect(() => {
		engine?.setStoryZoom(storyZoom);
	});
</script>

<div
	bind:this={container}
	class="absolute inset-0 h-full w-full"
	role="application"
	aria-label="Interactive 3D galaxy canvas"
></div>
