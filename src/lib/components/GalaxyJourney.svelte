<script lang="ts">
	import { onMount, tick } from 'svelte';
	import SolarCanvas from '$lib/components/SolarCanvas.svelte';
	import PortfolioCard from '$lib/components/PortfolioCard.svelte';
	import VenganceButton from '$lib/components/vengance/VenganceButton.svelte';
	import VenganceCard from '$lib/components/vengance/VenganceCard.svelte';
	import type { PlanetRecord, SceneTheme } from '$lib/types';
	import { JOURNEY_SECTIONS, resolveJourneySection } from '$lib/journey';

	const THEME_RGB: Record<SceneTheme, string> = {
		orbit: '73,132,255',
		about: '114,225,255',
		projects: '255,180,80',
		contact: '114,225,255',
		impressum: '140,140,180'
	};

	let props = $props<{ initialPath?: string }>();
	const startPath = $derived(props.initialPath ?? '/');

	let planets = $state<PlanetRecord[]>([]);
	let loading = $state(true);
	let creating = $state(false);
	let scrollZoom = $state(1);
	let storyZoom = $state(0);
	let uiOpacity = $state(1);
	let activeTheme = $state<SceneTheme>('orbit');
	let journeyProgress = $state(0);
	let orbitSection: HTMLElement;
	let aboutSection: HTMLElement;
	let projectsSection: HTMLElement;
	let contactSection: HTMLElement;
	let impressumSection: HTMLElement;
	let alive = true;
	let snapTimer: number | undefined;
	let snapReleaseTimer: number | undefined;
	let isAutoSnapping = false;

	$effect(() => {
		if (typeof document !== 'undefined') {
			document.documentElement.style.setProperty('--theme-rgb', THEME_RGB[activeTheme]);
		}
	});

	const sectionState = new Map<string, number>();

	const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
	const getState = (slug: string) => sectionState.get(slug) ?? 0;
	const isHeroVisible = (slug: string) => getState(slug) < 0.2;
	const isDetailsVisible = (slug: string) => getState(slug) > 0.12 && getState(slug) < 0.42;
	const getSectionOpacity = (slug: string) => 1 - clamp((getState(slug) - 0.34) / 0.16);

	const fetchPlanets = async () => {
		const response = await fetch('/api/planets');
		const data = (await response.json()) as { planets: PlanetRecord[] };
		planets = data.planets;
		loading = false;
	};

	const addPlanet = async () => {
		if (creating) return;
		creating = true;
		try {
			await fetch('/api/planets', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: `Planet ${planets.length + 1}`,
					color: ['#7dd3fc', '#fde68a', '#fda4af', '#86efac', '#c4b5fd', '#f9a8d4'][planets.length % 6],
					size: 2.2 + (planets.length % 6) * 0.7,
					speed: 0.08 + (planets.length % 7) * 0.04
				})
			});
			await fetchPlanets();
		} finally {
			creating = false;
		}
	};

	const syncPath = (path: string) => {
		if (typeof window === 'undefined') return;
		if (window.location.pathname === path) return;
		window.history.replaceState(window.history.state, '', path);
		window.dispatchEvent(new CustomEvent('galaxy:pathchange', { detail: { path } }));
	};

	const scrollToPath = (path: string, behavior: ScrollBehavior = 'smooth') => {
		const section = resolveJourneySection(path);
		const sectionElements = [orbitSection, aboutSection, projectsSection, contactSection, impressumSection];
		const target = sectionElements.find((element) => element?.dataset.section === section.slug);
		if (!target) {
			window.location.assign(path);
			return;
		}
		isAutoSnapping = behavior === 'smooth';
		target.scrollIntoView({ behavior, block: 'start' });
		if (snapReleaseTimer) clearTimeout(snapReleaseTimer);
		snapReleaseTimer = window.setTimeout(() => {
			isAutoSnapping = false;
			updateScrollState();
		}, behavior === 'smooth' ? 520 : 0);
	};

	const handleJourneyNavigate = (event: Event) => {
		const detail = (event as CustomEvent<{ path?: string }>).detail;
		if (!detail?.path) return;
		scrollToPath(detail.path, 'smooth');
	};

	const scheduleSnap = () => {
		if (typeof window === 'undefined') return;
		if (snapTimer) clearTimeout(snapTimer);
		const isCompactViewport = window.innerWidth < 768;
		snapTimer = window.setTimeout(() => {
			if (isAutoSnapping) return;
			const sectionElements = [orbitSection, aboutSection, projectsSection, contactSection, impressumSection];
			const current = window.scrollY;
			let nearestTop = sectionElements[0]?.offsetTop ?? 0;
			let nearestDistance = Math.abs(current - nearestTop);
			for (const element of sectionElements) {
				if (!element) continue;
				const distance = Math.abs(current - element.offsetTop);
				if (distance < nearestDistance) {
					nearestDistance = distance;
					nearestTop = element.offsetTop;
				}
			}
			if (nearestDistance > window.innerHeight * (isCompactViewport ? 0.1 : 0.18)) return;
			isAutoSnapping = true;
			window.scrollTo({ top: nearestTop, behavior: 'smooth' });
			if (snapReleaseTimer) clearTimeout(snapReleaseTimer);
			snapReleaseTimer = window.setTimeout(() => {
				isAutoSnapping = false;
				updateScrollState();
			}, isCompactViewport ? 380 : 520);
		}, isCompactViewport ? 210 : 130);
	};

	const updateScrollState = () => {
		if (typeof window === 'undefined') return;
		const sectionElements = [orbitSection, aboutSection, projectsSection, contactSection, impressumSection];
		let activeIndex = 0;

		for (let index = 0; index < sectionElements.length; index += 1) {
			const element = sectionElements[index];
			if (!element) continue;
			const sectionSpan = Math.max(element.offsetHeight - window.innerHeight, 1);
			const localProgress = clamp((window.scrollY - element.offsetTop) / sectionSpan);
			sectionState.set(element.dataset.section ?? JOURNEY_SECTIONS[index].slug, localProgress);
			if (window.scrollY >= element.offsetTop - window.innerHeight * 0.08) activeIndex = index;
		}

		const activeSection = JOURNEY_SECTIONS[activeIndex] ?? JOURNEY_SECTIONS[0];
		activeTheme = activeSection.theme;
		syncPath(activeSection.path);
		const currentProgress = getState(activeSection.slug);
		const transitionProgress = clamp((currentProgress - 0.84) / 0.16);
		journeyProgress = Math.min(JOURNEY_SECTIONS.length - 1, activeIndex + transitionProgress);

		scrollZoom = 1 + clamp(currentProgress / 0.52) * 0.24;
		storyZoom = clamp((currentProgress - 0.46) / 0.26);
		uiOpacity = 1 - clamp((currentProgress - 0.34) / 0.16);
	};

	onMount(() => {
		alive = true;
		void fetchPlanets();

		const onScroll = () => {
			updateScrollState();
			scheduleSnap();
		};
		const onResize = () => updateScrollState();
		const onPopState = () => scrollToPath(window.location.pathname, 'auto');

		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onResize);
		window.addEventListener('popstate', onPopState);
		window.addEventListener('galaxy:navigate', handleJourneyNavigate as EventListener);

		void tick().then(() => {
			if (!alive) return;
			activeTheme = resolveJourneySection(startPath).theme;
			scrollToPath(startPath, 'auto');
			updateScrollState();
		});

		return () => {
			alive = false;
			if (snapTimer) clearTimeout(snapTimer);
			if (snapReleaseTimer) clearTimeout(snapReleaseTimer);
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onResize);
			window.removeEventListener('popstate', onPopState);
			window.removeEventListener('galaxy:navigate', handleJourneyNavigate as EventListener);
		};
	});
</script>

<section class="relative min-h-[1320vh]">
	<div class="fixed inset-0 z-0 overflow-hidden">
		<div
			class="absolute inset-0 origin-center transition-transform duration-500 ease-out"
			style={`transform: scale(${scrollZoom});`}
		>
			<SolarCanvas {planets} storyZoom={storyZoom} theme={activeTheme} {journeyProgress} />
		</div>
		<div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_28%,rgba(2,7,19,0.58)_100%)]"></div>
	</div>

	<!-- Scroll-down cue -->
	<div
		class="pointer-events-none fixed bottom-8 left-1/2 z-20 -translate-x-1/2 transition-all duration-500"
		style={`opacity: ${journeyProgress < 0.05 ? 0.55 : 0}; transform: translateX(-50%) translateY(${journeyProgress < 0.05 ? 0 : 12}px)`}
	>
		<svg width="24" height="24" viewBox="0 0 24 24" fill="none" class="animate-bounce">
			<path d="M6 9L12 15L18 9" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
		</svg>
	</div>

	<div class="pointer-events-none relative z-10">

		<!-- ── ORBIT / ENTRY ── -->
		<section
			bind:this={orbitSection}
			data-section="orbit"
			class="relative min-h-[330vh] scroll-mt-0"
		>
			<div class="transition-opacity duration-500" style={`opacity:${uiOpacity * getSectionOpacity('orbit')};`}>
				<!-- Hero: vertically centered in viewport -->
				<div class="flex min-h-svh items-center justify-center px-4 py-12 md:px-6">
					<div class={`mx-auto w-full max-w-184 transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${isHeroVisible('orbit') ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-16 scale-[0.93] opacity-0'}`}>
						<VenganceCard className="hero-panel glass-shimmer pointer-events-auto rounded-4xl glow-gold p-0">
							<div class="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
								<div class="p-6 md:p-8">
									<span class="eyebrow">Portfolio / Bremen · Stockholm</span>
									<h1 class="mt-5 text-4xl font-semibold leading-[0.96] tracking-[-0.055em] md:text-[4.15rem]">
										Nick Schumacher — creative frontend built for space between engineering and atmosphere.
									</h1>
									<p class="text-soft mt-5 max-w-lg text-sm leading-7 md:text-[1rem]">
										2.5+ years shipping production frontend — Vue.js, Three.js, digital twins. Currently studying MSc Design for creative and immersive Technology at Stockholm University.
									</p>
									<div class="mt-8 flex flex-wrap gap-3">
										<VenganceButton onclick={addPlanet} disabled={creating} className="min-w-36">
											{creating ? 'Adding...' : 'Add Planet'}
										</VenganceButton>
										<button
											type="button"
											onclick={() => scrollToPath('/projects')}
											class="pointer-events-auto inline-flex items-center rounded-full border border-white/12 px-5 py-2.5 text-sm tracking-[0.08em] text-white/88 transition hover:border-white/22 hover:bg-white/8"
										>
											View Projects
										</button>
									</div>
									<div class="mt-8 grid gap-3 sm:grid-cols-3">
										<div class="data-chip">
											<div>
												<p class="text-dim text-[0.65rem] uppercase tracking-[0.18em]">Experience</p>
												<p class="mt-1 text-sm">2.5+ yrs frontend</p>
											</div>
											<p class="text-dim text-xs">01</p>
										</div>
										<div class="data-chip">
											<div>
												<p class="text-dim text-[0.65rem] uppercase tracking-[0.18em]">Stack</p>
												<p class="mt-1 text-sm">Vue · Svelte · Three.js</p>
											</div>
											<p class="text-dim text-xs">02</p>
										</div>
										<div class="data-chip">
											<div>
												<p class="text-dim text-[0.65rem] uppercase tracking-[0.18em]">Now</p>
												<p class="mt-1 text-sm">Stockholm University</p>
											</div>
											<p class="text-dim text-xs">03</p>
										</div>
									</div>
								</div>
								<div class="border-t border-white/10 p-6 md:p-8 lg:border-l lg:border-t-0">
									<p class="text-dim text-[0.66rem] uppercase tracking-[0.2em]">Flight Rail</p>
									<div class="mt-5 space-y-3">
										<div class="panel-rail">
											<p class="text-dim text-[0.62rem] uppercase tracking-[0.18em]">Navigation</p>
											<p class="text-sm leading-6 text-white/88">Scroll moves between systems. `Ctrl`/`Cmd`/`Alt` + wheel zooms the galaxy. `W/A/S/D` and `Q/E` fly freely.</p>
										</div>
										<div class="panel-rail">
											<p class="text-dim text-[0.62rem] uppercase tracking-[0.18em]">Projects in orbit</p>
											<p class="text-sm leading-6 text-white/88">The four labeled planets orbiting the Projects star are real work — click the star to travel there.</p>
										</div>
										<div class="panel-rail">
											<p class="text-dim text-[0.62rem] uppercase tracking-[0.18em]">Planets</p>
											<p class="mt-1 text-sm leading-6 text-white/88">{loading ? 'Syncing…' : `${planets.length} community planets stored in this system.`} Add your own.</p>
										</div>
									</div>
								</div>
							</div>
						</VenganceCard>
					</div>
				</div>

				<!-- Details -->
				<div class="flex items-center justify-center px-4 pb-16 md:px-6">
					<div class="mx-auto w-full max-w-5xl">
						<div class="grid gap-4 lg:grid-cols-[1.12fr_0.88fr]">
							<div class={`transition-all duration-900 ease-[cubic-bezier(0.16,1,0.3,1)] ${isDetailsVisible('orbit') ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-12 scale-[0.95] opacity-0'}`}>
								<VenganceCard className="pointer-events-auto h-full rounded-4xl glow-cyan">
									<p class="text-dim text-[0.72rem] uppercase tracking-[0.2em]">Approach</p>
									<h2 class="mt-3 max-w-md text-3xl font-semibold leading-tight tracking-[-0.03em] md:text-[2.3rem]">Immersive interfaces that still behave like disciplined software.</h2>
									<p class="text-soft mt-5 max-w-xl leading-7">The canvas carries the visual weight. The interface steps in only when it adds direction, action, or context — never noise.</p>
									<div class="mt-8 flex flex-wrap gap-2">
										<span class="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/78">WebGL / Three.js</span>
										<span class="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/78">Vue.js</span>
										<span class="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/78">SvelteKit</span>
										<span class="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/78">Digital Twins</span>
									</div>
								</VenganceCard>
							</div>
							<div class={`pointer-events-auto grid gap-3 transition-all duration-900 delay-100 ease-[cubic-bezier(0.16,1,0.3,1)] md:gap-4 ${isDetailsVisible('orbit') ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-12 scale-[0.95] opacity-0'}`}>
								<PortfolioCard title="About" description="BSc Media CS · Stockholm Design for CIT · 2.5 yrs frontend engineering." href="/about" />
								<PortfolioCard title="Projects" description="Festival WebSocket sync, fish tracker PWA, Unity games, and a 1.0-grade thesis." href="/projects" />
								<PortfolioCard title="Contact" description="Open to freelance, creative frontend, and immersive experience work." href="/contact" />
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- ── ABOUT ── -->
		<section bind:this={aboutSection} data-section="about" class="relative min-h-[320vh] scroll-mt-0">
			<div class="transition-opacity duration-500" style={`opacity:${uiOpacity * getSectionOpacity('about')};`}>
				<div class="flex min-h-svh items-center justify-center px-4 py-12 md:px-6">
					<div class={`mx-auto w-full max-w-184 transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${isHeroVisible('about') ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-16 scale-[0.93] opacity-0'}`}>
						<VenganceCard className="pointer-events-auto rounded-4xl glow-cyan">
							<p class="eyebrow">About / Nick Schumacher</p>
							<h2 class="mt-5 max-w-2xl text-4xl font-semibold leading-[0.98] tracking-[-0.04em] md:text-6xl">BSc Media Computer Science. Now building at the frontier of design and immersive technology.</h2>
							<p class="text-soft mt-5 max-w-2xl text-sm leading-7 md:text-base">
								Graduated from the University of Lübeck with a 1.0 on my bachelor thesis — a 3D bridge viewer based on the IFC standard. Currently in Stockholm studying MSc Design for creative and immersive Technology. I combine engineering rigor with spatial design sensibility to build things that feel inhabited.
							</p>
							<div class="mt-8 grid gap-3 sm:grid-cols-3">
								<div class="data-chip"><div><p class="text-dim text-[0.65rem] uppercase tracking-[0.18em]">Degree</p><p class="mt-1 text-sm">BSc Media CS · Lübeck</p></div><p class="text-dim text-xs">01</p></div>
								<div class="data-chip"><div><p class="text-dim text-[0.65rem] uppercase tracking-[0.18em]">Currently</p><p class="mt-1 text-sm">MSc Immersive Tech · SU</p></div><p class="text-dim text-xs">02</p></div>
								<div class="data-chip"><div><p class="text-dim text-[0.65rem] uppercase tracking-[0.18em]">Thesis grade</p><p class="mt-1 text-sm">1.0 — IFC 3D Viewer</p></div><p class="text-dim text-xs">03</p></div>
							</div>
						</VenganceCard>
					</div>
				</div>

				<div class="flex items-center justify-center px-4 pb-16 md:px-6">
					<div class="mx-auto w-full max-w-5xl">
						<div class="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
							<div class={`transition-all duration-900 ease-[cubic-bezier(0.16,1,0.3,1)] ${isDetailsVisible('about') ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-12 scale-[0.95] opacity-0'}`}>
								<VenganceCard className="pointer-events-auto h-full rounded-4xl">
									<p class="text-dim text-[0.68rem] uppercase tracking-[0.18em]">Method</p>
									<p class="text-soft mt-4 leading-7">Production work in Vue.js, Vuetify, Tailwind, and Three.js across digital twin dashboards and data-heavy interfaces. Private builds in Next, Nuxt, and Svelte — the latter being my largest and most refined environment.</p>
									<p class="text-soft mt-4 leading-7">I aim for interfaces that feel spatial, load light, and handle complexity without visual noise.</p>
								</VenganceCard>
							</div>
							<div class={`grid gap-4 transition-all duration-900 delay-100 ease-[cubic-bezier(0.16,1,0.3,1)] md:grid-cols-3 ${isDetailsVisible('about') ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-12 scale-[0.95] opacity-0'}`}>
								<VenganceCard className="pointer-events-auto rounded-[1.7rem]"><p class="text-2xl font-semibold">1.0</p><p class="text-soft mt-2 text-sm">Bachelor thesis grade — 3D bridge viewer on the IFC standard.</p></VenganceCard>
								<VenganceCard className="pointer-events-auto rounded-[1.7rem]"><p class="text-2xl font-semibold">2.5+</p><p class="text-soft mt-2 text-sm">Years shipping production Vue.js, Three.js, and digital twin frontends.</p></VenganceCard>
								<VenganceCard className="pointer-events-auto rounded-[1.7rem]"><p class="text-2xl font-semibold">2 stores</p><p class="text-soft mt-2 text-sm">PWA deployed on both Google Play and Apple App Store.</p></VenganceCard>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- ── PROJECTS ── -->
		<section bind:this={projectsSection} data-section="projects" class="relative min-h-[320vh] scroll-mt-0">
			<div class="transition-opacity duration-500" style={`opacity:${uiOpacity * getSectionOpacity('projects')};`}>
				<div class="flex min-h-svh items-center justify-center px-4 py-12 md:px-6">
					<div class={`mx-auto w-full max-w-184 transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${isHeroVisible('projects') ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-16 scale-[0.93] opacity-0'}`}>
						<VenganceCard className="pointer-events-auto rounded-4xl">
							<p class="eyebrow">Projects / Selected</p>
							<h2 class="mt-5 max-w-2xl text-4xl font-semibold leading-[0.98] tracking-[-0.04em] md:text-6xl">From festival WebSocket sync to 3D bridge viewers — always the full stack.</h2>
							<p class="text-soft mt-5 max-w-2xl text-sm leading-7 md:text-base">
								Festival goers, fishermen, gamers, and bridge engineers as real users. Each project visible as a labeled planet orbiting the star to your right.
							</p>
						</VenganceCard>
					</div>
				</div>

				<div class="flex items-center justify-center px-4 pb-16 md:px-6">
					<div class="mx-auto w-full max-w-5xl">
						<div class={`grid gap-4 transition-all duration-900 ease-[cubic-bezier(0.16,1,0.3,1)] md:grid-cols-2 ${isDetailsVisible('projects') ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-12 scale-[0.95] opacity-0'}`}>
							<VenganceCard className="pointer-events-auto rounded-[1.8rem]">
								<div class="mb-3 flex items-center gap-2">
									<span class="inline-block h-2.5 w-2.5 rounded-full bg-[#ff6eb0] shadow-[0_0_10px_#ff6eb0]"></span>
									<p class="text-dim text-[0.68rem] uppercase tracking-[0.18em]">fusch.fun</p>
								</div>
								<h3 class="text-2xl font-semibold">Festival Website</h3>
								<p class="text-soft mt-3 leading-7">Live festival platform with real-time WebSocket synchronisation — the DJ's track position streams to every connected client simultaneously. Built for atmosphere under pressure.</p>
								<a href="https://fusch.fun" target="_blank" rel="noopener" class="pointer-events-auto mt-4 inline-flex items-center gap-1.5 text-sm text-white/52 transition hover:text-white/88">fusch.fun ↗</a>
							</VenganceCard>

							<VenganceCard className="pointer-events-auto rounded-[1.8rem]">
								<div class="mb-3 flex items-center gap-2">
									<span class="inline-block h-2.5 w-2.5 rounded-full bg-[#6eb4ff] shadow-[0_0_10px_#6eb4ff]"></span>
									<p class="text-dim text-[0.68rem] uppercase tracking-[0.18em]">findex · fishbox.nickot.is</p>
								</div>
								<h3 class="text-2xl font-semibold">Fish Tracker PWA</h3>
								<p class="text-soft mt-3 leading-7">Social media and fish tracking app for fishermen — log catches, explore a feed, map spots. Next.js + SQL, deployed as a PWA on both Google Play and Apple App Store.</p>
								<a href="https://fishbox.nickot.is" target="_blank" rel="noopener" class="pointer-events-auto mt-4 inline-flex items-center gap-1.5 text-sm text-white/52 transition hover:text-white/88">fishbox.nickot.is ↗</a>
							</VenganceCard>

							<VenganceCard className="pointer-events-auto rounded-[1.8rem]">
								<div class="mb-3 flex items-center gap-2">
									<span class="inline-block h-2.5 w-2.5 rounded-full bg-[#6effa8] shadow-[0_0_10px_#6effa8]"></span>
									<p class="text-dim text-[0.68rem] uppercase tracking-[0.18em]">Unity / WebGL</p>
								</div>
								<h3 class="text-2xl font-semibold">The Last of Fish</h3>
								<p class="text-soft mt-3 leading-7">Unity game built as a creative project — designed around an absurdist fishy premise. Exportable to WebGL for browser play. Proof that the same spatial thinking applies to games.</p>
							</VenganceCard>

							<VenganceCard className="pointer-events-auto rounded-[1.8rem] glow-gold">
								<div class="mb-3 flex items-center gap-2">
									<span class="inline-block h-2.5 w-2.5 rounded-full bg-[#ffd06e] shadow-[0_0_10px_#ffd06e]"></span>
									<p class="text-dim text-[0.68rem] uppercase tracking-[0.18em]">Bachelor Thesis · Grade 1.0</p>
								</div>
								<h3 class="text-2xl font-semibold">Bridge 3D Viewer</h3>
								<p class="text-soft mt-3 leading-7">Interactive 3D viewer for bridge infrastructure based on the IFC open standard — parsed, rendered, and queryable in the browser. University of Lübeck, graded 1.0.</p>
							</VenganceCard>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- ── CONTACT ── -->
		<section bind:this={contactSection} data-section="contact" class="relative min-h-[320vh] scroll-mt-0">
			<div class="transition-opacity duration-500" style={`opacity:${uiOpacity * getSectionOpacity('contact')};`}>
				<div class="flex min-h-svh items-center justify-center px-4 py-12 md:px-6">
					<div class={`mx-auto w-full max-w-184 transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${isHeroVisible('contact') ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-16 scale-[0.93] opacity-0'}`}>
						<VenganceCard className="pointer-events-auto rounded-4xl glow-cyan">
							<p class="eyebrow">Contact / Signal</p>
							<h2 class="mt-5 max-w-2xl text-4xl font-semibold leading-[0.98] tracking-[-0.04em] md:text-6xl">Let's build something spatial and real.</h2>
							<p class="text-soft mt-5 max-w-2xl text-sm leading-7 md:text-base">
								Open to freelance, creative frontend roles, and immersive experience projects. Based between Bremen and Stockholm — remote-friendly. Bring the brief, the timeline, and the ambition.
							</p>
							<div class="mt-8 flex flex-wrap gap-3">
								<a
									href="mailto:schumacher@nickot.is"
									class="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-5 py-2.5 text-sm tracking-[0.04em] text-white/88 transition hover:border-white/22 hover:bg-white/12"
								>
									schumacher@nickot.is
								</a>
							</div>
						</VenganceCard>
					</div>
				</div>

				<div class="flex items-center justify-center px-4 pb-16 md:px-6">
					<div class="mx-auto w-full max-w-5xl">
						<div class="grid gap-4 lg:grid-cols-[0.86fr_1.14fr]">
							<div class={`transition-all duration-900 ease-[cubic-bezier(0.16,1,0.3,1)] ${isDetailsVisible('contact') ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-12 scale-[0.95] opacity-0'}`}>
								<VenganceCard className="pointer-events-auto h-full rounded-[1.8rem]">
									<p class="text-dim text-[0.68rem] uppercase tracking-[0.18em]">Best for</p>
									<p class="text-soft mt-4 leading-7">Creative frontend, WebGL/Three.js, SvelteKit, Vue.js, digital twin dashboards, real-time data interfaces, and immersive portfolio-scale experiences.</p>
									<div class="mt-6 space-y-2">
										<p class="text-dim text-[0.65rem] uppercase tracking-[0.18em]">Location</p>
										<p class="text-sm text-white/88">Bremen · Stockholm · Remote</p>
									</div>
									<div class="mt-4 space-y-1">
										<p class="text-dim text-[0.65rem] uppercase tracking-[0.18em]">Mail</p>
										<a href="mailto:schumacher@nickot.is" class="pointer-events-auto text-sm text-white/88 transition hover:text-white">schumacher@nickot.is</a>
									</div>
								</VenganceCard>
							</div>
							<div class={`transition-all duration-900 delay-100 ease-[cubic-bezier(0.16,1,0.3,1)] ${isDetailsVisible('contact') ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-12 scale-[0.95] opacity-0'}`}>
								<VenganceCard className="pointer-events-auto rounded-4xl">
									<form class="grid gap-4">
										<label class="grid gap-2"><span class="text-sm text-white/88">Name</span><input class="rounded-xl border border-white/14 bg-black/22 px-4 py-3 outline-none transition focus:border-white/34" type="text" placeholder="Your name" /></label>
										<label class="grid gap-2"><span class="text-sm text-white/88">Email</span><input class="rounded-xl border border-white/14 bg-black/22 px-4 py-3 outline-none transition focus:border-white/34" type="email" placeholder="you@example.com" /></label>
										<label class="grid gap-2"><span class="text-sm text-white/88">Message</span><textarea class="min-h-36 rounded-xl border border-white/14 bg-black/22 px-4 py-3 outline-none transition focus:border-white/34" placeholder="Scope, timeline, goals..."></textarea></label>
										<VenganceButton className="w-fit">Send signal</VenganceButton>
									</form>
								</VenganceCard>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- ── IMPRESSUM ── -->
		<section bind:this={impressumSection} data-section="impressum" class="relative min-h-[310vh] scroll-mt-0">
			<div class="transition-opacity duration-500" style={`opacity:${uiOpacity * getSectionOpacity('impressum')};`}>
				<div class="flex min-h-svh items-center justify-center px-4 py-12 md:px-6">
					<div class={`mx-auto w-full max-w-184 transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${isHeroVisible('impressum') ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-16 scale-[0.93] opacity-0'}`}>
						<VenganceCard className="pointer-events-auto rounded-4xl">
							<p class="eyebrow">Impressum / Legal</p>
							<h2 class="mt-5 max-w-2xl text-4xl font-semibold leading-[0.98] tracking-[-0.04em] md:text-6xl">Legal information, pulled into the gravity well.</h2>
							<p class="text-soft mt-5 max-w-2xl text-sm leading-7 md:text-base">Even the mandatory parts can live inside the same spatial language. The content stays sober — the presentation doesn't have to be lifeless.</p>
						</VenganceCard>
					</div>
				</div>

				<div class="flex items-center justify-center px-4 pb-16 md:px-6">
					<div class="mx-auto w-full max-w-5xl">
						<div class="grid gap-4 lg:grid-cols-[1fr_1fr]">
							<div class={`transition-all duration-900 ease-[cubic-bezier(0.16,1,0.3,1)] ${isDetailsVisible('impressum') ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-12 scale-[0.95] opacity-0'}`}>
								<VenganceCard className="pointer-events-auto h-full rounded-[1.8rem]">
									<p class="text-dim text-[0.68rem] uppercase tracking-[0.18em]">Responsible for content</p>
									<p class="mt-4 leading-7 text-white/88">Nick Schumacher<br />Germany</p>
									<div class="mt-6">
										<p class="text-dim text-[0.65rem] uppercase tracking-[0.18em]">Contact</p>
										<a href="mailto:schumacher@nickot.is" class="pointer-events-auto mt-2 block text-sm text-white/88 transition hover:text-white">schumacher@nickot.is</a>
									</div>
								</VenganceCard>
							</div>
							<div class={`grid gap-4 transition-all duration-900 delay-100 ease-[cubic-bezier(0.16,1,0.3,1)] ${isDetailsVisible('impressum') ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-12 scale-[0.95] opacity-0'}`}>
								<VenganceCard className="pointer-events-auto rounded-[1.8rem]">
									<p class="text-dim text-[0.68rem] uppercase tracking-[0.18em]">Disclaimer</p>
									<p class="text-soft mt-4 leading-7">Despite careful content control, liability for external links is excluded. The operators of linked pages are solely responsible for their content.</p>
								</VenganceCard>
								<VenganceCard className="pointer-events-auto rounded-[1.8rem]">
									<p class="text-dim text-[0.68rem] uppercase tracking-[0.18em]">Copyright</p>
									<p class="text-soft mt-4 leading-7">All content and design on this site is the work of Nick Schumacher. Reproduction requires explicit written permission.</p>
								</VenganceCard>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	</div>
</section>
