<script lang="ts">
	import { page } from '$app/state';
	import { fly } from 'svelte/transition';

	const links = [
		{ href: '/', label: 'Orbit' },
		{ href: '/about', label: 'About' },
		{ href: '/projects', label: 'Projects' },
		{ href: '/contact', label: 'Contact' }
	];
</script>

<nav in:fly={{ y: -24, duration: 450 }} class="pointer-events-none fixed inset-x-0 top-5 z-50">
	<div class="mx-auto flex max-w-5xl justify-center px-4">
		<div
			class="glass-panel pointer-events-auto flex items-center gap-1 rounded-full px-3 py-2 transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_0_56px_rgba(114,225,255,0.18)]"
		>
			{#each links as link}
				<a
					href={link.href}
					class={`rounded-full px-4 py-2 text-sm tracking-wide transition-all duration-300 ${
						page.url.pathname === link.href
							? 'bg-white/14 text-white'
							: 'text-soft hover:bg-white/8 hover:text-white'
					}`}
					>{link.label}</a
				>
			{/each}
		</div>
	</div>
</nav>
