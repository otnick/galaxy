<script lang="ts">
	// One authored icon set: 24px grid, 1.75 stroke, square caps — matches the console's stencil look.
	let { name }: { name: 'chevron' | 'back' | 'prev' | 'next' | 'external' | 'mail' } = $props();
</script>

<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
	{#if name === 'chevron'}
		<path d="M9 5l7 7-7 7" />
	{:else if name === 'back'}
		<path d="M10 6l-6 6 6 6" /><path d="M4 12h16" />
	{:else if name === 'prev'}
		<path d="M15 5l-7 7 7 7" />
	{:else if name === 'next'}
		<path d="M9 5l7 7-7 7" />
	{:else if name === 'external'}
		<path d="M8 16L18 6" /><path d="M9 6h9v9" />
	{:else if name === 'mail'}
		<path d="M3 6h18v12H3z" /><path d="M3 7l9 7 9-7" />
	{/if}
</svg>
