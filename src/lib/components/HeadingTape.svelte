<script lang="ts">
	// HUD heading tape, drawn on the window glass. 3px per degree.
	let { heading }: { heading: number } = $props();
	const PX = 3;
	const ticks: { deg: number; major: boolean; label?: string }[] = [];
	const names: Record<number, string> = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' };
	for (let d = -180; d <= 540; d += 5) {
		const norm = ((d % 360) + 360) % 360;
		ticks.push({ deg: d, major: d % 30 === 0, label: d % 30 === 0 ? (names[norm] ?? String(norm).padStart(3, '0')) : undefined });
	}
</script>

<div class="tape" aria-hidden="true">
	<div class="tape__strip" style={`transform: translateX(${(-(heading + 180) * PX).toFixed(1)}px)`}>
		{#each ticks as t}
			<span class="tape__tick" class:is-major={t.major} style={`left:${(t.deg + 180) * PX}px`}>
				{#if t.label}<em>{t.label}</em>{/if}
			</span>
		{/each}
	</div>
	<span class="tape__caret"></span>
	<span class="tape__value">{Math.round(heading).toString().padStart(3, '0')}</span>
</div>
