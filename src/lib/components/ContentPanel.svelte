<script lang="ts">
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { OWNER, SYSTEMS, UNIVERSE_INTRO, type Focus } from '$lib/universe/content';
	import type { PlanetRecord } from '$lib/types';

	let {
		focus,
		element = $bindable(),
		collapsed = $bindable(false),
		planets,
		onPlanetAdded,
		fallback
	}: {
		focus: Focus;
		element?: HTMLElement;
		collapsed?: boolean;
		planets: PlanetRecord[];
		onPlanetAdded: () => Promise<void> | void;
		fallback: boolean;
	} = $props();

	let name = $state('');
	let sending = $state(false);
	let launched = $state('');

	const COLORS = ['#7dd3fc', '#fde68a', '#fda4af', '#86efac', '#c4b5fd', '#f9a8d4'];

	const launch = async (e: SubmitEvent) => {
		e.preventDefault();
		const clean = name.trim().slice(0, 24);
		if (!clean || sending) return;
		sending = true;
		try {
			const res = await fetch('/api/planets', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: clean,
					color: COLORS[Math.floor(Math.random() * COLORS.length)],
					size: 2 + Math.random() * 5,
					speed: 0.08 + Math.random() * 0.3
				})
			});
			if (res.ok) {
				launched = clean;
				name = '';
				await onPlanetAdded();
			}
		} finally {
			sending = false;
		}
	};

	const bodyIndex = $derived(focus.level === 'body' ? focus.system.bodies.indexOf(focus.body) : -1);
	const prevBody = $derived(
		focus.level === 'body' && focus.system.bodies.length > 1
			? focus.system.bodies[(bodyIndex - 1 + focus.system.bodies.length) % focus.system.bodies.length]
			: null
	);
	const nextBody = $derived(
		focus.level === 'body' && focus.system.bodies.length > 1
			? focus.system.bodies[(bodyIndex + 1) % focus.system.bodies.length]
			: null
	);
</script>

<article
	bind:this={element}
	class="panel"
	class:panel--hero={focus.level === 'universe'}
	class:panel--collapsed={collapsed}
	class:panel--static={fallback}
	in:fly={{ y: 24, duration: 700, delay: 350, easing: cubicOut }}
	aria-live="polite"
>
	{#if focus.level !== 'universe'}
		<button class="panel__grip" type="button" onclick={() => (collapsed = !collapsed)} aria-expanded={!collapsed} aria-label={collapsed ? 'Show details' : 'Hide details'}>
			<span></span>
		</button>
	{/if}

	{#if focus.level === 'universe'}
		<p class="kicker">{UNIVERSE_INTRO.kicker}</p>
		<h1 class="headline headline--xl">{OWNER.name}</h1>
		<p class="lede">{UNIVERSE_INTRO.headline}</p>
		<p class="copy">{UNIVERSE_INTRO.intro}</p>
		<ul class="systems">
			{#each SYSTEMS as system, i}
				<li>
					<a href={`/${system.slug}`} style={`--c:${system.star.corona}`}>
						<span class="systems__num">0{i + 1}</span>
						<span class="systems__name">{system.name}</span>
						<span class="systems__kicker">{system.kicker}</span>
					</a>
				</li>
			{/each}
		</ul>
	{:else if focus.level === 'system'}
		{@const system = focus.system}
		<p class="kicker">{system.kicker}</p>
		<h1 class="headline">{system.headline}</h1>
		<div class="panel__body">
			<p class="copy">{system.intro}</p>
			{#if system.tags}
				<ul class="tags">{#each system.tags as tag}<li>{tag}</li>{/each}</ul>
			{/if}
			{#if system.links}
				<div class="links">
					{#each system.links as link}
						<a class="button" href={link.href}>{link.label}</a>
					{/each}
				</div>
			{/if}
			<ul class="bodies">
				{#each system.bodies as body}
					<li>
						<a href={`/${system.slug}/${body.slug}`} style={`--c:${body.visual.atmosphere ?? body.visual.palette[1]}`}>
							<span class="bodies__orb"></span>
							<span class="bodies__text"><strong>{body.name}</strong><span>{body.kicker}</span></span>
							<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
						</a>
					</li>
				{/each}
			</ul>
			{#if system.slug === 'orbit'}
				<form class="launch" onsubmit={launch}>
					<label for="planet-name">Leave your own planet in the belt — {planets.length} visitors orbit here already.</label>
					<div class="launch__row">
						<input id="planet-name" bind:value={name} maxlength="24" placeholder="Your name" autocomplete="off" />
						<button class="button button--solid" type="submit" disabled={sending || !name.trim()}>{sending ? 'Launching…' : 'Launch'}</button>
					</div>
					{#if launched}<p class="launch__ok">“{launched}” is in orbit now.</p>{/if}
				</form>
			{/if}
		</div>
	{:else}
		{@const body = focus.body}
		<p class="kicker">{focus.system.name} · {body.kicker}</p>
		<h1 class="headline">{body.name}</h1>
		<div class="panel__body">
			{#if body.title !== body.name}<p class="lede">{body.title}</p>{/if}
			{#each body.paragraphs as paragraph}<p class="copy">{paragraph}</p>{/each}
			{#if body.stats}
				<dl class="stats">
					{#each body.stats as stat}<div><dt>{stat.label}</dt><dd>{stat.value}</dd></div>{/each}
				</dl>
			{/if}
			{#if body.tags}
				<ul class="tags">{#each body.tags as tag}<li>{tag}</li>{/each}</ul>
			{/if}
			{#if body.links}
				<div class="links">
					{#each body.links as link}
						<a class="button button--solid" href={link.href} target={link.href.startsWith('http') ? '_blank' : undefined} rel="noopener">{link.label} {link.href.startsWith('http') ? '↗' : ''}</a>
					{/each}
				</div>
			{/if}
			{#if prevBody && nextBody}
				<nav class="pager" aria-label="Neighbouring worlds">
					<a href={`/${focus.system.slug}/${prevBody.slug}`}><kbd>←</kbd> {prevBody.name}</a>
					<a href={`/${focus.system.slug}/${nextBody.slug}`}>{nextBody.name} <kbd>→</kbd></a>
				</nav>
			{/if}
		</div>
	{/if}
</article>
