<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import FloatingNav from '$lib/components/FloatingNav.svelte';
	import LoadingScreen from '$lib/components/LoadingScreen.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>Nick Schumacher · Portfolio</title>
	<meta name="description" content="Nick Schumacher — creative frontend engineer. 2.5+ years with Vue.js, Three.js and digital twins. MSc Immersive Technology, Stockholm. Bremen · Stockholm." />
	<meta property="og:title" content="Nick Schumacher · Portfolio" />
	<meta property="og:description" content="Immersive interfaces built between engineering and atmosphere. WebGL · SvelteKit · Vue.js · Three.js." />
	<meta property="og:type" content="website" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Nick Schumacher · Portfolio" />
	<meta name="twitter:description" content="Creative frontend · WebGL · Immersive Tech · Bremen/Stockholm" />
</svelte:head>

<LoadingScreen />
<div class="gradient-backdrop"></div>
<FloatingNav />
<main>{@render children()}</main>
