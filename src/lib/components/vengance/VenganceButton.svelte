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
	class={`rounded-full border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.11),rgba(255,255,255,0.04))] px-5 py-2.5 text-sm font-medium tracking-[0.08em] text-white shadow-[0_10px_28px_rgba(3,10,22,0.22)] transition duration-300 hover:-translate-y-0.5 hover:border-white/22 hover:bg-white/14 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
>
	{@render children?.()}
</button>
