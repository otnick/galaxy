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
	class={`rounded-full border border-white/14 bg-gradient-to-r from-white/16 to-white/8 px-5 py-2.5 text-sm font-medium tracking-[0.08em] text-white shadow-[0_0_24px_rgba(114,225,255,0.12)] transition duration-300 hover:-translate-y-0.5 hover:border-white/24 hover:bg-white/18 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
>
	{@render children?.()}
</button>
