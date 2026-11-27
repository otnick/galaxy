<script lang="ts">
	import { SYSTEMS, type Focus } from '$lib/universe/content';

	let { focus }: { focus: Focus } = $props();

	// top-down projection of the galaxy (x/z plane)
	const xs = SYSTEMS.map((s) => s.position[0]);
	const zs = SYSTEMS.map((s) => s.position[2]);
	const minX = Math.min(...xs);
	const maxX = Math.max(...xs);
	const minZ = Math.min(...zs);
	const maxZ = Math.max(...zs);
	const W = 132;
	const H = 92;
	const pad = 14;
	const px = (x: number) => pad + ((x - minX) / (maxX - minX)) * (W - pad * 2);
	const pz = (z: number) => pad + ((z - minZ) / (maxZ - minZ)) * (H - pad * 2);
	const current = $derived(focus.level === 'universe' ? null : focus.system.slug);
</script>

<nav class="starmap" aria-label="Star map">
	<svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
		{#each SYSTEMS as a, i}
			{#if i > 0}
				<line x1={px(SYSTEMS[0].position[0])} y1={pz(SYSTEMS[0].position[2])} x2={px(a.position[0])} y2={pz(a.position[2])} />
			{/if}
		{/each}
	</svg>
	{#each SYSTEMS as system, i}
		<a
			href={`/${system.slug}`}
			class="starmap__star"
			class:is-current={current === system.slug}
			style={`left:${px(system.position[0])}px; top:${pz(system.position[2])}px; --c:${system.star.corona}`}
			aria-current={current === system.slug ? 'location' : undefined}
			title={`${i + 1} · ${system.name}`}
		>
			<span class="sr-only">{system.name}</span>
		</a>
	{/each}
</nav>
