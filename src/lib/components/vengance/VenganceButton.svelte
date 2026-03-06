<script lang="ts">
	let {
		type = 'button',
		disabled = false,
		className = '',
		onclick,
		children
	} = $props<{
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		className?: string;
		onclick?: (event: MouseEvent) => void;
		children?: () => unknown;
	}>();
</script>

<button
	{type}
	{disabled}
	{onclick}
	class={`rounded-full border border-white/20 bg-white/14 px-5 py-2.5 text-sm font-medium tracking-wide text-white shadow-[0_0_24px_rgba(114,225,255,0.16)] transition hover:scale-[1.02] hover:bg-white/24 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
>
	{@render children?.()}
</button>
