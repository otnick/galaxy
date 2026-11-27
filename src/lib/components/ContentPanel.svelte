<script lang="ts">
	import { OWNER, UNIVERSE_INTRO, focusKey, type Focus } from '$lib/universe/content';
	import type { PlanetRecord } from '$lib/types';
	import Icon from './Icon.svelte';

	let {
		focus,
		collapsed = $bindable(false),
		planets,
		onPlanetAdded,
		fallback
	}: {
		focus: Focus;
		collapsed?: boolean;
		planets: PlanetRecord[];
		onPlanetAdded: () => Promise<void> | void;
		fallback: boolean;
	} = $props();

	let name = $state('');
	let sending = $state(false);
	let launched = $state('');
	let launchError = $state('');

	const COLORS = ['#7dd3fc', '#fde68a', '#fda4af', '#86efac', '#c4b5fd', '#f9a8d4'];

	const launch = async (e: SubmitEvent) => {
		e.preventDefault();
		const clean = name.trim().slice(0, 24);
		if (!clean || sending) return;
		sending = true;
		launchError = '';
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
			if (!res.ok) throw new Error(String(res.status));
			launched = clean;
			name = '';
			await onPlanetAdded();
		} catch {
			launchError = 'Launch failed. The belt could not be reached, try again in a moment.';
		} finally {
			sending = false;
		}
	};

	const channel = $derived(
		focus.level === 'universe'
			? 'CH 00 · OVERVIEW'
			: focus.level === 'system'
				? `CH ${String(focus.system.bodies.length).padStart(2, '0')} · ${focus.system.name}`
				: `${focus.system.name} / ${focus.body.name}`
	);

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
	const isExternal = (href: string) => href.startsWith('http');
</script>

<section class="mfd crt" class:mfd--static={fallback} aria-live="polite">
	<header class="mfd__bezel">
		<span class="mfd__channel">{channel}</span>
		<button class="mfd__toggle" type="button" onclick={() => (collapsed = !collapsed)} aria-expanded={!collapsed}>
			{collapsed ? 'Expand' : 'Dim'}
		</button>
	</header>

	<div class="crt__glass mfd__glass">
		{#key focusKey(focus)}
			<article class="mfd__page">
				{#if focus.level === 'universe'}
					<h1 class="mfd__title mfd__title--xl">{OWNER.name}</h1>
					<p class="mfd__lede">{UNIVERSE_INTRO.headline}</p>
					<div class="mfd__body">
						<p>{UNIVERSE_INTRO.intro}</p>
						<p class="mfd__prompt">Five stars on the chart. Pick one on the console, or click it through the window.</p>
					</div>
				{:else if focus.level === 'system'}
					{@const system = focus.system}
					<h1 class="mfd__title">{system.headline}</h1>
					<div class="mfd__body">
						<p>{system.intro}</p>
						{#if system.tags}
							<dl class="mfd__data"><dt>Stack</dt><dd>{system.tags.join(' · ')}</dd></dl>
						{/if}
						{#if system.links}
							<div class="mfd__actions">
								{#each system.links as link}
									<a class="crt-button" href={link.href}><Icon name="mail" />{link.label}</a>
								{/each}
							</div>
						{/if}
						<ul class="mfd__targets" aria-label={`Worlds around ${system.name}`}>
							{#each system.bodies as body}
								<li>
									<a href={`/${system.slug}/${body.slug}`}>
										<span class="mfd__target-name">{body.name}</span>
										<span class="mfd__target-note">{body.kicker}</span>
										<Icon name="next" />
									</a>
								</li>
							{/each}
						</ul>
						{#if system.slug === 'orbit'}
							<form class="launch" onsubmit={launch}>
								<label for="planet-name">Leave your own planet in the belt. {planets.length} visitors orbit here already.</label>
								<div class="launch__row">
									<span class="launch__prompt" aria-hidden="true">&gt;</span>
									<input id="planet-name" bind:value={name} maxlength="24" placeholder="your callsign" autocomplete="off" spellcheck="false" />
									<button class="crt-button crt-button--solid" type="submit" disabled={sending || !name.trim()}>{sending ? 'Launching' : 'Launch'}</button>
								</div>
								{#if launched}<p class="launch__ok">{launched} is in orbit now.</p>{/if}
								{#if launchError}<p class="launch__error" role="alert">{launchError}</p>{/if}
							</form>
						{/if}
					</div>
				{:else}
					{@const body = focus.body}
					<h1 class="mfd__title">{body.name}</h1>
					<div class="mfd__body">
						{#if body.title !== body.name}<p class="mfd__lede">{body.title}</p>{/if}
						{#each body.paragraphs as paragraph}<p>{paragraph}</p>{/each}
						{#if body.stats || body.tags}
							<dl class="mfd__data">
								{#each body.stats ?? [] as stat}<dt>{stat.label}</dt><dd class="mfd__figure">{stat.value}</dd>{/each}
								{#if body.tags}<dt>Stack</dt><dd>{body.tags.join(' · ')}</dd>{/if}
							</dl>
						{/if}
						{#if body.links}
							<div class="mfd__actions">
								{#each body.links as link}
									<a class="crt-button crt-button--solid" href={link.href} target={isExternal(link.href) ? '_blank' : undefined} rel={isExternal(link.href) ? 'noopener' : undefined}>
										{link.label}<Icon name={isExternal(link.href) ? 'external' : 'mail'} />
									</a>
								{/each}
							</div>
						{/if}
						{#if prevBody && nextBody}
							<nav class="mfd__pager" aria-label="Neighbouring worlds">
								<a href={`/${focus.system.slug}/${prevBody.slug}`}><Icon name="prev" />{prevBody.name}</a>
								<a href={`/${focus.system.slug}/${nextBody.slug}`}>{nextBody.name}<Icon name="next" /></a>
							</nav>
						{/if}
					</div>
				{/if}
			</article>
		{/key}
	</div>
</section>
