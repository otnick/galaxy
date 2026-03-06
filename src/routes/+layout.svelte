<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import FloatingNav from '$lib/components/FloatingNav.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>Galaxy Portfolio</title>
</svelte:head>

<div class="gradient-backdrop"></div>
<FloatingNav />
<main>{@render children()}</main>
