export type JourneySection = {
	slug: 'orbit' | 'about' | 'projects' | 'contact' | 'impressum';
	path: string;
	label: string;
	theme: 'orbit' | 'about' | 'projects' | 'contact' | 'impressum';
};

export const JOURNEY_SECTIONS: JourneySection[] = [
	{ slug: 'orbit', path: '/', label: 'Orbit', theme: 'orbit' },
	{ slug: 'about', path: '/about', label: 'About', theme: 'about' },
	{ slug: 'projects', path: '/projects', label: 'Projects', theme: 'projects' },
	{ slug: 'contact', path: '/contact', label: 'Contact', theme: 'contact' },
	{ slug: 'impressum', path: '/impressum', label: 'Impressum', theme: 'impressum' }
];

export const resolveJourneySection = (pathname: string) => {
	return JOURNEY_SECTIONS.find((section) => section.path === pathname) ?? JOURNEY_SECTIONS[0];
};

export const journeyIdForPath = (path: string) => {
	return resolveJourneySection(path).slug;
};
