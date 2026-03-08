<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	let visible = $state(true);
	let arcProgress = $state(0);
	let textPhase = $state(0); // 0=hidden, 1=monogram, 2=name, 3=tagline

	const CIRCUMFERENCE = 2 * Math.PI * 56; // r=56

	onMount(() => {
		// Arc draws in over 900ms
		const arcStart = performance.now();
		const arcDuration = 900;

		const animateArc = (now: number) => {
			const t = Math.min((now - arcStart) / arcDuration, 1);
			// ease-out-expo
			arcProgress = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
			if (t < 1) requestAnimationFrame(animateArc);
		};
		requestAnimationFrame(animateArc);

		// Sequential text fade-ins
		setTimeout(() => (textPhase = 1), 300);
		setTimeout(() => (textPhase = 2), 550);
		setTimeout(() => (textPhase = 3), 780);

		// Dismiss after 2s
		setTimeout(() => (visible = false), 2000);
	});
</script>

{#if visible}
	<div
		out:fade={{ duration: 500 }}
		class="loading-screen fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#030711]"
	>
		<!-- Orbital arc -->
		<div class="relative flex items-center justify-center">
			<svg width="140" height="140" viewBox="0 0 140 140" fill="none">
				<!-- Background ring -->
				<circle
					cx="70" cy="70" r="56"
					stroke="rgba(255,255,255,0.06)"
					stroke-width="1"
					fill="none"
				/>
				<!-- Animated arc -->
				<circle
					cx="70" cy="70" r="56"
					stroke="url(#arcGrad)"
					stroke-width="1.5"
					fill="none"
					stroke-linecap="round"
					stroke-dasharray={CIRCUMFERENCE}
					stroke-dashoffset={CIRCUMFERENCE * (1 - arcProgress * 0.82)}
					transform="rotate(-90 70 70)"
					style="transition: stroke-dashoffset 0.05s linear;"
				/>
				<!-- Glow dot at arc tip -->
				{#if arcProgress > 0.05}
					{@const angle = -Math.PI / 2 + arcProgress * 0.82 * 2 * Math.PI}
					<circle
						cx={70 + 56 * Math.cos(angle)}
						cy={70 + 56 * Math.sin(angle)}
						r="3"
						fill="#86eaff"
						style="filter: drop-shadow(0 0 6px #72e1ff);"
					/>
				{/if}
				<defs>
					<linearGradient id="arcGrad" x1="0" y1="0" x2="140" y2="140" gradientUnits="userSpaceOnUse">
						<stop offset="0%" stop-color="#ffd279" />
						<stop offset="100%" stop-color="#72e1ff" />
					</linearGradient>
				</defs>
			</svg>

			<!-- NS Monogram -->
			<div
				class="absolute text-2xl font-semibold tracking-[-0.04em] text-white transition-all duration-300"
				style={`opacity: ${textPhase >= 1 ? 1 : 0}; transform: scale(${textPhase >= 1 ? 1 : 0.88})`}
			>
				NS
			</div>
		</div>

		<!-- Name -->
		<div
			class="mt-7 text-sm font-medium tracking-[0.22em] text-white/88 uppercase transition-all duration-400"
			style={`opacity: ${textPhase >= 2 ? 1 : 0}; transform: translateY(${textPhase >= 2 ? 0 : 8}px)`}
		>
			Nick Schumacher
		</div>

		<!-- Tagline -->
		<div
			class="mt-2 text-[0.68rem] tracking-[0.18em] text-white/32 uppercase transition-all duration-400"
			style={`opacity: ${textPhase >= 3 ? 1 : 0}; transform: translateY(${textPhase >= 3 ? 0 : 6}px)`}
		>
			Entering the system
		</div>
	</div>
{/if}
