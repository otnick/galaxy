<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { JOURNEY_SECTIONS } from '$lib/journey';

	let currentPath = $state('/');

	const syncCurrentPath = () => {
		if (typeof window === 'undefined') return;
		currentPath = window.location.pathname;
	};

	const navigate = (path: string) => {
		if (typeof window === 'undefined') return;
		window.dispatchEvent(new CustomEvent('galaxy:navigate', { detail: { path } }));
	};

	onMount(() => {
		syncCurrentPath();
		window.addEventListener('popstate', syncCurrentPath);
		window.addEventListener('galaxy:pathchange', syncCurrentPath as EventListener);

		return () => {
			window.removeEventListener('popstate', syncCurrentPath);
			window.removeEventListener('galaxy:pathchange', syncCurrentPath as EventListener);
		};
	});
</script>

<nav in:fly={{ y: -24, duration: 450 }} class="pointer-events-none fixed inset-x-0 top-5 z-50">
	<div class="mx-auto flex max-w-5xl justify-center px-4">
		<div class="glass-panel pointer-events-auto flex items-center gap-1 rounded-full px-3 py-2 transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_0_56px_rgba(114,225,255,0.18)]">
			{#each JOURNEY_SECTIONS as link}
				<button
					type="button"
					onclick={() => navigate(link.path)}
					class={`rounded-full px-4 py-2 text-sm tracking-wide transition-all duration-300 ${
						currentPath === link.path
							? 'bg-white/14 text-white'
							: 'text-soft hover:bg-white/8 hover:text-white'
					}`}
				>
					{link.label}
				</button>
			{/each}
		</div>
	</div>
</nav>
