<script lang="ts">
	import { onMount } from 'svelte';
	import { ThreeGalaxyEngine } from '$lib/canvas/three-galaxy';
	import type { PlanetRecord, SceneTheme } from '$lib/types';

	let {
		planets = [],
		storyZoom = 0,
		theme = 'orbit',
		journeyProgress = 0
	} = $props<{ planets?: PlanetRecord[]; storyZoom?: number; theme?: SceneTheme; journeyProgress?: number }>();
	let container: HTMLDivElement;
	let engine: ThreeGalaxyEngine | undefined;

	onMount(() => {
		engine = new ThreeGalaxyEngine(container, theme);
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

	$effect(() => {
		engine?.setTheme(theme);
	});

	$effect(() => {
		engine?.setJourneyProgress(journeyProgress);
	});
</script>

<div
	bind:this={container}
	class="absolute inset-0 h-full w-full touch-none"
	role="application"
	aria-label="Interactive 3D galaxy canvas"
></div>
