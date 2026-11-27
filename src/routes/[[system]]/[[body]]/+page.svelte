<script lang="ts">
	import Universe from '$lib/components/Universe.svelte';
	import { resolveFocus, OWNER, UNIVERSE_INTRO } from '$lib/universe/content';

	let { data } = $props();
	const focus = $derived(resolveFocus(data.system, data.body) ?? { level: 'universe' as const });
	const title = $derived(
		focus.level === 'universe'
			? `${OWNER.name} · Portfolio`
			: focus.level === 'system'
				? `${focus.system.name} · ${OWNER.name}`
				: `${focus.body.name} · ${focus.system.name} · ${OWNER.name}`
	);
	const description = $derived(
		focus.level === 'universe' ? UNIVERSE_INTRO.intro : focus.level === 'system' ? focus.system.intro : focus.body.paragraphs[0]
	);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
</svelte:head>

<Universe {focus} />
