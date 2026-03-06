<script lang="ts">
	let {
		className = '',
		as = 'section',
		children
	} = $props<{ className?: string; as?: keyof HTMLElementTagNameMap; children?: () => unknown }>();
</script>

<svelte:element this={as} class={`glass-panel rounded-3xl p-6 ${className}`}>
	{@render children?.()}
</svelte:element>
