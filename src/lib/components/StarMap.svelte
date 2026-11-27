<script lang="ts">
	import { SYSTEMS, type Focus } from '$lib/universe/content';

	let { focus, heading }: { focus: Focus; heading: number } = $props();

	// radar scope: top-down projection of the galaxy (x/z plane), centred on the home star
	const R = 46;
	const maxR = Math.max(...SYSTEMS.map((s) => Math.hypot(s.position[0], s.position[2])));
	const blip = (s: (typeof SYSTEMS)[number]) => ({
		x: 50 + (s.position[0] / maxR) * R * 0.82,
		y: 50 + (s.position[2] / maxR) * R * 0.82
	});
	const current = $derived(focus.level === 'universe' ? null : focus.system.slug);
</script>

<nav class="radar crt" aria-label="Star map">
	<div class="crt__glass radar__glass">
		<svg viewBox="0 0 100 100" aria-hidden="true">
			<circle cx="50" cy="50" r="46" />
			<circle cx="50" cy="50" r="30" />
			<circle cx="50" cy="50" r="14" />
			<path d="M50 4v92M4 50h92" />
			<g style={`transform: rotate(${-heading}deg); transform-origin: 50px 50px`}>
				<path class="radar__fov" d="M50 50 L36 10 A42 42 0 0 1 64 10 Z" />
			</g>
		</svg>
		<span class="radar__sweep" aria-hidden="true"></span>
		{#each SYSTEMS as system, i}
			{@const p = blip(system)}
			<a
				href={`/${system.slug}`}
				class="radar__blip"
				class:is-current={current === system.slug}
				style={`left:${p.x}%; top:${p.y}%`}
				aria-current={current === system.slug ? 'location' : undefined}
				title={`${i + 1} · ${system.name}`}
			>
				<span class="sr-only">{system.name}</span>
			</a>
		{/each}
	</div>
</nav>
