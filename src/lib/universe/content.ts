/**
 * Every piece of content in the universe lives here.
 * A system is a star; each body orbiting it is one piece of content.
 * The 3D scene, the HUD panels, the URL routes and the SSR/no-WebGL
 * fallback are all generated from this single source.
 */

export type SurfaceKind = 'terran' | 'gas' | 'ice' | 'lava' | 'rock' | 'ocean';

export type BodyVisual = {
	kind: SurfaceKind;
	/** three colours, dark → light */
	palette: [string, string, string];
	radius: number;
	orbit: number;
	/** radians per second */
	speed: number;
	/** orbit inclination in radians */
	tilt: number;
	/** start angle in radians */
	phase: number;
	ring?: boolean;
	atmosphere?: string;
	moons?: number;
};

export type Stat = { value: string; label: string };
export type Link = { label: string; href: string };

export type Body = {
	slug: string;
	name: string;
	kicker: string;
	title: string;
	paragraphs: string[];
	tags?: string[];
	stats?: Stat[];
	links?: Link[];
	visual: BodyVisual;
};

export type StarVisual = {
	kind: 'star' | 'pulsar' | 'dwarf';
	/** deep / mid / hot colours of the photosphere */
	palette: [string, string, string];
	corona: string;
	radius: number;
};

export type StarSystem = {
	slug: string;
	name: string;
	kicker: string;
	headline: string;
	intro: string;
	tags?: string[];
	links?: Link[];
	star: StarVisual;
	/** galactic position */
	position: [number, number, number];
	bodies: Body[];
};

export const OWNER = {
	name: 'Nick Schumacher',
	role: 'Creative frontend · WebGL · Immersive Tech',
	location: 'Bremen · Stockholm',
	mail: 'schumacher@nickot.is'
};

export const UNIVERSE_INTRO = {
	kicker: 'Portfolio / Bremen · Stockholm',
	headline: 'Creative frontend built for the space between engineering and atmosphere.',
	intro:
		'2.5+ years shipping production frontend — Vue.js, Three.js, digital twins. Currently studying MSc Design for creative and immersive Technology at Stockholm University.'
};

export const SYSTEMS: StarSystem[] = [
	{
		slug: 'orbit',
		name: 'Orbit',
		kicker: 'Home system',
		headline: 'Immersive interfaces that still behave like disciplined software.',
		intro:
			'The canvas carries the visual weight. The interface steps in only when it adds direction, action, or context — never noise. Every small light in the belt around this star is a visitor who left their name.',
		tags: ['WebGL / Three.js', 'Vue.js', 'SvelteKit', 'Digital Twins'],
		star: {
			kind: 'star',
			palette: ['#ff6a1a', '#ffb347', '#fff1c9'],
			corona: '#ffb45e',
			radius: 26
		},
		position: [0, 0, 0],
		bodies: [
			{
				slug: 'approach',
				name: 'Approach',
				kicker: 'How I work',
				title: 'Interfaces that feel spatial, load light, and handle complexity without noise.',
				paragraphs: [
					'Production work in Vue.js, Vuetify, Tailwind, and Three.js across digital twin dashboards and data-heavy interfaces.',
					'Private builds in Next, Nuxt, and Svelte — the latter being my largest and most refined environment.'
				],
				tags: ['WebGL / Three.js', 'Vue.js', 'SvelteKit', 'Digital Twins'],
				visual: {
					kind: 'ocean',
					palette: ['#0b2a5b', '#2f7fd6', '#d8f3ff'],
					radius: 5.2,
					orbit: 70,
					speed: 0.06,
					tilt: 0.08,
					phase: 0.4,
					atmosphere: '#7cc8ff',
					moons: 1
				}
			},
			{
				slug: 'stack',
				name: 'Stack',
				kicker: 'Tools in orbit',
				title: 'Vue · Svelte · Three.js — and whatever the idea needs next.',
				paragraphs: [
					'Vue.js and Vuetify in production, SvelteKit for my own work, Three.js and WebGL whenever space, light or data need a third dimension.',
					'Next.js, Nuxt, Tailwind, SQL and Unity show up across the projects — always the full stack.'
				],
				tags: ['Vue.js', 'SvelteKit', 'Three.js', 'WebGL', 'Next.js', 'Nuxt', 'Tailwind', 'Unity'],
				visual: {
					kind: 'gas',
					palette: ['#3a1f5c', '#b06ad8', '#ffd8f0'],
					radius: 8.5,
					orbit: 112,
					speed: 0.035,
					tilt: -0.12,
					phase: 3.4,
					ring: true,
					atmosphere: '#d9a6ff'
				}
			}
		]
	},
	{
		slug: 'about',
		name: 'Journey',
		kicker: 'About / Career',
		headline: 'BSc Media Computer Science. Now building at the frontier of design and immersive technology.',
		intro:
			'I combine engineering rigor with spatial design sensibility to build things that feel inhabited. Each world around this star is one step of the way — from Lübeck to Stockholm.',
		star: {
			kind: 'star',
			palette: ['#1f6fff', '#6fd3ff', '#eafcff'],
			corona: '#7de8ff',
			radius: 22
		},
		position: [520, 70, -460],
		bodies: [
			{
				slug: 'luebeck',
				name: 'Lübeck',
				kicker: '01 · BSc Media Computer Science',
				title: 'University of Lübeck — bachelor thesis graded 1.0.',
				paragraphs: [
					'Graduated in Media Computer Science at the University of Lübeck.',
					'Bachelor thesis: an interactive 3D bridge viewer based on the IFC open standard — parsed, rendered and queryable in the browser. Graded 1.0.'
				],
				stats: [
					{ value: '1.0', label: 'Thesis grade' },
					{ value: 'IFC', label: '3D bridge viewer' }
				],
				visual: {
					kind: 'rock',
					palette: ['#3b2a22', '#9a7b62', '#e9d6bf'],
					radius: 4.2,
					orbit: 58,
					speed: 0.07,
					tilt: 0.1,
					phase: 1.1
				}
			},
			{
				slug: 'frontend',
				name: 'Frontend',
				kicker: '02 · Frontend engineer',
				title: '2.5+ years shipping production frontend.',
				paragraphs: [
					'Production work in Vue.js, Vuetify, Tailwind and Three.js — digital twin dashboards and data-heavy interfaces that have to stay fast and readable under real load.',
					'Shipped a PWA to both Google Play and the Apple App Store along the way.'
				],
				stats: [
					{ value: '2.5+', label: 'Years in production' },
					{ value: '2 stores', label: 'Google Play · App Store' }
				],
				tags: ['Vue.js', 'Vuetify', 'Three.js', 'Digital Twins'],
				visual: {
					kind: 'terran',
					palette: ['#0d3b4f', '#3f9b6b', '#f1e6c8'],
					radius: 5.8,
					orbit: 88,
					speed: 0.045,
					tilt: -0.06,
					phase: 3.8,
					atmosphere: '#86e3ff',
					moons: 2
				}
			},
			{
				slug: 'stockholm',
				name: 'Stockholm',
				kicker: '03 · Now',
				title: 'MSc Design for creative and immersive Technology — Stockholm University.',
				paragraphs: [
					'Currently in Stockholm, studying MSc Design for creative and immersive Technology at Stockholm University.',
					'Based between Bremen and Stockholm — remote-friendly.'
				],
				tags: ['Immersive Tech', 'Stockholm University'],
				visual: {
					kind: 'ice',
					palette: ['#1b3a6b', '#8fc6ff', '#ffffff'],
					radius: 4.8,
					orbit: 122,
					speed: 0.03,
					tilt: 0.16,
					phase: 5.6,
					ring: true,
					atmosphere: '#bfe3ff'
				}
			}
		]
	},
	{
		slug: 'projects',
		name: 'Projects',
		kicker: 'Projects / Selected',
		headline: 'From festival WebSocket sync to 3D bridge viewers — always the full stack.',
		intro:
			'Festival goers, fishermen, gamers, and bridge engineers as real users. Every planet around this star is real work — pick one to land.',
		star: {
			kind: 'star',
			palette: ['#ff3d2e', '#ff8a3d', '#ffe3b0'],
			corona: '#ff9650',
			radius: 30
		},
		position: [-180, -60, -980],
		bodies: [
			{
				slug: 'fusch',
				name: 'fusch.fun',
				kicker: 'Festival · WebSocket sync',
				title: 'Festival Website',
				paragraphs: [
					"Live festival platform with real-time WebSocket synchronisation — the DJ's track position streams to every connected client simultaneously.",
					'Built for atmosphere under pressure.'
				],
				tags: ['WebSockets', 'Realtime', 'Full stack'],
				links: [{ label: 'fusch.fun', href: 'https://fusch.fun' }],
				visual: {
					kind: 'lava',
					palette: ['#22051a', '#ff3d8b', '#ffd0e6'],
					radius: 5.4,
					orbit: 66,
					speed: 0.06,
					tilt: 0.12,
					phase: 0.2,
					atmosphere: '#ff6eb0'
				}
			},
			{
				slug: 'findex',
				name: 'findex',
				kicker: 'PWA · Play & App Store',
				title: 'Fish Tracker PWA',
				paragraphs: [
					'Social media and fish tracking app for fishermen — log catches, explore a feed, map spots.',
					'Next.js + SQL, deployed as a PWA on both Google Play and the Apple App Store.'
				],
				tags: ['Next.js', 'SQL', 'PWA'],
				links: [{ label: 'fishbox.nickot.is', href: 'https://fishbox.nickot.is' }],
				visual: {
					kind: 'ocean',
					palette: ['#041c3a', '#1f8ad6', '#bff6ff'],
					radius: 6.6,
					orbit: 96,
					speed: 0.042,
					tilt: -0.1,
					phase: 2.3,
					atmosphere: '#6eb4ff',
					moons: 1
				}
			},
			{
				slug: 'last-of-fish',
				name: 'The Last of Fish',
				kicker: 'Unity · WebGL game',
				title: 'The Last of Fish',
				paragraphs: [
					'Unity game built as a creative project — designed around an absurdist fishy premise. Exportable to WebGL for browser play.',
					'Proof that the same spatial thinking applies to games.'
				],
				tags: ['Unity', 'C#', 'WebGL'],
				visual: {
					kind: 'terran',
					palette: ['#06291c', '#3fd98a', '#e8ffe0'],
					radius: 4.6,
					orbit: 124,
					speed: 0.032,
					tilt: 0.2,
					phase: 4.1,
					atmosphere: '#6effa8'
				}
			},
			{
				slug: 'bridge-viewer',
				name: 'Bridge Viewer',
				kicker: 'Bachelor thesis · Grade 1.0',
				title: 'Bridge 3D Viewer',
				paragraphs: [
					'Interactive 3D viewer for bridge infrastructure based on the IFC open standard — parsed, rendered, and queryable in the browser.',
					'University of Lübeck, graded 1.0.'
				],
				tags: ['IFC', 'Three.js', 'BIM'],
				stats: [{ value: '1.0', label: 'Grade' }],
				visual: {
					kind: 'gas',
					palette: ['#4a2a07', '#e0a03a', '#fff2cc'],
					radius: 9.2,
					orbit: 158,
					speed: 0.022,
					tilt: -0.08,
					phase: 5.2,
					ring: true,
					atmosphere: '#ffd06e',
					moons: 2
				}
			}
		]
	},
	{
		slug: 'contact',
		name: 'Signal',
		kicker: 'Contact / Signal',
		headline: "Let's build something spatial and real.",
		intro:
			'Open to freelance, creative frontend roles, and immersive experience projects. Based between Bremen and Stockholm — remote-friendly. Bring the brief, the timeline, and the ambition.',
		links: [{ label: 'schumacher@nickot.is', href: 'mailto:schumacher@nickot.is' }],
		star: {
			kind: 'pulsar',
			palette: ['#4b2bff', '#9b7bff', '#f4eeff'],
			corona: '#a58bff',
			radius: 14
		},
		position: [-640, 110, -360],
		bodies: [
			{
				slug: 'mail',
				name: 'Transmit',
				kicker: 'Best for',
				title: 'Creative frontend, WebGL and real-time interfaces.',
				paragraphs: [
					'Creative frontend, WebGL/Three.js, SvelteKit, Vue.js, digital twin dashboards, real-time data interfaces, and immersive portfolio-scale experiences.',
					'Location: Bremen · Stockholm · Remote.'
				],
				links: [{ label: 'schumacher@nickot.is', href: 'mailto:schumacher@nickot.is' }],
				visual: {
					kind: 'ice',
					palette: ['#1a1446', '#7f6bff', '#efeaff'],
					radius: 4.4,
					orbit: 56,
					speed: 0.08,
					tilt: 0.3,
					phase: 1.5,
					atmosphere: '#b7a6ff'
				}
			}
		]
	},
	{
		slug: 'impressum',
		name: 'Impressum',
		kicker: 'Impressum / Legal',
		headline: 'Legal information, pulled into the gravity well.',
		intro: 'Even the mandatory parts live inside the same spatial language. The content stays sober — the presentation does not have to be lifeless.',
		star: {
			kind: 'dwarf',
			palette: ['#6b0f12', '#d6453a', '#ffc2a8'],
			corona: '#ff6a55',
			radius: 9
		},
		position: [380, -120, 420],
		bodies: [
			{
				slug: 'legal',
				name: 'Legal',
				kicker: 'Responsible for content',
				title: 'Nick Schumacher, Germany',
				paragraphs: [
					'Contact: schumacher@nickot.is',
					'Disclaimer — despite careful content control, liability for external links is excluded. The operators of linked pages are solely responsible for their content.',
					'Copyright — all content and design on this site is the work of Nick Schumacher. Reproduction requires explicit written permission.'
				],
				links: [{ label: 'schumacher@nickot.is', href: 'mailto:schumacher@nickot.is' }],
				visual: {
					kind: 'rock',
					palette: ['#1c1416', '#6b5a5c', '#cbbcb8'],
					radius: 3.2,
					orbit: 34,
					speed: 0.09,
					tilt: 0.05,
					phase: 2.6
				}
			}
		]
	}
];

export type Focus =
	| { level: 'universe' }
	| { level: 'system'; system: StarSystem }
	| { level: 'body'; system: StarSystem; body: Body };

export const findSystem = (slug?: string | null) => SYSTEMS.find((s) => s.slug === slug);

export const resolveFocus = (systemSlug?: string | null, bodySlug?: string | null): Focus | null => {
	if (!systemSlug) return { level: 'universe' };
	const system = findSystem(systemSlug);
	if (!system) return null;
	if (!bodySlug) return { level: 'system', system };
	const body = system.bodies.find((b) => b.slug === bodySlug);
	if (!body) return null;
	return { level: 'body', system, body };
};

export const focusPath = (focus: Focus) => {
	if (focus.level === 'universe') return '/';
	if (focus.level === 'system') return `/${focus.system.slug}`;
	return `/${focus.system.slug}/${focus.body.slug}`;
};

export const focusKey = (focus: Focus) => focusPath(focus);
